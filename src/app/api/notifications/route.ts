import { route, ok } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { listNotifications } from '@/lib/repos/misc';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const session = await requireUser();
  return ok({ rows: await listNotifications(session.user.id, 40) });
});
