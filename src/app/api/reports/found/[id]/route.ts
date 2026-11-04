import { route, ok, fail, readJson, clientIp, userAgent, notFound } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { notify } from '@/lib/notifications';
import { findFoundReportById, markFoundReturned, matchFoundReport } from '@/lib/repos/reports';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Actions: `match` (link to a missing report) or `return` (handed to owner). */
export const PATCH = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireRole('ADMIN', 'SECURITY');
  const { id: reportId } = await params;
  const found = await findFoundReportById(reportId);
  if (!found || found.institution_id !== session.institution.id) notFound('Report not found.');

  const body = (await readJson(req)) as { action?: string; missingReportId?: string; notes?: string; custodyLocation?: string };
  const action = body.action ?? 'return';

  if (action === 'match') {
    if (!body.missingReportId) return fail(400, 'Choose the missing report to link.');
    await matchFoundReport(reportId, body.missingReportId);
  } else if (action === 'return') {
    await markFoundReturned(reportId, session.user.id, {
      notes: body.notes ?? null,
      custodyLocation: body.custodyLocation ?? null,
    });
  } else {
    return fail(400, 'Unknown action.');
  }

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: action === 'match' ? 'report.found.match' : 'report.found.return',
    entityType: 'found_report',
    entityId: reportId,
    metadata: { product: found.product_id, missing: body.missingReportId ?? found.matched_missing_report_id },
    justification: body.notes ?? null,
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  if (action === 'return' && found.product_id) {
    const owner = await queryOne<{ id: string; email: string }>(
      'SELECT p.owner_id AS id, u.email FROM products p JOIN users u ON u.id = p.owner_id WHERE p.id = $1',
      [found.product_id],
    );
    if (owner) {
      await notify({
        userId: owner.id,
        type: 'report.found.returned',
        title: 'Your device has been returned',
        body: body.custodyLocation
          ? `Your device was handed back. Collection point: ${body.custodyLocation}.`
          : 'Your device has been marked as returned to you.',
        link: '/student/reports',
        email: { to: owner.email, subject: 'Your device has been returned' },
      });
    }
  }

  return ok({ ok: true });
});
