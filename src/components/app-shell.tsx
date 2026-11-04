import { getPageSession } from '@/lib/auth';
import { unreadNotificationCount } from '@/lib/repos/misc';
import { TopNav } from './nav';
import type { Role } from '@/lib/types';

export async function AppShell({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const session = await getPageSession(roles);
  const unread = await unreadNotificationCount(session.user.id);

  return (
    <div className="min-h-screen">
      <TopNav
        role={session.role}
        name={session.user.full_name}
        institution={session.institution.code}
        unread={unread}
      />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs text-slate-400">
        CampusGuard · Register. Report. Recover. · Data handled under {session.institution.name}’s data-processing
        agreement.
      </footer>
    </div>
  );
}
