import { getPageSession } from '@/lib/auth';
import { unreadNotificationCount } from '@/lib/repos/misc';
import { AppSidebar } from './nav';
import { CONSOLE_LABEL, sectionsForRole } from './nav-config';
import { brandStyle } from '@/lib/brand';
import { ROLE_LABEL } from '@/lib/constants';
import { roleHome } from '@/lib/role-home';
import type { Role } from '@/lib/types';

/**
 * The signed-in application shell: a fixed dark sidebar on desktop, a top bar
 * with a slide-in drawer on mobile. The tenant's brand colour re-points the
 * palette for everything inside, including the sidebar accents.
 */
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
    <div className="min-h-screen lg:pl-[268px]" style={brandStyle(session.institution.brand_primary)}>
      {/* WCAG 2.4.1 — keyboard and screen-reader users need a way past the nav
          on every page, not just the first. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <AppSidebar
        homeHref={roleHome(session.role)}
        consoleLabel={CONSOLE_LABEL[session.role]}
        sections={sectionsForRole(session.role, unread)}
        userName={session.user.full_name}
        userMeta={ROLE_LABEL[session.role]}
        institutionName={session.institution.name}
        institutionLogoUrl={session.institution.logo_url}
        platformLink={session.platformRole === 'PLATFORM_ADMIN'}
      />
      <div className="flex min-h-screen flex-col">
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-10 lg:py-9"
        >
          {children}
        </main>
        <footer className="mx-auto w-full max-w-7xl px-4 pb-8 pt-2 text-xs text-slate-500 sm:px-6 lg:px-10">
          CampusGuard · Register. Report. Recover. · Data handled under {session.institution.name}’s data-processing
          agreement.
        </footer>
      </div>
    </div>
  );
}
