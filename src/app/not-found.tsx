import Link from 'next/link';
import { BrandLogo } from '@/components/ui';
import { ArrowLeftIcon, SearchIcon } from '@/components/icons';

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink-950 px-6 text-center">
      <div aria-hidden="true" className="ink-grid absolute inset-0" />
      <div aria-hidden="true" className="ink-glow absolute inset-0" />
      <div className="relative">
        <Link href="/" aria-label="CampusGuard home" className="inline-block">
          <BrandLogo onDark />
        </Link>
        <p aria-hidden="true" className="mt-10 font-display text-7xl font-semibold tracking-tight text-white/15">404</p>
        <span className="mx-auto -mt-9 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-brand-300">
          <SearchIcon className="h-7 w-7" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold text-white">This page is not on record</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
          The link may be old, or the label’s token may have been rotated. If you scanned a device label, the code on it
          may simply have been replaced.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to overview
          </Link>
          <Link href="/found" className="btn-on-ink">
            Report a found device
          </Link>
        </div>
      </div>
    </main>
  );
}
