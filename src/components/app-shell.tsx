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
      {/* WCAG 2.4.1 — keyboard and screen-reader users need a way past the nav
          on every page, not just the first. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <TopNav
        role={session.role}
        name={session.user.full_name}
        institution={session.institution.code}
        unread={unread}
      />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 sm:py-8 focus:outline-none">
        {children}
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs text-slate-500">
        CampusGuard · Register. Report. Recover. · Data handled under {session.institution.name}’s data-processing
        agreement.
      </footer>
    </div>
  );
}
