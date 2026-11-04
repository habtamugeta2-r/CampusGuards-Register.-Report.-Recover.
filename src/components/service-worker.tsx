'use client';

import { useEffect, useState } from 'react';

/**
 * Registers the offline service worker.
 *
 * Service workers need a secure context (https or localhost). The worker itself
 * is intentionally conservative: it never caches authenticated API responses,
 * because a shared device must not serve one officer's data to the next.
 */
export function ServiceWorkerRegistrar() {
  const [status, setStatus] = useState<'idle' | 'ready' | 'unsupported'>('idle');

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setStatus('unsupported');
      return;
    }
    if (!window.isSecureContext) {
      setStatus('unsupported');
      return;
    }

    let cancelled = false;
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(() => {
        if (!cancelled) setStatus('ready');
      })
      .catch((error) => {
        console.warn('[sw] registration failed', error);
        if (!cancelled) setStatus('unsupported');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status !== 'ready') return null;

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-40 hidden rounded-full bg-emerald-600/95 px-3 py-1 text-xs font-medium text-white shadow-lg md:block">
      Offline ready
    </div>
  );
}
