import { route, ok, fail, readJson, clientIp, userAgent, notFound } from '@/lib/http';
import { userRoleSchema, userStatusSchema } from '@/lib/validation';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { findUserById, softDeleteUser, updateUserRole, updateUserStatus } from '@/lib/repos/users';
import { revokeAllSessions } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const PATCH = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireRole('ADMIN');
  const { id: userId } = await params;
  const target = await findUserById(userId);
  if (!target || target.institution_id !== session.institution.id) notFound('User not found.');

  const body = (await readJson(req)) as Record<string, unknown>;
  const roleParsed = userRoleSchema.safeParse(body);
  const statusParsed = userStatusSchema.safeParse(body);

  if (!roleParsed.success && !statusParsed.success) {
    return fail(400, 'Provide a role or a status.');
  }

  // An administrator must not be able to remove their own access by accident.
  if (userId === session.user.id) {
    if (roleParsed.success && roleParsed.data.role !== 'ADMIN') {
      return fail(400, 'You cannot remove your own administrator role.');
    }
    if (statusParsed.success && statusParsed.data.status !== 'ACTIVE') {
      return fail(400, 'You cannot deactivate your own account.');
    }
  }

  if (roleParsed.success) {
    await updateUserRole(userId, roleParsed.data.role);
    // Role changes must take effect immediately on the next request.
    await revokeAllSessions(userId);
  }
  if (statusParsed.success) {
    await updateUserStatus(userId, statusParsed.data.status);
    if (statusParsed.data.status !== 'ACTIVE') await revokeAllSessions(userId);
  }

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'user.update',
    entityType: 'user',
    entityId: userId,
    metadata: { role: roleParsed.success ? roleParsed.data.role : undefined, status: statusParsed.success ? statusParsed.data.status : undefined },
    justification: typeof body.reason === 'string' ? body.reason : null,
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ ok: true });
});

export const DELETE = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireRole('ADMIN');
  const { id: userId } = await params;
  if (userId === session.user.id) return fail(400, 'You cannot delete your own account.');

  const target = await findUserById(userId);
  if (!target || target.institution_id !== session.institution.id) notFound('User not found.');

  await softDeleteUser(userId);

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'user.delete',
    entityType: 'user',
    entityId: userId,
    justification: new URL(req.url).searchParams.get('reason'),
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ ok: true });
});
