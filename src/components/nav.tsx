'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import type { Role } from '@/lib/types';

type NavItem = { href: string; label: string };

const NAV: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: '/student', label: 'Overview' },
    { href: '/student/products', label: 'My devices' },
    { href: '/student/reports', label: 'Reports' },
    { href: '/student/authorizations', label: 'Borrowing' },
    { href: '/student/notifications', label: 'Notifications' },
    { href: '/student/privacy', label: 'My data' },
  ],
  SECURITY: [
    { href: '/security', label: 'Scan' },
    { href: '/security/history', label: 'My scans' },
    { href: '/security/guidance', label: 'Guidance' },
    { href: '/student/notifications', label: 'Notifications' },
  ],
  ADMIN: [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/found', label: 'Found items' },
    { href: '/admin/products', label: 'Registry' },
    { href: '/admin/users', label: 'People' },
    { href: '/admin/scans', label: 'Scan log' },
    { href: '/admin/checkpoints', label: 'Checkpoints' },
    { href: '/admin/audit', label: 'Audit log' },
    { href: '/admin/settings', label: 'Settings' },
  ],
};

export function TopNav({
  role,
  name,
  institution,
  unread,
}: {
  role: Role;
  name: string;
  institution: string;
  unread: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV[role] ?? [];

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <Link href={role === 'STUDENT' ? '/student' : role === 'SECURITY' ? '/security' : '/admin'} className="flex items-center gap-2">
          <ShieldIcon className="h-6 w-6 text-brand-700" />
          <span className="text-sm font-semibold tracking-tight text-slate-900">CampusGuard</span>
          <span className="hidden text-xs text-slate-500 sm:inline">{institution}</span>
        </Link>

        <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto md:order-2 md:w-auto">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== '/student' && pathname.startsWith(item.href + '/'));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                  active ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                {item.label}
                {item.label === 'Notifications' && unread > 0 ? (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-semibold text-white">
                    {unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 ml-auto flex items-center gap-3 md:order-3">
          <span className="hidden text-sm text-slate-600 sm:inline">{name}</span>
          <button onClick={signOut} className="btn-secondary btn-sm">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3.2 5 6v5.4c0 4.2 2.9 7.9 7 9.4 4.1-1.5 7-5.2 7-9.4V6l-7-2.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.2 12.2l2 2 3.6-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
