import { route, ok, fail, readJson, clientIp, userAgent, notFound } from '@/lib/http';
import { borrowSchema } from '@/lib/validation';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { notify } from '@/lib/notifications';
import {
  createAuthorization,
  listAuthorizationsForBorrower,
  listAuthorizationsForOwner,
  resolveBorrower,
} from '@/lib/repos/borrow';
import { findProductByIdFor } from '@/lib/repos/products';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const session = await requireRole('STUDENT', 'ADMIN');
  if (session.role === 'ADMIN') return ok({ granted: [], received: [] });

  const [granted, received] = await Promise.all([
    listAuthorizationsForOwner(session.user.id),
    listAuthorizationsForBorrower(session.user.id),
  ]);
  return ok({ granted, received });
});

/**
 * "Lending a laptop to a classmate for two days" is a normal, legitimate thing
 * students do. Without this feature, every loan becomes a false alert at the
 * gate — which is how a verification system loses the trust of the people it
 * scans.
 */
export const POST = route(async (req: Request) => {
  const session = await requireRole('STUDENT');
  const body = borrowSchema.parse(await readJson(req));

  const product = await findProductByIdFor(body.productId, session.user.id);
  if (!product) notFound('Device not found.');

  const borrower = await resolveBorrower(session.institution.id, body.borrowerIdentifier);
  if (!borrower) return fail(404, 'No student found with that university ID or email.');
  if (borrower.id === session.user.id) return fail(400, 'You already own this device.');

  const endsAt = new Date(body.endsAt);
  if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= Date.now()) {
    return fail(400, 'Choose an end date in the future.');
  }

  const authorization = await createAuthorization({
    productId: product.id,
    ownerId: session.user.id,
    borrowerId: borrower.id,
    borrowerIdentifier: body.borrowerIdentifier,
    endsAt,
    reason: body.reason || null,
  });

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'borrow.authorize',
    entityType: 'borrow_authorization',
    entityId: authorization.id,
    metadata: { product: product.id, borrower: borrower.id, endsAt: endsAt.toISOString() },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  await notify({
    userId: borrower.id,
    type: 'borrow.authorized',
    title: `${session.user.full_name} shared a device with you`,
    body: `You are authorised to carry their ${product.brand} ${product.model} until ${endsAt.toLocaleDateString('en-ET')}. If an officer scans it, the system will show you as an authorised borrower.`,
    link: '/student/authorizations',
  });

  return ok({ id: authorization.id });
});
