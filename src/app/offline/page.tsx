import Link from 'next/link';
import { WifiOffIcon } from '@/components/icons';
import { ReloadButton } from '@/components/reload-button';

export const metadata = { title: 'Offline' };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
        <WifiOffIcon className="h-8 w-8" />
      </span>
      <h1 className="mt-5 text-xl font-semibold text-slate-900">You are offline</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        CampusGuard cannot reach the server. Registration and reporting need a connection, but security officers can keep
        scanning — results are resolved from the encrypted cache on the device and uploaded automatically when the network
        returns.
      </p>
      <div className="mt-7 flex gap-3">
        <Link href="/security" className="btn-primary">
          Open scan console
        </Link>
        <ReloadButton />
      </div>
    </main>
  );
}
