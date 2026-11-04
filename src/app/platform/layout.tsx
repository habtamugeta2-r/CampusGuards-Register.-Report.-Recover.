import { AppSidebar } from '@/components/nav';
import type { SidebarSection } from '@/components/nav-config';
import { LockIcon } from '@/components/icons';
import { getPlatformShellSession } from '@/lib/auth';

export const metadata = { title: 'Platform · CampusGuard' };
export const dynamic = 'force-dynamic';

/**
 * The platform console.
 *
 * Structurally separate from AppShell on purpose: this console administers
 * organisations, not the devices inside one of them, and its guard is a
 * different grant (platform_role, not the institution ADMIN role). Keeping it
 * in its own tree means platform staff never see a tenant's navigation, and a
 * tenant administrator never sees a link here.
 *
 * Two grants share the shell. A PLATFORM_ADMIN provisions and licences
 * organisations; a COUNTRY_ADMIN measures a whole country and can open nothing
 * else, so their navigation is deliberately one link long.
 */
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getPlatformShellSession();
  const isCountryAdmin = session.platformRole === 'COUNTRY_ADMIN';

  const sections: SidebarSection[] = isCountryAdmin
    ? [{ items: [{ href: '/platform/country', label: session.platformCountry ?? 'Country', icon: 'globe' }] }]
    : [
        {
          items: [
            { href: '/platform', label: 'Overview', icon: 'chart' },
            { href: '/platform/country', label: 'Countries', icon: 'globe' },
            { href: '/platform/organisations', label: 'Organisations', icon: 'building' },
            { href: '/platform/requests', label: 'Applications', icon: 'inbox' },
            { href: '/platform/audit', label: 'Platform audit', icon: 'audit' },
          ],
        },
      ];

  return (
    <div className="min-h-screen lg:pl-[268px]">
      <a
        href="#platform-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      <AppSidebar
        homeHref={isCountryAdmin ? '/platform/country' : '/platform'}
        consoleLabel={isCountryAdmin ? 'Country console' : 'Platform console'}
        sections={sections}
        userName={session.user.full_name}
        userMeta={session.user.email}
        institutionName="CampusGuard Platform"
      />

      <div className="flex min-h-screen flex-col">
        <main
          id="platform-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-10 lg:py-9"
        >
          <div className="mb-6 flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-600 shadow-xs">
            <LockIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <p>
              {isCountryAdmin ? (
                <>
                  You are signed in as a <strong>country operator</strong> for {session.platformCountry}. You can see how
                  every organisation in {session.platformCountry} is doing, and you cannot open any of them — no people,
                  devices or scans, only counts. Everything you do here is logged in the platform audit trail.
                </>
              ) : (
                <>
                  You are signed in as a <strong>platform operator</strong>. You can provision and licence organisations,
                  but you cannot read the people, devices or scans inside them — those stay with each organisation’s own
                  administrators. Everything you do here is logged in the platform audit trail.
                </>
              )}
            </p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
