import { route, ok, readJson, clientIp, userAgent, notFound } from '@/lib/http';
import { missingReportSchema } from '@/lib/validation';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { notify, notifyMany } from '@/lib/notifications';
import { listAdminIds, listSecurityOfficerIds } from '@/lib/repos/users';
import { createMissingReport, listMissingReports, listMissingReportsForOwner } from '@/lib/repos/reports';
import { findProductByIdFor } from '@/lib/repos/products';
import type { MissingReportStatus, ReportCategory } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  const session = await requireRole('STUDENT', 'ADMIN', 'SECURITY');
  const url = new URL(req.url);

  if (session.role === 'STUDENT') {
    const rows = await listMissingReportsForOwner(session.user.id);
    return ok({ rows, total: rows.length });
  }

  const { rows, total } = await listMissingReports(session.institution.id, {
    status: (url.searchParams.get('status') as MissingReportStatus | 'ALL' | null) ?? 'ALL',
    category: (url.searchParams.get('category') as ReportCategory | 'ALL' | null) ?? 'ALL',
    search: url.searchParams.get('search') ?? undefined,
    limit: Number(url.searchParams.get('limit') ?? 50),
    offset: Number(url.searchParams.get('offset') ?? 0),
  });
  return ok({ rows, total });
});

export const POST = route(async (req: Request) => {
  const session = await requireRole('STUDENT', 'ADMIN');
  const body = missingReportSchema.parse(await readJson(req));

  const product = await findProductByIdFor(body.productId, session.user.id);
  if (!product) notFound('Device not found.');
  if (product.status === 'RETIRED') return ok({ error: 'That device has been removed from the registry.' }, { status: 400 });

  const report = await createMissingReport({
    institutionId: session.institution.id,
    productId: product.id,
    reporterId: session.user.id,
    category: body.category,
    description: body.description || null,
    lastKnownLocation: body.lastKnownLocation || null,
    occurredAt: body.occurredAt ? new Date(body.occurredAt) : null,
    channel: body.channel ?? 'CAMPUSGUARD',
  });

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'report.missing.create',
    entityType: 'missing_report',
    entityId: report.id,
    metadata: { category: report.category, product: product.id, channel: report.channel },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  // The people who can act on this are security and the lost-property desk.
  const recipients = [...(await listSecurityOfficerIds(session.institution.id)), ...(await listAdminIds(session.institution.id))];
  await notifyMany(recipients, {
    type: 'report.missing.created',
    title: `New ${report.category.toLowerCase()} report`,
    body: `${product.owner_name} reported a ${product.brand} ${product.model} ${report.category.toLowerCase()}${
      report.last_known_location ? ` near ${report.last_known_location}` : ''
    }.`,
    link: '/admin/reports',
  });

  await notify({
    userId: session.user.id,
    type: 'report.missing.acknowledged',
    title: 'Your report is filed',
    body: `We marked your ${product.brand} ${product.model} as reported missing and notified campus security. If someone scans it, you will be told immediately.`,
    link: '/student/reports',
  });

  return ok({ id: report.id });
});
