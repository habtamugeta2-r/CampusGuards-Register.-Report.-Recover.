import { route, ok, fail, clientIp } from '@/lib/http';
import { findProductByToken } from '@/lib/repos/products';
import { normalizeToken } from '@/lib/tokens';
import { PUBLIC_SCAN_LIMIT, rateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * What anyone — a student, a cleaner, a visitor — sees when they point an
 * ordinary phone camera at a CampusGuard label.
 *
 * Maximum information: "this kind of device is registered / reported missing".
 * Zero personal data: no owner name, no email, no serial, no student ID. The
 * purpose of this endpoint is to route a found device to a desk, not to
 * identify anyone.
 */
export const GET = route(async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const ip = clientIp(req) ?? 'unknown';
  const limit = rateLimit(`public-scan:${ip}`, PUBLIC_SCAN_LIMIT.limit, PUBLIC_SCAN_LIMIT.window);
  if (!limit.ok) return fail(429, 'Too many lookups. Try again in a minute.');

  const { token: rawToken } = await params;
  const token = normalizeToken(rawToken);
  if (!token) return fail(404, 'This is not a CampusGuard code.');

  const product = await findProductByToken(token);

  await logAudit({
    institutionId: product?.institution_id ?? 'unknown',
    actorId: null,
    actorRole: 'PUBLIC',
    action: 'public.verify',
    entityType: 'product',
    entityId: product?.id ?? null,
    metadata: { token, found: Boolean(product) },
    ip,
  });

  if (!product) {
    return ok({
      known: false,
      status: 'UNKNOWN',
      message: 'This code is not registered with CampusGuard.',
    });
  }

  const reportedMissing = product.status === 'REPORTED_MISSING';

  return ok({
    known: true,
    status: product.status,
    device: `${product.type} ${product.brand} ${product.model}`,
    reportedMissing,
    message: reportedMissing
      ? 'This device has been reported missing. Please hand it in at the lost-property desk or campus security.'
      : 'This device is registered with CampusGuard. If you found it unattended, please hand it in and the owner will be notified.',
    token,
  });
});
