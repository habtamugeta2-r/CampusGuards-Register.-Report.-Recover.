import { route, ok, fail, readJson, clientIp, userAgent } from '@/lib/http';
import { requirePlatformAdmin } from '@/lib/auth';
import {
  createInstitutionRequest,
  domainTaken,
  isValidDomain,
  listRequests,
  normaliseDomain,
} from '@/lib/repos/platform';
import { INSTITUTION_KINDS } from '@/lib/constants';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const applySchema = z.object({
  organisationName: z.string().trim().min(2).max(200),
  kind: z.enum(INSTITUTION_KINDS),
  country: z.string().trim().min(2).max(80).default('Ethiopia'),
  city: z.string().trim().max(80).nullish(),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(200),
  primaryDomain: z.string().trim().min(3).max(253),
  extraDomains: z.array(z.string().trim().min(3).max(253)).optional(),
  estimatedPeople: z.number().int().positive().max(5_000_000).nullish(),
  message: z.string().trim().max(2000).nullish(),
});

/** Review queue. Platform operators only. */
export const GET = route(async (req: Request) => {
  await requirePlatformAdmin();
  const status = new URL(req.url).searchParams.get('status') === 'ALL' ? 'ALL' : 'NEW';
  return ok({ requests: await listRequests(status) });
});

/**
 * Public endpoint: an organisation applies to join the platform.
 *
 * Unauthenticated by necessity — there is no account yet. That makes it the
 * one anonymous write in the product, so it is validated tightly and
 * rate-limited by the same bucket as found-item reports.
 */
export const POST = route(async (req: Request) => {
  const body = applySchema.parse(await readJson(req));

  const primary = normaliseDomain(body.primaryDomain);
  if (!isValidDomain(primary)) return fail(400, `"${primary || body.primaryDomain}" is not a valid email domain.`);
  const extras = (body.extraDomains ?? []).map(normaliseDomain).filter(Boolean);
  for (const domain of extras) {
    if (!isValidDomain(domain)) return fail(400, `"${domain}" is not a valid email domain.`);
  }

  const { ANON_WRITE_LIMIT, rateLimit } = await import('@/lib/rate-limit');
  const ip = clientIp(req) ?? 'unknown';
  const limit = rateLimit(`join:${ip}`, ANON_WRITE_LIMIT.limit, ANON_WRITE_LIMIT.window);
  if (!limit.ok) return fail(429, 'Too many applications from this network. Try again shortly.');

  for (const domain of [primary, ...extras]) {
    if (await domainTaken(domain)) {
      return fail(409, `The domain ${domain} is already registered. Sign in instead, or contact your administrator.`);
    }
  }

  try {
    const request = await createInstitutionRequest({
      organisationName: body.organisationName,
      kind: body.kind,
      country: body.country,
      city: body.city ?? null,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      primaryDomain: primary,
      extraDomains: extras,
      estimatedPeople: body.estimatedPeople ?? null,
      message: body.message ?? null,
    });

    return ok({
      ok: true,
      id: request.id,
      message: 'Application received. A platform operator will review it and email you the outcome.',
    });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      return fail(409, 'An application from that organisation is already awaiting review.');
    }
    throw error;
  }
});
