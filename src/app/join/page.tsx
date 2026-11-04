import Link from 'next/link';
import { JoinCard } from '@/components/join-form';
import { PublicShell, PublicPageIntro } from '@/components/public-shell';
import { BuildingIcon, GlobeIcon, LockIcon } from '@/components/icons';

export const metadata = { title: 'Bring your organisation to CampusGuard' };
export const dynamic = 'force-dynamic';

const TENANT_POINTS = [
  {
    icon: BuildingIcon,
    title: 'Your own tenant',
    body: 'Your email domains, retention windows, administrators and branding — not a shared bucket.',
  },
  {
    icon: LockIcon,
    title: 'Your data stays yours',
    body: 'A platform operator can see that you exist and how many devices you registered — never who owns them.',
  },
  {
    icon: GlobeIcon,
    title: 'Your data region',
    body: 'Choose where your data is allowed to live. Ethiopian tenants are hosted inside Ethiopia.',
  },
];

export default function JoinPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <PublicPageIntro
          eyebrow="For organisations"
          title="Bring your organisation to CampusGuard"
          description="Universities, colleges, TVET institutes, schools, companies and government offices all have the same four needs: know what equipment exists, report it missing, verify it at a gate, and authorise someone else to carry it."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {TENANT_POINTS.map((point) => (
            <div key={point.title} className="card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <point.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-3 text-sm font-semibold text-slate-900">{point.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{point.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <JoinCard />
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already registered? <Link href="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link> ·{' '}
          <Link href="/" className="font-medium text-brand-700 hover:underline">What is CampusGuard?</Link>
        </p>
      </div>
    </PublicShell>
  );
}
