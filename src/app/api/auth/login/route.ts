import { route, ok, fail, readJson, clientIp, userAgent } from '@/lib/http';
import { loginSchema } from '@/lib/validation';
import { verifyPassword } from '@/lib/password';
import { findInstitutionByDomain } from '@/lib/repos/platform';
import { findUserByEmail, recordFailedLogin, recordSuccessfulLogin } from '@/lib/repos/users';
import { createSession } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { LOGIN_LIMIT, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export const POST = route(async (req: Request) => {
  const body = loginSchema.parse(await readJson(req));
  const ip = clientIp(req) ?? 'unknown';
  const ua = userAgent(req);

  const limit = rateLimit(`login:${ip}:${body.email.toLowerCase()}`, LOGIN_LIMIT.limit, LOGIN_LIMIT.window);
  if (!limit.ok) {
    return fail(429, `Too many attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).`);
  }

  const domain = body.email.split('@')[1] ?? '';
  const institution = await findInstitutionByDomain(domain);

  // Suspended and closed organisations: block sign-in, but only after the
  // password has been checked, so the endpoint cannot be used to discover which
  // organisations exist or which addresses have accounts.
  const user = institution ? await findUserByEmail(institution.id, body.email) : null;

  // Identical response for unknown accounts, wrong passwords and disabled
  // accounts: the endpoint must not reveal who has an account.
  const invalid = () => fail(401, 'Incorrect email or password.');

  if (!user || user.deleted_at) return invalid();
  if (user.locked_until && user.locked_until.getTime() > Date.now()) {
    return fail(423, 'This account is temporarily locked after repeated failed attempts. Try again in 15 minutes.');
  }

  const valid = await verifyPassword(body.password, user.password_hash);
  if (!valid) {
    await recordFailedLogin(user.id);
    await logAudit({
      institutionId: user.institution_id,
      actorId: user.id,
      action: 'auth.login_failed',
      entityType: 'user',
      entityId: user.id,
      ip,
      userAgent: ua,
    });
    return invalid();
  }

  if (institution && (institution.status === 'SUSPENDED' || institution.status === 'CLOSED')) {
    await logAudit({
      institutionId: institution.id,
      actorId: user.id,
      action: 'auth.login_blocked_tenant_status',
      entityType: 'institution',
      entityId: institution.id,
      metadata: { status: institution.status },
      ip,
      userAgent: ua,
    });
    return fail(
      403,
      `${institution.name}’s account is ${institution.status.toLowerCase()}. Contact your administrator.`,
    );
  }

  if (user.status !== 'ACTIVE') {
    return fail(403, 'This account is not active. Contact your organisation’s CampusGuard administrator.');
  }

  await recordSuccessfulLogin(user.id);
  await logAudit({
    institutionId: user.institution_id,
    actorId: user.id,
    actorRole: user.role,
    action: 'auth.login',
    entityType: 'user',
    entityId: user.id,
    ip,
    userAgent: ua,
  });

  await createSession(user.id, user.role, { ip, userAgent: ua });

  return ok({ id: user.id, role: user.role, platformRole: user.platform_role });
});
