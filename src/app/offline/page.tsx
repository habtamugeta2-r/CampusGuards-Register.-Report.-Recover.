import Link from 'next/link';
import { ShieldIcon } from '@/components/nav';
import { ReloadButton } from '@/components/reload-button';

export const metadata = { title: 'Offline' };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <ShieldIcon className="h-10 w-10 text-slate-400" />
      <h1 className="mt-4 text-lg font-semibold text-slate-900">You are offline</h1>
      <p className="mt-2 text-sm text-slate-600">
        CampusGuard cannot reach the server. Registration and reporting need a connection, but security officers can keep
        scanning — results are resolved from the encrypted cache on the device and uploaded automatically when the network
        returns.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/security" className="btn-primary">
          Open scan console
        </Link>
        <ReloadButton />
      </div>
    </main>
  );
}
