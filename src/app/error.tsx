'use client';

import Link from 'next/link';
import { AlertTriangleIcon, RefreshIcon } from '@/components/icons';

/**
 * Route-level error boundary. Before this existed, a thrown error rendered
 * Next.js's raw default screen. Keep it calm and actionable: retry first,
 * escape hatches second, and never leak the error object to the page.
 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-600">
        <AlertTriangleIcon className="h-8 w-8" />
      </span>
      <h1 className="mt-5 text-xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        The page could not be loaded. Your data is safe — nothing was changed. Try again, and if it keeps happening, tell
        your administrator.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="btn-primary">
          <RefreshIcon className="h-4 w-4" />
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Back to overview
        </Link>
      </div>
    </main>
  );
}
