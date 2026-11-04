import Link from 'next/link';
import { PageHeader } from '@/components/ui';
import { JoinCard } from '@/components/join-form';
import { ShieldIcon } from '@/components/nav';

export const metadata = { title: 'Bring your organisation to CampusGuard' };
export const dynamic = 'force-dynamic';

export default function JoinPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-center gap-2">
        <ShieldIcon className="h-7 w-7 text-brand-700" />
        <span className="text-base font-semibold">CampusGuard</span>
      </div>

      <PageHeader
        title="Bring your organisation to CampusGuard"
        description="Universities, colleges, TVET institutes, schools, companies and government offices all have the same four needs: know what equipment exists, report it missing, verify it at a gate, and authorise someone else to carry it."
      />

      <div className="space-y-4 text-sm text-slate-700">
        <p>
          Your organisation gets its own tenant: its own email domains, its own retention windows, its own
          administrators, and its own data. A platform operator can see that your organisation exists and how many
          devices it has registered — never who owns them.
        </p>

        <JoinCard />

        <p className="text-center text-xs text-slate-500">
          Already registered? <Link href="/login" className="hover:underline">Sign in</Link> ·{' '}
          <Link href="/" className="hover:underline">What is CampusGuard?</Link>
        </p>
      </div>
    </main>
  );
}
