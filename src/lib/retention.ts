import { query, queryOne } from './db';
import { id } from './ids';
import { DEFAULT_RETENTION } from './constants';
import type { Institution } from './types';

export type RetentionOutcome = {
  institution: string;
  scanEventsDeleted: number;
  notificationsDeleted: number;
  sessionsDeleted: number;
  reportsAnonymised: number;
  auditLogsDeleted: number;
};

/**
 * Enforces the retention windows agreed with the institution.
 *
 * This is the technical half of the privacy promise. The governance half is
 * docs/03-operations/data-retention.md: scan events exist to resolve incidents,
 * not to build a movement history, so they are the shortest-lived data in the
 * system and are deleted outright rather than archived.
 *
 * Run nightly (cron / systemd timer / Kubernetes CronJob). See
 * scripts/retention-run.ts.
 */
export async function runRetentionFor(institution: Institution): Promise<RetentionOutcome> {
  const scanDays = institution.scan_retention_days || DEFAULT_RETENTION.scanDays;
  const reportDays = institution.report_retention_days || DEFAULT_RETENTION.reportDays;
  const auditDays = institution.audit_retention_days || DEFAULT_RETENTION.auditDays;

  const [scanRow] = await query<{ count: number }>(
    `WITH deleted AS (
       DELETE FROM scan_events
        WHERE institution_id = $1 AND recorded_at < now() - ($2 || ' days')::interval
        RETURNING 1
     ) SELECT count(*)::int AS count FROM deleted`,
    [institution.id, String(scanDays)],
  );

  const [notificationRow] = await query<{ count: number }>(
    `WITH deleted AS (
       DELETE FROM notifications
        WHERE user_id IN (SELECT id FROM users WHERE institution_id = $1)
          AND created_at < now() - ($2 || ' days')::interval
        RETURNING 1
     ) SELECT count(*)::int AS count FROM deleted`,
    [institution.id, String(DEFAULT_RETENTION.notificationDays)],
  );

  const [sessionRow] = await query<{ count: number }>(
    `WITH deleted AS (
       DELETE FROM sessions
        WHERE user_id IN (SELECT id FROM users WHERE institution_id = $1)
          AND (expires_at < now() - interval '1 day' OR revoked_at < now() - interval '1 day')
        RETURNING 1
     ) SELECT count(*)::int AS count FROM deleted`,
    [institution.id],
  );

  // Reports are anonymised, not deleted: the university keeps aggregate
  // incident statistics, while the narrative fields that identify people go.
  const [missingRow] = await query<{ count: number }>(
    `WITH updated AS (
       UPDATE missing_reports
          SET description = NULL, last_known_location = NULL, resolution_notes = NULL
        WHERE institution_id = $1
          AND resolved_at IS NOT NULL
          AND reported_at < now() - ($2 || ' days')::interval
          AND (description IS NOT NULL OR last_known_location IS NOT NULL OR resolution_notes IS NOT NULL)
        RETURNING 1
     ) SELECT count(*)::int AS count FROM updated`,
    [institution.id, String(reportDays)],
  );

  const [foundRow] = await query<{ count: number }>(
    `WITH updated AS (
       UPDATE found_reports
          SET finder_name = NULL, finder_contact = NULL, description = NULL, return_notes = NULL
        WHERE institution_id = $1
          AND found_at < now() - ($2 || ' days')::interval
          AND (finder_name IS NOT NULL OR finder_contact IS NOT NULL OR description IS NOT NULL)
        RETURNING 1
     ) SELECT count(*)::int AS count FROM updated`,
    [institution.id, String(reportDays)],
  );

  const [auditRow] = await query<{ count: number }>(
    `WITH deleted AS (
       DELETE FROM audit_logs
        WHERE institution_id = $1 AND created_at < now() - ($2 || ' days')::interval
        RETURNING 1
     ) SELECT count(*)::int AS count FROM deleted`,
    [institution.id, String(auditDays)],
  );

  const outcome: RetentionOutcome = {
    institution: institution.code,
    scanEventsDeleted: scanRow?.count ?? 0,
    notificationsDeleted: notificationRow?.count ?? 0,
    sessionsDeleted: sessionRow?.count ?? 0,
    reportsAnonymised: (missingRow?.count ?? 0) + (foundRow?.count ?? 0),
    auditLogsDeleted: auditRow?.count ?? 0,
  };

  await query(
    `INSERT INTO retention_runs
       (id, institution_id, scan_events_deleted, notifications_deleted, sessions_deleted,
        reports_anonymised, audit_logs_deleted, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      id.retention(),
      institution.id,
      outcome.scanEventsDeleted,
      outcome.notificationsDeleted,
      outcome.sessionsDeleted,
      outcome.reportsAnonymised,
      outcome.auditLogsDeleted,
      `scan=${scanDays}d report=${reportDays}d audit=${auditDays}d`,
    ],
  );

  return outcome;
}

export async function runRetention(): Promise<RetentionOutcome[]> {
  const institutions = await query<Institution>('SELECT * FROM institutions ORDER BY code');
  const results: RetentionOutcome[] = [];
  for (const institution of institutions) {
    results.push(await runRetentionFor(institution));
  }
  return results;
}

/** Full erasure of one person's records, for an approved deletion request. */
export async function eraseUserData(userId: string, institutionId: string): Promise<{ scansAnonymised: number; reportsAnonymised: number }> {
  const [scanRow] = await query<{ count: number }>(
    `WITH updated AS (
       UPDATE scan_events SET carrier_name = NULL, note = NULL
        WHERE institution_id = $2 AND carrier_id = $1 AND (carrier_name IS NOT NULL OR note IS NOT NULL)
        RETURNING 1
     ) SELECT count(*)::int AS count FROM updated`,
    [userId, institutionId],
  );
  const [reportRow] = await query<{ count: number }>(
    `WITH updated AS (
       UPDATE missing_reports SET description = NULL, last_known_location = NULL, resolution_notes = NULL
        WHERE reporter_id = $1 AND institution_id = $2
          AND (description IS NOT NULL OR last_known_location IS NOT NULL OR resolution_notes IS NOT NULL)
        RETURNING 1
     ) SELECT count(*)::int AS count FROM updated`,
    [userId, institutionId],
  );
  return { scansAnonymised: scanRow?.count ?? 0, reportsAnonymised: reportRow?.count ?? 0 };
}

export async function lastRetentionRun(institutionId: string) {
  return queryOne<{ ran_at: Date; notes: string | null }>(
    'SELECT ran_at, notes FROM retention_runs WHERE institution_id = $1 ORDER BY ran_at DESC LIMIT 1',
    [institutionId],
  );
}
