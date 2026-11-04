import { route, ok, fail, readJson, clientIp, userAgent, notFound } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import {
  findProductById,
  findProductByIdFor,
  listProductIdentifiers,
  rotateQrToken,
  setProductStatus,
  updateProduct,
} from '@/lib/repos/products';
import { query } from '@/lib/db';
import { id } from '@/lib/ids';

export const dynamic = 'force-dynamic';

async function loadProduct(productId: string, session: Awaited<ReturnType<typeof requireRole>>) {
  const product =
    session.role === 'ADMIN' ? await findProductById(productId) : await findProductByIdFor(productId, session.user.id);

  if (!product || (session.role === 'ADMIN' && product.institution_id !== session.institution.id)) {
    return null;
  }
  return product;
}

export const GET = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireRole('STUDENT', 'ADMIN');
  const { id: productId } = await params;
  const product = await loadProduct(productId, session);
  if (!product) return fail(404, 'Device not found.');

  const identifiers = await listProductIdentifiers(productId);
  const history = await query<{ event: string; started_at: Date; ended_at: Date | null }>(
    'SELECT event, started_at, ended_at FROM ownerships WHERE product_id = $1 ORDER BY started_at DESC',
    [productId],
  );

  return ok({
    product: {
      id: product.id,
      label: `${product.type} ${product.brand} ${product.model}`,
      type: product.type,
      brand: product.brand,
      model: product.model,
      serialNumber: product.serial_number,
      color: product.color,
      distinguishingMarks: product.distinguishing_marks,
      photoUrl: product.photo_url,
      status: product.status,
      registeredAt: product.registered_at,
      retiredReason: product.retired_reason,
      notes: product.notes,
      token: product.token,
      ownerId: product.owner_id,
      ownerName: product.owner_name,
      activeMissingReportId: product.active_missing_report_id,
    },
    identifiers,
    history,
  });
});

export const PATCH = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireRole('STUDENT', 'ADMIN');
  const { id: productId } = await params;
  const product = await loadProduct(productId, session);
  if (!product) notFound('Device not found.');

  const body = (await readJson(req)) as Record<string, unknown>;
  const allowed = ['brand', 'model', 'serial_number', 'color', 'distinguishing_marks', 'notes', 'type'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (typeof body[key] === 'string') patch[key] = (body[key] as string).trim() || null;
  }
  if (Object.keys(patch).length) await updateProduct(productId, patch as never);

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'product.update',
    entityType: 'product',
    entityId: productId,
    metadata: { fields: Object.keys(patch) },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ ok: true });
});

/** Retiring is a soft delete: the record and its scan history are kept. */
export const DELETE = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireRole('STUDENT', 'ADMIN');
  const { id: productId } = await params;
  const product = await loadProduct(productId, session);
  if (!product) notFound('Device not found.');

  const url = new URL(req.url);
  const reason = url.searchParams.get('reason') ?? 'Removed by owner';
  await setProductStatus(productId, 'RETIRED', reason);

  await query(
    `INSERT INTO ownerships (id, product_id, owner_id, event, ended_at, note) VALUES ($1,$2,$3,'REVOKED', now(), $4)`,
    [id.ownership(), productId, product.owner_id, reason],
  );

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'product.retire',
    entityType: 'product',
    entityId: productId,
    metadata: { reason },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ ok: true });
});
