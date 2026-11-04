import { route, ok, fail, readJson, clientIp, userAgent } from '@/lib/http';
import { requirePlatformAdmin } from '@/lib/auth';
import {
  createInstitution,
  domainTaken,
  isValidDomain,
  listInstitutionRows,
  logPlatformAudit,
  normaliseDomain,
} from '@/lib/repos/platform';
import { z } from 'zod';
import { INSTITUTION_KINDS, INSTITUTION_STATUSES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().trim().min(2).max(200),
  code: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and dashes only.'),
  kind: z.enum(INSTITUTION_KINDS),
  status: z.enum(INSTITUTION_STATUSES).optional(),
  country: z.string().trim().min(2).max(80).default('Ethiopia'),
  city: z.string().trim().max(80).nullish(),
  dataRegion: z.string().trim().max(80).nullish(),
  timezone: z.string().trim().max(64).nullish(),
  primaryDomain: z.string().trim().min(3).max(253),
  extraDomains: z.array(z.string().trim().min(3).max(253)).optional(),
  seatLimit: z.number().int().positive().max(5_000_000).nullish(),
  licenceExpiresAt: z.string().datetime().nullish(),
});

export const GET = route(async () => {
  await requirePlatformAdmin();
  return ok({ institutions: await listInstitutionRows() });
});

export const POST = route(async (req: Request) => {
  const session = await requirePlatformAdmin();
  const body = createSchema.parse(await readJson(req));

  const primary = normaliseDomain(body.primaryDomain);
  if (!isValidDomain(primary)) return fail(400, `"${primary || body.primaryDomain}" is not a valid email domain.`);

  const extras = (body.extraDomains ?? []).map(normaliseDomain).filter(Boolean);
  for (const domain of extras) {
    if (!isValidDomain(domain)) return fail(400, `"${domain}" is not a valid email domain.`);
  }

  for (const domain of [primary, ...extras]) {
    if (await domainTaken(domain)) {
      return fail(409, `The domain ${domain} is already claimed by another organisation.`);
    }
  }

  let institution;
  try {
    institution = await createInstitution({
      name: body.name,
      code: body.code.toUpperCase(),
      kind: body.kind,
      status: body.status ?? 'TRIAL',
      country: body.country,
      city: body.city ?? null,
      dataRegion: body.dataRegion ?? undefined,
      timezone: body.timezone ?? undefined,
      primaryDomain: primary,
      extraDomains: extras,
      seatLimit: body.seatLimit ?? null,
      licenceExpiresAt: body.licenceExpiresAt ? new Date(body.licenceExpiresAt) : null,
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === '23505') {
      return fail(409, 'An organisation with that code or domain already exists.');
    }
    throw error;
  }

  await logPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: 'institution.create',
    entityType: 'institution',
    entityId: institution.id,
    metadata: { name: institution.name, code: institution.code, kind: institution.kind, domains: [primary, ...extras] },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ institution });
});
