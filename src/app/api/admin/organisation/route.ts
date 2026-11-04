import { route, ok, readJson, clientIp, userAgent } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { updateInstitutionProfile } from '@/lib/repos/platform';
import { BRAND_COLOUR } from '@/lib/brand';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  city: z.string().trim().max(80).nullable().optional(),
  country: z.string().trim().min(2).max(80).optional(),
  timezone: z.string().trim().max(64).optional(),
  // Branding: how the organisation appears on its own labels, emails and
  // public pages. It grants no access, so it belongs to the organisation.
  logoUrl: z.string().trim().max(500).nullable().optional(),
  brandPrimary: z
    .string()
    .trim()
    .regex(BRAND_COLOUR, 'Use a hex colour, e.g. #145ce1.')
    .nullable()
    .optional(),
});

/**
 * An organisation may edit its own name and location — and nothing that would
 * let it widen its own reach. Domains, type, status, seat limit and licence are
 * platform-operator decisions, deliberately: an administrator who could add
 * `gmail.com` to their tenant could enrol the world, and one who could extend
 * their own licence would not need to pay for it.
 */
export const PATCH = route(async (req: Request) => {
  const session = await requireRole('ADMIN');
  const body = schema.parse(await readJson(req));

  await updateInstitutionProfile(session.institution.id, {
    name: body.name,
    city: body.city,
    country: body.country,
    timezone: body.timezone,
    logo_url: body.logoUrl,
    brand_primary: body.brandPrimary,
  });

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'institution.profile_update',
    entityType: 'institution',
    entityId: session.institution.id,
    metadata: { changes: Object.keys(body) },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ ok: true });
});

export const GET = route(async () => {
  const session = await requireRole('ADMIN');
  return ok({ organisation: session.institution });
});
