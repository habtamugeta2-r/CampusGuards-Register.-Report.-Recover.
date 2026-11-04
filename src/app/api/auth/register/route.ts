import { route, ok, fail, readJson, clientIp, userAgent, conflict } from '@/lib/http';
import { registerSchema } from '@/lib/validation';
import { hashPassword, passwordProblems } from '@/lib/password';
import { recordConsent } from '@/lib/repos/misc';
import { countSeatsUsed, findInstitutionByDomain } from '@/lib/repos/platform';
import { createUser, findUserByEmail } from '@/lib/repos/users';
import { createSession } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { CONSENT_VERSIONS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const POST = route(async (req: Request) => {
  const body = registerSchema.parse(await readJson(req));
  const ip = clientIp(req);
  const ua = userAgent(req);

  const problems = passwordProblems(body.password);
  if (problems.length) return fail(400, problems.join(' '));

  const domain = body.email.split('@')[1] ?? '';
  const institution = await findInstitutionByDomain(domain);
  if (!institution) {
    return fail(
      400,
      'CampusGuard is not enabled for your organisation’s email domain yet. Ask whoever runs your registry to contact us — a new organisation can apply at /join.',
    );
  }

  // A tenant can be closed or suspended without deleting a single row. Data is
  // preserved; the door is shut.
  if (institution.status === 'CLOSED') {
    return fail(403, `${institution.name} is no longer using CampusGuard. Contact your administrator.`);
  }
  if (institution.status === 'SUSPENDED') {
    return fail(403, `${institution.name}’s account is suspended. Contact your administrator.`);
  }
  if (institution.licence_expires_at && institution.licence_expires_at.getTime() < Date.now()) {
    return fail(403, `${institution.name}’s licence expired on ${institution.licence_expires_at.toISOString().slice(0, 10)}. Contact your administrator to renew.`);
  }

  // Seat limits bite on registration only. Someone who already has an account
  // must never be locked out of the devices they registered because of a
  // billing conversation.
  if (institution.seat_limit) {
    const used = await countSeatsUsed(institution.id);
    if (used >= institution.seat_limit) {
      return fail(
        403,
        `${institution.name} has reached its ${institution.seat_limit} registered people. Ask your administrator to raise the limit.`,
      );
    }
  }

  const existing = await findUserByEmail(institution.id, body.email);
  if (existing) return fail(409, 'An account already exists for that email address.');

  const passwordHash = await hashPassword(body.password);
  const user = await createUser({
    institutionId: institution.id,
    email: body.email,
    passwordHash,
    fullName: body.fullName,
    phone: body.phone || null,
    role: 'STUDENT',
    status: 'ACTIVE',
    studentId: body.studentId,
    department: body.department || null,
  });

  // Consent is recorded per version so we can prove what the student agreed to.
  for (const type of Object.keys(CONSENT_VERSIONS) as Array<keyof typeof CONSENT_VERSIONS>) {
    await recordConsent(user.id, type, CONSENT_VERSIONS[type], body.consents.includes(type), { ip, userAgent: ua });
  }

  await logAudit({
    institutionId: institution.id,
    actorId: user.id,
    actorRole: 'STUDENT',
    action: 'auth.register',
    entityType: 'user',
    entityId: user.id,
    ip,
    userAgent: ua,
  });

  await createSession(user.id, 'STUDENT', { ip, userAgent: ua });

  return ok({ id: user.id, role: user.role, institution: institution.code });
});
