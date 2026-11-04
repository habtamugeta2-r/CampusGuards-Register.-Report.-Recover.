import Link from 'next/link';
import { Card, PageHeader } from '@/components/ui';
import { FoundScanner } from '@/components/found-scanner';
import { ShieldIcon } from '@/components/nav';

export const metadata = { title: 'Report a found device' };
export const dynamic = 'force-dynamic';

export default function FoundPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-6 flex items-center justify-center gap-2">
        <ShieldIcon className="h-7 w-7 text-brand-700" />
        <span className="text-base font-semibold">CampusGuard</span>
      </div>

      <PageHeader
        title="Found something?"
        description="Scan the label, or just tell us where you found it. You do not need an account, and we never pass your contact details to the owner."
      />

      <Card className="card-pad">
        <FoundScanner />
      </Card>

      <p className="mt-6 text-center text-xs text-slate-500">
        <Link href="/" className="hover:underline">
          ← Back to overview
        </Link>
      </p>
    </main>
  );
}
