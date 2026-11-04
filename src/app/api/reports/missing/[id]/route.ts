import { route, ok, readJson, clientIp, userAgent, notFound } from '@/lib/http';
import { reportResolutionSchema } from '@/lib/validation';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { notify } from '@/lib/notifications';
import { findMissingReportById, resolveMissingReport } from '@/lib/repos/reports';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Closing a report is an administrative act with a real consequence for a
 * student, so the outcome and the note are both audited and the owner is told.
 */
export const PATCH = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireRole('ADMIN', 'SECURITY');
  const { id: reportId } = await params;
  const report = await findMissingReportById(reportId);
  if (!report || report.institution_id !== session.institution.id) notFound('Report not found.');

  const body = reportResolutionSchema.parse(await readJson(req));
  await resolveMissingReport(reportId, body.status, session.user.id, body.notes || null);

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'report.missing.resolve',
    entityType: 'missing_report',
    entityId: reportId,
    metadata: { status: body.status, previous: report.status, product: report.product_id },
    justification: body.notes || null,
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  const owner = await queryOne<{ full_name: string; email: string }>('SELECT full_name, email FROM users WHERE id = $1', [
    report.owner_id,
  ]);

  await notify({
    userId: report.owner_id,
    type: 'report.missing.resolved',
    title:
      body.status === 'RESOLVED_RECOVERED'
        ? 'Your device has been recovered'
        : body.status === 'CLOSED_UNFOUND'
          ? 'Your report has been closed'
          : 'Update on your report',
    body:
      body.status === 'RESOLVED_RECOVERED'
        ? `Good news — your ${report.brand} ${report.model} is marked recovered. ${body.notes ?? ''}`.trim()
        : `Your report for the ${report.brand} ${report.model} was closed as ${body.status.toLowerCase().replace('_', ' ')}. ${
            body.notes ?? ''
          }`.trim(),
    link: '/student/reports',
    ...(owner?.email
      ? {
          email: {
            to: owner.email,
            subject: 'Update on your CampusGuard report',
            organisation: session.institution.name,
          },
        }
      : {}),
  });

  return ok({ ok: true });
});
