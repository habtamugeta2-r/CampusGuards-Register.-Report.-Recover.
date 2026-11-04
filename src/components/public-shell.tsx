import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandLogo } from './ui';
import { ArrowRightIcon } from './icons';

/**
 * Chrome for the signed-out, public-facing pages (found, join, legal, auth
 * fallbacks). The landing page composes its own dark header but shares the
 * footer so every public surface ends the same way.
 */

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="CampusGuard home">
          <BrandLogo />
        </Link>
        <nav aria-label="Public" className="flex items-center gap-2">
          <Link href="/found" className="btn-ghost btn-sm hidden sm:inline-flex">
            I found a device
          </Link>
          <Link href="/login" className="btn-secondary btn-sm">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary btn-sm">
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-ink-950 text-slate-400">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <BrandLogo onDark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              A property registry that helps an organisation return what goes missing. It does not prevent theft and it
              does not track devices — it keeps the record that makes recovery possible.
            </p>
          </div>
          <nav aria-label="Product">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Product</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/register" className="transition-colors hover:text-white">Register a device</Link></li>
              <li><Link href="/found" className="transition-colors hover:text-white">Report a found device</Link></li>
              <li><Link href="/join" className="transition-colors hover:text-white">Bring your organisation</Link></li>
              <li><Link href="/login" className="transition-colors hover:text-white">Sign in</Link></li>
            </ul>
          </nav>
          <nav aria-label="Legal">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Legal</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/legal/privacy" className="transition-colors hover:text-white">Privacy notice</Link></li>
              <li><Link href="/legal/data-rights" className="transition-colors hover:text-white">Your data rights</Link></li>
              <li><Link href="/legal/terms" className="transition-colors hover:text-white">Terms of use</Link></li>
            </ul>
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CampusGuard · Register. Report. Recover.</p>
          <p>Built for Ethiopian higher education · Data hosted in Ethiopia (Proclamation No. 1321/2024, Art. 22)</p>
        </div>
      </div>
    </footer>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}

export function PublicPageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
      {description ? <p className="mt-3 text-base leading-relaxed text-slate-600">{description}</p> : null}
    </div>
  );
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800">
      {children}
      <ArrowRightIcon className="h-4 w-4" />
    </Link>
  );
}
