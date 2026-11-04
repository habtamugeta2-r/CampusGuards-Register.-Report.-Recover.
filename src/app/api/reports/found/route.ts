import { route, ok, readJson, clientIp, userAgent } from '@/lib/http';
import { foundReportSchema } from '@/lib/validation';
import { getUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { notify, notifyMany } from '@/lib/notifications';
import { listAdminIds, listSecurityOfficerIds } from '@/lib/repos/users';
import { findProductByToken } from '@/lib/repos/products';
import { createFoundReport, listFoundReports } from '@/lib/repos/reports';
import { listInstitutions } from '@/lib/repos/misc';
import { normalizeToken } from '@/lib/tokens';
import { ANON_WRITE_LIMIT, rateLimit } from '@/lib/rate-limit';
import type { FoundReportStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  const session = await getUser();
  if (!session || session.role === 'STUDENT') return ok({ rows: [], total: 0 });

  const url = new URL(req.url);
  const { rows, total } = await listFoundReports(session.institution.id, {
    status: (url.searchParams.get('status') as FoundReportStatus | 'ALL' | null) ?? 'ALL',
    limit: Number(url.searchParams.get('limit') ?? 50),
    offset: Number(url.searchParams.get('offset') ?? 0),
  });
  return ok({ rows, total });
});

/**
 * Anyone may file a found report — including a member of the public who never
 * signs in. The finder's contact details are visible only to the lost-property
 * desk, never to the device owner.
 */
export const POST = route(async (req: Request) => {
  const ip = clientIp(req) ?? 'unknown';
  const session = await getUser();

  if (!session) {
    const limit = rateLimit(`found:${ip}`, ANON_WRITE_LIMIT.limit, ANON_WRITE_LIMIT.window);
    if (!limit.ok) return ok({ error: 'Too many submissions. Try again shortly.' }, { status: 429 });
  }

  const body = foundReportSchema.parse(await readJson(req));
  const token = body.token ? normalizeToken(body.token) : null;
  const product = token ? await findProductByToken(token) : null;

  // Single-tenant deployments (one university per installation) can resolve the
  // institution without asking the finder.
  const institutions = await listInstitutions();
  const institution = session?.institution ?? (product ? institutions.find((i) => i.id === product.institution_id) : null) ?? institutions[0];
  if (!institution) return ok({ error: 'No institution is configured for this deployment.' }, { status: 400 });

  const report = await createFoundReport({
    institutionId: institution.id,
    productId: product?.id ?? null,
    tokenScanned: token ?? null,
    reporterId: session?.user.id ?? null,
    finderName: body.finderName || session?.user.full_name || null,
    finderContact: body.finderContact || null,
    location: body.location || null,
    description: body.description || null,
    foundAt: body.foundAt ? new Date(body.foundAt) : null,
  });

  await logAudit({
    institutionId: institution.id,
    actorId: session?.user.id ?? null,
    actorRole: session?.role ?? 'PUBLIC',
    action: 'report.found.create',
    entityType: 'found_report',
    entityId: report.id,
    metadata: { product: product?.id ?? null, matched: Boolean(report.matched_missing_report_id) },
    ip,
    userAgent: userAgent(req),
  });

  const recipients = [...(await listSecurityOfficerIds(institution.id)), ...(await listAdminIds(institution.id))];
  await notifyMany(recipients, {
    type: 'report.found.created',
    title: product ? 'Registered device found' : 'Unregistered item handed in',
    body: product
      ? `${product.brand} ${product.model} belonging to ${product.owner_name} was found at ${body.location}.`
      : `An item was handed in at ${body.location}.`,
    link: '/admin/found',
  });

  // The owner learns their device was found — but never who found it.
  if (product) {
    await notify({
      userId: product.owner_id,
      type: 'report.found.created',
      title: 'Your device has been found',
      body: `Your ${product.brand} ${product.model} was handed in near ${body.location}. The lost-property desk will contact you about collection.`,
      link: '/student/reports',
    });
  }

  return ok({
    id: report.id,
    matched: Boolean(report.matched_missing_report_id),
    productLabel: product ? `${product.brand} ${product.model}` : null,
  });
});
