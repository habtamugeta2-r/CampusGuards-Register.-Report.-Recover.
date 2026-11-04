'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { IconName, SidebarSection } from './nav-config';
import {
  AuditIcon,
  BellIcon,
  BookIcon,
  BuildingIcon,
  ChartIcon,
  FileTextIcon,
  GlobeIcon,
  HistoryIcon,
  HomeIcon,
  InboxIcon,
  LaptopIcon,
  LockIcon,
  LogOutIcon,
  MapPinIcon,
  MenuIcon,
  QrIcon,
  SettingsIcon,
  ShieldIcon,
  SwapIcon,
  TagIcon,
  UsersIcon,
  XIcon,
  type IconProps,
} from './icons';

// Kept for the pages that imported the shield from here before the redesign.
export { ShieldIcon } from './icons';

const ICONS: Record<IconName, (props: IconProps) => React.ReactNode> = {
  home: HomeIcon,
  laptop: LaptopIcon,
  file: FileTextIcon,
  swap: SwapIcon,
  bell: BellIcon,
  lock: LockIcon,
  qr: QrIcon,
  history: HistoryIcon,
  book: BookIcon,
  chart: ChartIcon,
  inbox: InboxIcon,
  tag: TagIcon,
  users: UsersIcon,
  'map-pin': MapPinIcon,
  audit: AuditIcon,
  settings: SettingsIcon,
  globe: GlobeIcon,
  building: BuildingIcon,
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function AppSidebar({
  homeHref,
  consoleLabel,
  sections,
  userName,
  userMeta,
  institutionName,
  institutionLogoUrl = null,
  platformLink = false,
}: {
  homeHref: string;
  consoleLabel: string;
  sections: SidebarSection[];
  userName: string;
  userMeta: string;
  institutionName?: string;
  institutionLogoUrl?: string | null;
  /** Platform operators get a link across tenants; nobody else does. */
  platformLink?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Close the drawer whenever navigation happens, and restore body scroll.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const notificationsHref = sections
    .flatMap((section) => section.items)
    .find((item) => item.icon === 'bell')?.href;
  const unread = sections.flatMap((section) => section.items).find((item) => item.icon === 'bell')?.badge ?? 0;

  function isActive(href: string): boolean {
    return pathname === href || (href !== homeHref && pathname.startsWith(href + '/'));
  }

  function navList(idPrefix: string) {
    return (
      <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {platformLink ? (
          <div className="px-1">
            <Link
              href="/platform"
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <GlobeIcon className="h-5 w-5 text-brand-300" />
              Platform console
            </Link>
          </div>
        ) : null}
        {sections.map((section, index) => (
          <div key={section.label ?? index}>
            {section.label ? (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {section.label}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = isActive(item.href);
                return (
                  <li key={`${idPrefix}-${item.href}`}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={clsx(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-white/10 text-white ring-1 ring-inset ring-white/10'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                      )}
                    >
                      {active ? (
                        <span aria-hidden="true" className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-400" />
                      ) : null}
                      <Icon className={clsx('h-5 w-5 shrink-0', active ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300')} />
                      <span className="truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-semibold text-white">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    );
  }

  function brandBlock() {
    return (
      <Link href={homeHref} className="flex items-center gap-3 px-2">
        {institutionLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={institutionLogoUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl bg-white/10 object-contain p-1" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-sm">
            <ShieldIcon className="h-5 w-5" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block font-display text-[15px] font-semibold tracking-tight text-white">CampusGuard</span>
          <span className="block truncate text-xs text-slate-400">{institutionName ?? consoleLabel}</span>
        </span>
      </Link>
    );
  }

  function userBlock() {
    return (
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white ring-1 ring-inset ring-white/15">
            {initials(userName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">{userName}</span>
            <span className="block truncate text-xs text-slate-400">{userMeta}</span>
          </span>
          <button
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOutIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] flex-col bg-ink-950 lg:flex">
        <div className="ink-glow flex h-full flex-col">
          <div className="px-4 pb-5 pt-6">{brandBlock()}</div>
          <p className="mb-3 px-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{consoleLabel}</p>
          {navList('desktop')}
          {userBlock()}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-white/10 bg-ink-950/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="app-menu"
            className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <Link href={homeHref} className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-800 text-white">
              <ShieldIcon className="h-4 w-4" />
            </span>
            <span className="truncate font-display text-sm font-semibold text-white">CampusGuard</span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          {notificationsHref ? (
            <Link
              href={notificationsHref}
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              className="relative rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <BellIcon className="h-5 w-5" />
              {unread > 0 ? (
                <span aria-hidden="true" className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-400 ring-2 ring-ink-950" />
              ) : null}
            </Link>
          ) : null}
          <span aria-hidden="true" className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white ring-1 ring-inset ring-white/15">
            {initials(userName)}
          </span>
        </div>
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            aria-label="Close menu"
            className="absolute inset-0 h-full w-full cursor-default bg-ink-950/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />
          <div
            id="app-menu"
            className="absolute inset-y-0 left-0 flex w-[300px] max-w-[85vw] animate-fade-in flex-col bg-ink-950 shadow-glow"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setOpen(false);
            }}
          >
            <div className="flex items-center justify-between px-4 pb-5 pt-6">
              {brandBlock()}
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 px-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{consoleLabel}</p>
            {navList('mobile')}
            {userBlock()}
          </div>
        </div>
      ) : null}
    </>
  );
}
