import Link from 'next/link';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { BrandLogo } from './ui';
import { BellIcon, QrIcon, ShieldIcon } from './icons';

const PROMISES = [
  {
    icon: QrIcon,
    title: 'Opaque QR labels',
    body: 'A stranger’s camera learns nothing about the owner.',
  },
  {
    icon: BellIcon,
    title: 'Instant alerts',
    body: 'Security and the desk see a report the moment it is filed.',
  },
  {
    icon: ShieldIcon,
    title: 'Honest verification',
    body: 'A scan prompts a conversation, never an accusation.',
  },
];

/**
 * Split-panel layout for sign-in and sign-up: the product story on the left
 * (desktop), the form on the right. On mobile the story panel collapses and
 * the form gets the whole screen.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-ink-950 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div aria-hidden="true" className="ink-grid absolute inset-0" />
        <div aria-hidden="true" className="ink-glow absolute inset-0" />

        <div className="relative">
          <Link href="/" aria-label="CampusGuard home">
            <BrandLogo onDark />
          </Link>
        </div>

        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">Register. Report. Recover.</p>
          <p className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
            Every device has a story. Keep yours on record.
          </p>
          <ul className="mt-10 space-y-6">
            {PROMISES.map((promise) => (
              <li key={promise.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-brand-300">
                  <promise.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{promise.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{promise.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs leading-relaxed text-slate-400">
          One platform, many organisations — each with its own domains, retention windows and data region. Hosted in
          Ethiopia under Proclamation No. 1321/2024.
        </p>
      </aside>

      <main className="flex flex-col justify-center px-4 py-10 sm:px-8">
        <div className={clsx('mx-auto w-full', wide ? 'max-w-xl' : 'max-w-md')}>
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/" aria-label="CampusGuard home">
              <BrandLogo />
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
