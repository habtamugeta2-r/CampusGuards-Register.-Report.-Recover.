import { route, ok } from '@/lib/http';
import { destroySession } from '@/lib/session';
import { getUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const POST = route(async () => {
  const session = await getUser();
  if (session) {
    await logAudit({
      institutionId: session.institution.id,
      actorId: session.user.id,
      actorRole: session.role,
      action: 'auth.logout',
      entityType: 'user',
      entityId: session.user.id,
    });
  }
  await destroySession();
  return ok({ ok: true });
});
