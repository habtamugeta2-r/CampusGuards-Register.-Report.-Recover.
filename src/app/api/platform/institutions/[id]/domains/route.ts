import { route, ok, fail, readJson, clientIp, userAgent, notFound } from '@/lib/http';
import { requirePlatformAdmin } from '@/lib/auth';
import { findInstitutionById } from '@/lib/repos/misc';
import {
  addDomain,
  domainTaken,
  isValidDomain,
  listDomainsFor,
  logPlatformAudit,
  normaliseDomain,
  removeDomain,
} from '@/lib/repos/platform';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const addSchema = z.object({ domain: z.string().trim().min(3).max(253) });
const removeSchema = z.object({ domainId: z.string().trim().min(3) });

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requirePlatformAdmin();
  const { id: institutionId } = await params;
  const institution = await findInstitutionById(institutionId);
  if (!institution) notFound('Organisation not found.');

  const body = addSchema.parse(await readJson(req));
  const clean = normaliseDomain(body.domain);
  if (!isValidDomain(clean)) return fail(400, `"${clean || body.domain}" is not a valid email domain.`);
  if (await domainTaken(clean, institutionId)) {
    return fail(409, `The domain ${clean} is already claimed by another organisation.`);
  }

  try {
    const domain = await addDomain(institutionId, clean);
    await logPlatformAudit({
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'institution.domain.add',
      entityType: 'institution',
      entityId: institutionId,
      metadata: { domain: clean },
      ip: clientIp(req),
      userAgent: userAgent(req),
    });
    return ok({ domain });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      return fail(409, `The domain ${clean} is already claimed.`);
    }
    throw error;
  }
});

/** The primary domain cannot be removed — an organisation always needs one. */
export const DELETE = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requirePlatformAdmin();
  const { id: institutionId } = await params;
  const body = removeSchema.parse(await readJson(req));

  const removed = await removeDomain(institutionId, body.domainId);
  if (!removed) return fail(400, 'That domain could not be removed. The primary domain cannot be deleted.');

  await logPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: 'institution.domain.remove',
    entityType: 'institution',
    entityId: institutionId,
    metadata: { domainId: body.domainId },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ ok: true });
});

export const GET = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requirePlatformAdmin();
  const { id: institutionId } = await params;
  return ok({ domains: await listDomainsFor(institutionId) });
});
