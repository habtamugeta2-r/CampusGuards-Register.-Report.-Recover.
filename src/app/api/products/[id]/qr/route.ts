import { route, ok, readJson, clientIp, userAgent, notFound } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { findProductByIdFor, rotateQrToken } from '@/lib/repos/products';

export const dynamic = 'force-dynamic';

/** Issues a replacement label. The old code stops resolving immediately. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireRole('STUDENT', 'ADMIN');
  const { id: productId } = await params;

  const product =
    session.role === 'ADMIN'
      ? await (await import('@/lib/repos/products')).findProductById(productId)
      : await findProductByIdFor(productId, session.user.id);
  if (!product) notFound('Device not found.');

  const body = (await readJson(req)) as { reason?: string };
  const token = await rotateQrToken(productId, body?.reason?.trim() || 'Label replaced');

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'product.qr_rotate',
    entityType: 'product',
    entityId: productId,
    metadata: { reason: body?.reason ?? null },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ token });
});
