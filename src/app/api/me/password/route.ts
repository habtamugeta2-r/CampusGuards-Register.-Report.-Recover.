import { route, ok, fail, readJson } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { hashPassword, passwordProblems, verifyPassword } from '@/lib/password';
import { findUserById, updatePassword } from '@/lib/repos/users';
import { logAudit } from '@/lib/audit';
import { revokeAllSessions } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const POST = route(async (req: Request) => {
  const session = await requireUser();
  const body = (await readJson(req)) as { currentPassword?: string; newPassword?: string };

  if (!body.currentPassword || !body.newPassword) return fail(400, 'Enter your current and new password.');
  const problems = passwordProblems(body.newPassword);
  if (problems.length) return fail(400, problems.join(' '));

  const user = await findUserById(session.user.id);
  if (!user) return fail(404, 'Account not found.');

  const valid = await verifyPassword(body.currentPassword, user.password_hash);
  if (!valid) return fail(400, 'Your current password is incorrect.');

  await updatePassword(user.id, await hashPassword(body.newPassword));
  await revokeAllSessions(user.id, session.sessionId);

  await logAudit({
    institutionId: session.institution.id,
    actorId: user.id,
    actorRole: session.role,
    action: 'auth.password_change',
    entityType: 'user',
    entityId: user.id,
  });

  return ok({ ok: true });
});
