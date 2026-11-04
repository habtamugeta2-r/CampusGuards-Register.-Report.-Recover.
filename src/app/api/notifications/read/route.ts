import { route, ok, readJson } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { markAllNotificationsRead, markNotificationRead } from '@/lib/repos/misc';

export const dynamic = 'force-dynamic';

export const POST = route(async (req: Request) => {
  const session = await requireUser();
  const body = (await readJson(req)) as { id?: string };
  if (body.id) await markNotificationRead(body.id, session.user.id);
  else await markAllNotificationsRead(session.user.id);
  return ok({ ok: true });
});
