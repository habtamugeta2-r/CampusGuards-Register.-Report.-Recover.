import { route, ok, fail } from '@/lib/http';
import { getUser } from '@/lib/auth';
import { unreadNotificationCount } from '@/lib/repos/misc';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const session = await getUser();
  if (!session) return fail(401, 'Not signed in.');
  return ok({
    user: session.user,
    institution: session.institution,
    profile: session.profile,
    unread: await unreadNotificationCount(session.user.id),
  });
});
