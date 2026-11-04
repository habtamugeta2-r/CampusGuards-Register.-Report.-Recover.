import { route, ok, readJson, clientIp, userAgent } from '@/lib/http';
import { productSchema } from '@/lib/validation';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createProduct, listProducts, listProductsByOwner } from '@/lib/repos/products';
import type { ProductStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  const session = await requireRole('STUDENT', 'ADMIN');
  const url = new URL(req.url);

  if (session.role === 'STUDENT') {
    const rows = await listProductsByOwner(session.user.id);
    return ok({ rows: rows.map(serialize), total: rows.length });
  }

  const { rows, total } = await listProducts(session.institution.id, {
    status: (url.searchParams.get('status') as ProductStatus | 'ALL' | null) ?? 'ALL',
    search: url.searchParams.get('search') ?? undefined,
    limit: Number(url.searchParams.get('limit') ?? 50),
    offset: Number(url.searchParams.get('offset') ?? 0),
  });
  return ok({ rows: rows.map(serialize), total });
});

export const POST = route(async (req: Request) => {
  const session = await requireRole('STUDENT');
  const body = productSchema.parse(await readJson(req));

  const { product, token } = await createProduct({
    institutionId: session.institution.id,
    ownerId: session.user.id,
    type: body.type as never,
    brand: body.brand,
    model: body.model,
    serialNumber: body.serialNumber || null,
    color: body.color || null,
    distinguishingMarks: body.distinguishingMarks || null,
    notes: body.notes || null,
  });

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'product.register',
    entityType: 'product',
    entityId: product.id,
    metadata: { type: product.type, brand: product.brand, model: product.model, hasSerial: Boolean(product.serial_number) },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ id: product.id, token });
});

type Serialized = ReturnType<typeof serialize>;

function serialize(row: {
  id: string;
  type: string;
  brand: string;
  model: string;
  serial_number: string | null;
  color: string | null;
  distinguishing_marks: string | null;
  photo_url: string | null;
  status: ProductStatus;
  registered_at: Date;
  updated_at: Date;
  retired_reason: string | null;
  notes: string | null;
  owner_id: string;
  token: string | null;
  owner_name?: string;
  owner_email?: string;
  owner_student_id?: string | null;
  active_missing_report_id?: string | null;
}) {
  return {
    id: row.id,
    label: `${row.type} ${row.brand} ${row.model}`,
    type: row.type,
    brand: row.brand,
    model: row.model,
    serialNumber: row.serial_number,
    color: row.color,
    distinguishingMarks: row.distinguishing_marks,
    photoUrl: row.photo_url,
    status: row.status,
    registeredAt: row.registered_at,
    updatedAt: row.updated_at,
    retiredReason: row.retired_reason,
    notes: row.notes,
    ownerId: row.owner_id,
    token: row.token,
    ownerName: row.owner_name ?? null,
    ownerEmail: row.owner_email ?? null,
    ownerStudentId: row.owner_student_id ?? null,
    activeMissingReportId: row.active_missing_report_id ?? null,
  };
}
