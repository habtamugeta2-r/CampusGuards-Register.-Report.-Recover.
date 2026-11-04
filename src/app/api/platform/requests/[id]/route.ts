import { randomBytes } from 'node:crypto';
import { route, ok, fail, readJson, clientIp, userAgent, notFound } from '@/lib/http';
import { requirePlatformAdmin } from '@/lib/auth';
import {
  createInstitution,
  decideRequest,
  domainTaken,
  findRequest,
  logPlatformAudit,
  normaliseDomain,
} from '@/lib/repos/platform';
import { createUser } from '@/lib/repos/users';
import { hashPassword } from '@/lib/password';
import { sendEmail } from '@/lib/mailer';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const decideSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().trim().max(1000).nullish(),
  // Approval options
  code: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .regex(/^[A-Za-z0-9-]+$/)
    .nullish(),
  status: z.enum(['TRIAL', 'ACTIVE']).nullish(),
  seatLimit: z.number().int().positive().max(5_000_000).nullish(),
  licenceExpiresAt: z.string().datetime().nullish(),
});

export const GET = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requirePlatformAdmin();
  const { id: requestId } = await params;
  const request = await findRequest(requestId);
  if (!request) notFound('Application not found.');
  return ok({ request });
});

/**
 * Approve or reject an application to join.
 *
 * On approval this creates the tenant, claims its domains, and provisions the
 * first administrator with a one-time password that is shown here exactly once
 * and emailed to the address the applicant gave. It is not stored in
 * recoverable form (the account gets a normal bcrypt hash like everyone else),
 * so if it is lost the operator simply resets the account — which is why the
 * UI tells the operator to copy it before closing the dialog.
 */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requirePlatformAdmin();
  const { id: requestId } = await params;
  const body = decideSchema.parse(await readJson(req));

  const request = await findRequest(requestId);
  if (!request) notFound('Application not found.');
  if (request.status !== 'NEW') return fail(409, 'That application has already been reviewed.');

  if (body.decision === 'REJECTED') {
    await decideRequest(requestId, 'REJECTED', session.user.id, body.notes ?? null, null);
    await logPlatformAudit({
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'institution_request.reject',
      entityType: 'institution_request',
      entityId: requestId,
      metadata: { organisation: request.organisation_name, notes: body.notes ?? null },
      ip: clientIp(req),
      userAgent: userAgent(req),
    });
    return ok({ ok: true, decision: 'REJECTED' });
  }

  const domains = [request.primary_domain, ...(request.extra_domains ?? [])];
  for (const domain of domains) {
    if (await domainTaken(domain)) {
      return fail(409, `The domain ${domain} was claimed while this application was waiting. Reject or edit it.`);
    }
  }

  const code = (body.code ?? slugToCode(request.organisation_name)).toUpperCase();
  const institution = await createInstitution({
    name: request.organisation_name,
    code,
    kind: request.kind,
    status: body.status ?? 'TRIAL',
    country: request.country,
    city: request.city,
    primaryDomain: normaliseDomain(request.primary_domain),
    extraDomains: request.extra_domains ?? [],
    seatLimit: body.seatLimit ?? null,
    licenceExpiresAt: body.licenceExpiresAt ? new Date(body.licenceExpiresAt) : null,
  });

  // First administrator: on the organisation's own domain, not the applicant's
  // personal address, so the account survives staff changes and is auditable.
  const adminEmail = `admin@${normaliseDomain(request.primary_domain)}`;
  const temporaryPassword = randomBytes(12).toString('base64url');
  const admin = await createUser({
    institutionId: institution.id,
    email: adminEmail,
    passwordHash: await hashPassword(temporaryPassword),
    fullName: request.contact_name,
    role: 'ADMIN',
    status: 'ACTIVE',
  });

  await decideRequest(requestId, 'APPROVED', session.user.id, body.notes ?? null, institution.id);

  await logPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: 'institution_request.approve',
    entityType: 'institution',
    entityId: institution.id,
    metadata: {
      requestId,
      organisation: institution.name,
      code: institution.code,
      adminEmail,
      contactEmail: request.contact_email,
    },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  const email = await sendEmail({
    to: request.contact_email,
    subject: `${institution.name} is now on CampusGuard`,
    text: [
      `Hello ${request.contact_name},`,
      '',
      `Your application for ${institution.name} has been approved. The organisation code is ${institution.code}.`,
      '',
      `Sign in at ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/login with:`,
      `  ${adminEmail}`,
      `  ${temporaryPassword}`,
      '',
      'This password is shown once. Change it immediately after signing in.',
      '',
      'People with an email address on ' +
        (domains.join(', ') || 'your domain') +
        ' can now register their devices.',
    ].join('\n'),
  });

  return ok({
    ok: true,
    decision: 'APPROVED',
    institution,
    admin: { email: adminEmail, id: admin.id },
    temporaryPassword,
    emailDelivered: email.delivered,
  });
});

function slugToCode(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word) && word.length > 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
  const candidate = initials.slice(0, 6) || name.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
  return candidate.length >= 2 ? candidate : `ORG${randomBytes(2).toString('hex').toUpperCase()}`;
}
