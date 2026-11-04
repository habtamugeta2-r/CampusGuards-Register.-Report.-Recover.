import Link from 'next/link';
import { ShieldIcon } from '@/components/nav';
import { Alert, Card } from '@/components/ui';
import { getUser, roleHome } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const CAPABILITIES = [
  {
    title: 'Register',
    body: 'Add a laptop, phone, tablet or instrument to your university account and print a QR label for it. The code contains a random token — never your name or ID.',
  },
  {
    title: 'Report',
    body: 'When something goes missing, file one report. Security and the lost-property desk see it immediately, instead of hearing about it days later.',
  },
  {
    title: 'Recover',
    body: 'Anyone who finds a labelled device can scan it. They see “this device has been reported missing — please hand it in”, without ever seeing your contact details.',
  },
];

const LIMITS = [
  'CampusGuard does not prevent theft. It creates the record that makes recovery possible.',
  'It does not track your device’s location. There is no GPS in the system.',
  'A scan result is information, not a verdict. No one is detained or accused on the basis of a screen.',
  'Registration is voluntary — and an unregistered device is not a suspicious device.',
];

export default async function HomePage() {
  const session = await getUser();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldIcon className="h-7 w-7 text-brand-700" />
          <span className="text-base font-semibold tracking-tight">CampusGuard</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/found" className="btn-secondary btn-sm">
            I found a device
          </Link>
          {session ? (
            <Link href={roleHome(session.role)} className="btn-primary btn-sm">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-secondary btn-sm">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary btn-sm">
                Register
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mt-12 max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-700">Register. Report. Recover.</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          A campus property registry that helps a university return what goes missing.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Thousands of students carry laptops, phones and instruments through shared spaces every day. When something
          disappears, the failure is rarely technical — it is that nobody holds a record connecting the student, the
          device, the report and the person who eventually finds it.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/register" className="btn-primary">
            Register a device
          </Link>
          <Link href="/found" className="btn-secondary">
            Report a found device
          </Link>
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {CAPABILITIES.map((item) => (
          <Card key={item.title} className="card-pad">
            <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-1.5 text-sm text-slate-600">{item.body}</p>
          </Card>
        ))}
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">What this is not</h2>
          <p className="mt-1 text-sm text-slate-600">
            Overselling a security tool destroys trust the first time it fails to stop a theft. These are the honest
            boundaries of the system.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {LIMITS.map((limit) => (
              <li key={limit} className="flex gap-2">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                {limit}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">How a recovery actually happens</h2>
          <ol className="mt-3 space-y-2 text-sm text-slate-700">
            <li>
              <span className="font-medium">1.</span> Abel’s laptop goes missing from the library. He reports it in
              CampusGuard with the last place he saw it.
            </li>
            <li>
              <span className="font-medium">2.</span> The device’s status changes to <em>reported missing</em> and the
              security office is notified.
            </li>
            <li>
              <span className="font-medium">3.</span> Hana finds it an hour later and scans the label with her phone
              camera.
            </li>
            <li>
              <span className="font-medium">4.</span> She is told to hand it in — and never sees Abel’s name, phone
              number or email.
            </li>
            <li>
              <span className="font-medium">5.</span> The desk logs the hand-in. Abel gets a notification telling him
              where to collect it.
            </li>
          </ol>
        </Card>
      </section>

      <section className="mt-10">
        <Alert tone="info" title="Built for Ethiopian universities">
          Data is stored in a PostgreSQL database designed to be hosted inside Ethiopia, in line with Article 22 of the
          Personal Data Protection Proclamation No. 1321/2024. Scan records are retained for a short, configurable
          window and are never used for movement analysis.
        </Alert>
      </section>

      <footer className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
        <p>
          <Link href="/legal/privacy" className="hover:underline">
            Privacy notice
          </Link>{' '}
          ·{' '}
          <Link href="/legal/data-rights" className="hover:underline">
            Your data rights
          </Link>{' '}
          ·{' '}
          <Link href="/legal/terms" className="hover:underline">
            Terms of use
          </Link>
        </p>
      </footer>
    </div>
  );
}
