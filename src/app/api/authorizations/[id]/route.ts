import { route, ok, fail, clientIp, userAgent, notFound } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { findAuthorizationById, revokeAuthorization } from '@/lib/repos/borrow';

export const dynamic = 'force-dynamic';

export const DELETE = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireRole('STUDENT', 'ADMIN');
  const { id: authId } = await params;

  const authorization = await findAuthorizationById(authId);
  if (!authorization) notFound('Authorisation not found.');
  if (session.role === 'STUDENT' && authorization.owner_id !== session.user.id) {
    return fail(403, 'You can only revoke authorisations you granted.');
  }

  await revokeAuthorization(authId, session.user.id);

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'borrow.revoke',
    entityType: 'borrow_authorization',
    entityId: authId,
    metadata: { product: authorization.product_id, borrower: authorization.borrower_id },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ ok: true });
});
