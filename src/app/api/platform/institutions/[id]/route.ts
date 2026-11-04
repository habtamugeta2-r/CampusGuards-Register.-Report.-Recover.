import { route, ok, fail, readJson, clientIp, userAgent, notFound } from '@/lib/http';
import { requirePlatformAdmin } from '@/lib/auth';
import { findInstitutionById } from '@/lib/repos/misc';
import {
  listDomainsFor,
  logPlatformAudit,
  updateInstitution,
} from '@/lib/repos/platform';
import { INSTITUTION_KINDS, INSTITUTION_STATUSES } from '@/lib/constants';
import { BRAND_COLOUR } from '@/lib/brand';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .regex(/^[A-Za-z0-9-]+$/)
    .optional(),
  kind: z.enum(INSTITUTION_KINDS).optional(),
  status: z.enum(INSTITUTION_STATUSES).optional(),
  city: z.string().trim().max(80).nullable().optional(),
  country: z.string().trim().min(2).max(80).optional(),
  timezone: z.string().trim().max(64).optional(),
  dataRegion: z.string().trim().max(80).optional(),
  seatLimit: z.number().int().positive().max(5_000_000).nullable().optional(),
  licenceExpiresAt: z.string().datetime().nullable().optional(),
  logoUrl: z.string().trim().max(500).nullable().optional(),
  brandPrimary: z
    .string()
    .trim()
    .regex(BRAND_COLOUR, 'Use a hex colour, e.g. #145ce1.')
    .nullable()
    .optional(),
  reason: z.string().trim().min(4).max(500).optional(),
});

export const GET = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requirePlatformAdmin();
  const { id: institutionId } = await params;
  const institution = await findInstitutionById(institutionId);
  if (!institution) notFound('Organisation not found.');
  return ok({ institution, domains: await listDomainsFor(institutionId) });
});

/**
 * Platform operators may change anything about a tenant; a tenant's own
 * administrators may not (they use /api/admin/settings, which is deliberately
 * limited to retention and policy switches, and /api/admin/organisation for
 * their own name and location).
 */
export const PATCH = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requirePlatformAdmin();
  const { id: institutionId } = await params;
  const body = patchSchema.parse(await readJson(req));

  const existing = await findInstitutionById(institutionId);
  if (!existing) notFound('Organisation not found.');

  const { reason, ...patch } = body;
  await updateInstitution(institutionId, {
    ...patch,
    code: patch.code ? patch.code.toUpperCase() : undefined,
    licence_expires_at: patch.licenceExpiresAt === undefined ? undefined : patch.licenceExpiresAt ? new Date(patch.licenceExpiresAt) : null,
    logo_url: patch.logoUrl,
    brand_primary: patch.brandPrimary,
  });

  await logPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: 'institution.update',
    entityType: 'institution',
    entityId: institutionId,
    metadata: { changes: Object.keys(patch), reason: reason ?? null },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ ok: true });
});
