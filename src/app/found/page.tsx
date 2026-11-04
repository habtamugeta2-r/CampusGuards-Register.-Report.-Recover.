import { Card } from '@/components/ui';
import { FoundScanner } from '@/components/found-scanner';
import { PublicShell, PublicPageIntro } from '@/components/public-shell';
import { HandIcon } from '@/components/icons';

export const metadata = { title: 'Report a found device' };
export const dynamic = 'force-dynamic';

export default function FoundPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-xl px-4 py-14 sm:px-6">
        <div className="mb-8 flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <HandIcon className="h-7 w-7" />
          </span>
        </div>
        <PublicPageIntro
          eyebrow="No account needed"
          title="Found something?"
          description="Scan the label, or just tell us where you found it. You do not need an account, and we never pass your contact details to the owner."
        />
        <Card className="card-pad mt-8">
          <FoundScanner />
        </Card>
        <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
          Thank you for handing it in — this is exactly how devices find their way home.
        </p>
      </div>
    </PublicShell>
  );
}
