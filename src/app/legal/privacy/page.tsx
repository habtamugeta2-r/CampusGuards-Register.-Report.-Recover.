import Link from 'next/link';
import { Card, PageHeader } from '@/components/ui';

export const metadata = { title: 'Privacy notice' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Privacy notice"
        description="What CampusGuard collects, why, how long it is kept, and who can see it. Version 2026-01-01."
      />

      <div className="space-y-4 text-sm text-slate-700">
        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">Who controls your data</h2>
          <p className="mt-1">
            Your university is the <strong>data controller</strong> for the records held in CampusGuard. CampusGuard
            operates the software on the university’s behalf as a data processor. Requests about your data go to the
            university, and every request is logged.
          </p>
        </Card>

        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">What we collect</h2>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>Account details: name, university email, a hashed password, and an optional phone number.</li>
            <li>Student profile: university ID number, department, year of study.</li>
            <li>Devices you register: type, brand, model, colour, serial number, distinguishing marks and your notes.</li>
            <li>Reports you file: what happened, where you last had the device, when.</li>
            <li>
              Scan records: which device was scanned, at which checkpoint, at what time — and your name only when an
              officer actually checks your ID card.
            </li>
          </ul>
          <p className="mt-2">
            We do <strong>not</strong> collect your location, your contacts, your photos, your academic records, or
            anything about how you use your devices.
          </p>
        </Card>

        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">What a QR code reveals</h2>
          <p className="mt-1">
            A CampusGuard label contains a random token. Anyone who scans it with an ordinary camera sees only whether the
            device is registered and whether it has been reported missing. They never see your name, email, phone number
            or serial number.
          </p>
        </Card>

        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">Who can see what</h2>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>
              <strong>You:</strong> your own devices, reports, authorisations and scan records.
            </li>
            <li>
              <strong>Security officers:</strong> the device description, the registered owner’s name and student ID, and
              the status — only at the moment they scan. No email, no phone, no serial number.
            </li>
            <li>
              <strong>Administrators:</strong> aggregated incident data, plus individual records when handling a specific
              report. Pulling a person’s scan history requires a written justification that is permanently recorded.
            </li>
            <li>
              <strong>Finders:</strong> nothing about you. They are told to hand the device in.
            </li>
          </ul>
        </Card>

        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">How long we keep it</h2>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>Scan records: deleted automatically after the period set by your university (90 days by default).</li>
            <li>Reports: kept for institutional records, then stripped of narrative fields that identify people.</li>
            <li>Audit logs: kept for several years — they are the evidence that the system was not misused.</li>
            <li>Account data: until you delete your account.</li>
          </ul>
        </Card>

        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">Where it is stored</h2>
          <p className="mt-1">
            CampusGuard is designed to run on a PostgreSQL database hosted inside Ethiopia, in line with Article 22 of the
            Personal Data Protection Proclamation No. 1321/2024. Personal data is not transferred outside the country as a
            matter of routine operation.
          </p>
        </Card>

        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">What we will never do</h2>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>Sell or share your data with advertisers or data brokers.</li>
            <li>Use scan records to build a picture of where you go or who you meet.</li>
            <li>Use the platform for academic or disciplinary monitoring.</li>
            <li>Treat an absence of registration as suspicion.</li>
          </ul>
        </Card>
      </div>

      <p className="mt-6 text-sm text-slate-500">
        See also:{' '}
        <Link href="/legal/data-rights" className="font-medium text-brand-700 hover:underline">
          your data rights
        </Link>{' '}
        ·{' '}
        <Link href="/legal/terms" className="font-medium text-brand-700 hover:underline">
          terms of use
        </Link>
      </p>
    </div>
  );
}
