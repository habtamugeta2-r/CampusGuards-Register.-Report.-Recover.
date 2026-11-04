import { query, queryOne } from './db';
import { scanStats, type ScanStats } from './repos/scans';
import { percent } from './format';
import type { BaselineMetric } from './types';

/**
 * The pilot scoreboard.
 *
 * Every number here maps to a metric in docs/01-product/pilot-plan.md. The two
 * questions the pilot exists to answer:
 *   1. Does CampusGuard improve property recovery versus existing methods?
 *   2. Is the operational cost acceptable relative to that improvement?
 */
export type PilotMetrics = {
  adoption: {
    activeStudents: number;
    studentsWithProducts: number;
    registrationRate: number;
    totalProducts: number;
    productsPerRegisteredStudent: number;
    productsByStatus: Record<string, number>;
  };
  reports: {
    total: number;
    open: number;
    recovered: number;
    closedUnfound: number;
    falseReports: number;
    /** Of reports that reached an outcome, how many ended in recovery. */
    recoveryRate: number;
    /** Recovery rate over every report filed, including still-open ones. */
    recoveryRateAll: number;
    medianRecoveryHours: number | null;
    reportedViaPlatform: number;
  };
  found: {
    pending: number;
    matched: number;
    returned: number;
    total: number;
  };
  scans: ScanStats;
  /** Share of scans needing human follow-up (a proxy for false-alert load). */
  followUpRate: number;
  baseline: BaselineMetric | null;
  baselineRecoveryRate: number | null;
};

export async function pilotMetrics(institutionId: string): Promise<PilotMetrics> {
  const [studentRow] = await query<{ active_students: number; with_products: number }>(
    `SELECT
       (SELECT count(*)::int FROM users
         WHERE institution_id = $1 AND role = 'STUDENT' AND status = 'ACTIVE' AND deleted_at IS NULL) AS active_students,
       (SELECT count(DISTINCT p.owner_id)::int FROM products p
         WHERE p.institution_id = $1 AND p.status <> 'RETIRED') AS with_products`,
    [institutionId],
  );

  const productsByStatusRows = await query<{ status: string; count: number }>(
    `SELECT status, count(*)::int AS count FROM products WHERE institution_id = $1 GROUP BY status`,
    [institutionId],
  );
  const productsByStatus = Object.fromEntries(productsByStatusRows.map((r) => [r.status, r.count]));
  const totalProducts = Object.values(productsByStatus).reduce((a, b) => a + b, 0);

  const [reportRow] = await query<{
    total: number;
    open: number;
    recovered: number;
    closed_unfound: number;
    false_reports: number;
    via_platform: number;
    median_recovery_hours: number | null;
  }>(
    `SELECT
       count(*)::int AS total,
       count(*) FILTER (WHERE status = 'OPEN')::int AS open,
       count(*) FILTER (WHERE status = 'RESOLVED_RECOVERED')::int AS recovered,
       count(*) FILTER (WHERE status = 'CLOSED_UNFOUND')::int AS closed_unfound,
       count(*) FILTER (WHERE status = 'FALSE_REPORT')::int AS false_reports,
       count(*) FILTER (WHERE channel = 'CAMPUSGUARD')::int AS via_platform,
       percentile_cont(0.5) WITHIN GROUP (
         ORDER BY EXTRACT(EPOCH FROM (resolved_at - reported_at)) / 3600
       ) FILTER (WHERE status = 'RESOLVED_RECOVERED' AND resolved_at IS NOT NULL)::float
         AS median_recovery_hours
     FROM missing_reports WHERE institution_id = $1`,
    [institutionId],
  );

  const foundRows = await query<{ status: string; count: number }>(
    `SELECT status, count(*)::int AS count FROM found_reports WHERE institution_id = $1 GROUP BY status`,
    [institutionId],
  );
  const found = Object.fromEntries(foundRows.map((r) => [r.status, r.count]));

  const scans = await scanStats(institutionId);
  const followUps = (scans.byResult.MISMATCH ?? 0) + (scans.byResult.ACTIVE_MISSING_REPORT ?? 0);

  const baseline = await queryOne<BaselineMetric>(
    `SELECT * FROM baseline_metrics WHERE institution_id = $1 ORDER BY period_end DESC LIMIT 1`,
    [institutionId],
  );

  const reports = {
    total: reportRow?.total ?? 0,
    open: reportRow?.open ?? 0,
    recovered: reportRow?.recovered ?? 0,
    closedUnfound: reportRow?.closed_unfound ?? 0,
    falseReports: reportRow?.false_reports ?? 0,
    recoveryRate: percent(reportRow?.recovered ?? 0, (reportRow?.recovered ?? 0) + (reportRow?.closed_unfound ?? 0)),
    recoveryRateAll: percent(reportRow?.recovered ?? 0, reportRow?.total ?? 0),
    medianRecoveryHours: reportRow?.median_recovery_hours ? Math.round(reportRow.median_recovery_hours * 10) / 10 : null,
    reportedViaPlatform: reportRow?.via_platform ?? 0,
  };

  return {
    adoption: {
      activeStudents: studentRow?.active_students ?? 0,
      studentsWithProducts: studentRow?.with_products ?? 0,
      registrationRate: percent(studentRow?.with_products ?? 0, studentRow?.active_students ?? 0),
      totalProducts,
      productsPerRegisteredStudent:
        Math.round(((totalProducts || 0) / Math.max(studentRow?.with_products ?? 1, 1)) * 10) / 10,
      productsByStatus,
    },
    reports,
    found: {
      pending: found.PENDING ?? 0,
      matched: found.MATCHED ?? 0,
      returned: found.RETURNED ?? 0,
      total: Object.values(found).reduce((a, b) => a + b, 0),
    },
    scans,
    followUpRate: percent(followUps, scans.total),
    baseline,
    baselineRecoveryRate: baseline ? percent(baseline.incidents_recovered, baseline.incidents_reported) : null,
  };
}

/** Rows for the CSV export used in the pilot evaluation pack. */
export async function exportRows(institutionId: string) {
  const reports = await query<Record<string, unknown>>(
    `SELECT mr.id, mr.category, mr.status, mr.channel, mr.reported_at, mr.resolved_at,
            EXTRACT(EPOCH FROM (mr.resolved_at - mr.reported_at))/3600 AS recovery_hours,
            p.type, p.brand, p.model, mr.last_known_location
       FROM missing_reports mr JOIN products p ON p.id = mr.product_id
      WHERE mr.institution_id = $1
      ORDER BY mr.reported_at DESC`,
    [institutionId],
  );
  const scans = await query<Record<string, unknown>>(
    `SELECT s.id, s.result, s.source, s.recorded_at, s.duration_ms, c.name AS checkpoint
       FROM scan_events s LEFT JOIN checkpoints c ON c.id = s.checkpoint_id
      WHERE s.institution_id = $1
      ORDER BY s.recorded_at DESC`,
    [institutionId],
  );
  return { reports, scans };
}
