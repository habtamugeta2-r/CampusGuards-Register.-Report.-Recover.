import { route } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { exportRows, pilotMetrics } from '@/lib/metrics';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))].join('\n');
}

/**
 * CSV extract for the pilot evaluation pack.
 *
 * Note what is NOT here: no owner names, emails or phone numbers. The evaluation
 * needs incident counts, timings and outcomes — not a list of who owns what.
 */
export const GET = route(async (req: Request) => {
  const session = await requireRole('ADMIN');
  const type = new URL(req.url).searchParams.get('type') ?? 'reports';
  const { reports, scans } = await exportRows(session.institution.id);
  const metrics = await pilotMetrics(session.institution.id);

  const body =
    type === 'scans'
      ? toCsv(scans)
      : type === 'summary'
        ? toCsv([
            {
              metric: 'registration_rate_percent',
              value: metrics.adoption.registrationRate,
            },
            { metric: 'active_students', value: metrics.adoption.activeStudents },
            { metric: 'students_with_products', value: metrics.adoption.studentsWithProducts },
            { metric: 'registered_products', value: metrics.adoption.totalProducts },
            { metric: 'missing_reports_total', value: metrics.reports.total },
            { metric: 'missing_reports_open', value: metrics.reports.open },
            { metric: 'recovered', value: metrics.reports.recovered },
            { metric: 'recovery_rate_percent', value: metrics.reports.recoveryRate },
            { metric: 'median_recovery_hours', value: metrics.reports.medianRecoveryHours ?? '' },
            { metric: 'scans_total', value: metrics.scans.total },
            { metric: 'scans_offline', value: metrics.scans.offline },
            { metric: 'avg_scan_ms', value: metrics.scans.avgDurationMs ?? '' },
            { metric: 'follow_up_rate_percent', value: metrics.followUpRate },
            { metric: 'baseline_recovery_rate_percent', value: metrics.baselineRecoveryRate ?? '' },
          ])
        : toCsv(reports);

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'admin.export',
    entityType: 'institution',
    entityId: session.institution.id,
    metadata: { type, rows: body.split('\n').length },
  });

  return new Response(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="campusguard-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'cache-control': 'no-store',
    },
  });
});
