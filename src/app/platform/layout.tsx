import Link from 'next/link';
import { ShieldIcon } from '@/components/nav';
import { getPlatformShellSession } from '@/lib/auth';
import { SignOutButton } from '@/components/auth-forms';

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

  const links = isCountryAdmin
    ? [{ href: '/platform/country', label: session.platformCountry ?? 'Country' }]
    : [
        { href: '/platform', label: 'Overview' },
        { href: '/platform/country', label: 'Countries' },
        { href: '/platform/organisations', label: 'Organisations' },
        { href: '/platform/requests', label: 'Applications' },
        { href: '/platform/audit', label: 'Platform audit' },
      ];

  return (
    <div className="min-h-screen">
      <a
        href="#platform-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <Link href="/platform" className="flex items-center gap-2">
            <ShieldIcon className="h-6 w-6 text-brand-700" />
            <span className="text-sm font-semibold tracking-tight text-slate-900">CampusGuard</span>
            <span className="text-xs text-slate-500">Platform</span>
          </Link>

          <nav aria-label="Platform" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto md:order-2 md:w-auto">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="order-2 ml-auto flex items-center gap-3 md:order-3">
            <span className="hidden text-xs text-slate-500 sm:inline">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main id="platform-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 focus:outline-none sm:py-8">
        <p className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
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
        {children}
      </main>
    </div>
  );
}
