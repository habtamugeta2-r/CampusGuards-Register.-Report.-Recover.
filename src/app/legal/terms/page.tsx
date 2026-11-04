import Link from 'next/link';
import { Card, PageHeader } from '@/components/ui';

export const metadata = { title: 'Terms of use' };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Terms of use"
        description="Plain-language terms for students, officers and administrators using CampusGuard. Version 2026-01-01."
      />

      <div className="space-y-4 text-sm text-slate-700">
        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">Registration is voluntary</h2>
          <p className="mt-1">
            You choose whether to register a device and what details to give. An unregistered device is not a suspicious
            device, and no one may be stopped, searched or penalised for not using CampusGuard.
          </p>
        </Card>

        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">Registration is not proof of ownership</h2>
          <p className="mt-1">
            A CampusGuard record reflects what you told the system. It is evidence, not a verdict. Ownership disputes are
            resolved by the university through its own procedures — not by the app.
          </p>
        </Card>

        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">Report honestly</h2>
          <p className="mt-1">
            Filing a report for a device you know is not missing wastes security time and skews the recovery figures the
            university relies on. Deliberate false reports are a disciplinary matter under university rules — handled by
            people, not by the software.
          </p>
        </Card>

        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">Officers: a scan is information, not a verdict</h2>
          <p className="mt-1">
            No student may be detained, publicly searched, or have property confiscated because of what a scan result
            shows. Every result requires human judgement, and escalation follows the university’s written procedure.
          </p>
        </Card>

        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">What this service does not promise</h2>
          <p className="mt-1">
            CampusGuard does not prevent theft, does not track your device’s location, and does not guarantee recovery. It
            makes recovery more likely by giving the university a record to work from.
          </p>
        </Card>

        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">Availability</h2>
          <p className="mt-1">
            The service is provided on a best-efforts basis during the pilot. Outages, connectivity problems and
            imperfect scanning conditions are expected, and the offline mode exists because connectivity at universities
            is not reliable.
          </p>
        </Card>
      </div>

      <p className="mt-6 text-sm text-slate-500">
        <Link href="/legal/privacy" className="font-medium text-brand-700 hover:underline">
          Privacy notice
        </Link>{' '}
        ·{' '}
        <Link href="/legal/data-rights" className="font-medium text-brand-700 hover:underline">
          Your data rights
        </Link>
      </p>
    </div>
  );
}
