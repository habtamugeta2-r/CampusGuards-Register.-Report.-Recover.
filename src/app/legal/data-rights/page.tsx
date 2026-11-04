import Link from 'next/link';
import { Card, PageHeader } from '@/components/ui';

export const metadata = { title: 'Your data rights' };

const RIGHTS = [
  {
    title: 'Access',
    body: 'Ask what data we hold about you. In the app, My data → Download my data (JSON) produces a complete export immediately.',
  },
  {
    title: 'Correction',
    body: 'If something is wrong — a misspelled name, the wrong department — ask for it to be corrected.',
  },
  {
    title: 'Deletion',
    body: 'Ask for your account and records to be erased. The university may need to keep a minimal record of an incident it investigated; erasure requests are handled case by case and you will be told the outcome.',
  },
  {
    title: 'Objection',
    body: 'Object to a specific use of your data. Registration is voluntary, and you can deregister a device or withdraw from the platform entirely.',
  },
  {
    title: 'Withdrawing consent',
    body: 'You can withdraw at any time. Withdrawing does not make processing that already happened unlawful, but it stops future processing.',
  },
];

export default function DataRightsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Your data rights"
        description="Rights you have under Ethiopia’s Personal Data Protection Proclamation No. 1321/2024, and how to exercise them in CampusGuard."
      />

      <div className="space-y-4">
        {RIGHTS.map((right) => (
          <Card key={right.title} className="card-pad">
            <h2 className="text-base font-semibold text-slate-900">{right.title}</h2>
            <p className="mt-1 text-sm text-slate-700">{right.body}</p>
          </Card>
        ))}
      </div>

      <Card className="card-pad mt-6">
        <h2 className="text-base font-semibold text-slate-900">How to make a request</h2>
        <p className="mt-1 text-sm text-slate-700">
          Signed in, go to <strong>My data → Make a data request</strong>. Requests are routed to the university’s data
          controller and appear in the audit log. You can also make a request in person at your university’s registrar or
          ICT office — the software is only one channel, not the only one.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          If you are not satisfied with the response, you may complain to the Ethiopian Communications Authority, which
          supervises the Proclamation.
        </p>
      </Card>

      <p className="mt-6 text-sm text-slate-500">
        <Link href="/legal/privacy" className="font-medium text-brand-700 hover:underline">
          Privacy notice
        </Link>
      </p>
    </main>
  );
}
