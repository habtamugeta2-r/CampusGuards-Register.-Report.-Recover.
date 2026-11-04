import { AppShell } from '@/components/app-shell';
import { Alert, Card, PageHeader } from '@/components/ui';

export const metadata = { title: 'Guidance' };
export const dynamic = 'force-dynamic';

const PRINCIPLES = [
  {
    title: 'A scan result is information, not a verdict',
    body: 'No student may be detained, searched publicly, or have property confiscated because of what appears on this screen. Every result requires human judgement and, where it escalates, a supervisor.',
  },
  {
    title: 'Unregistered is not suspicious',
    body: 'Registration is voluntary. Most unregistered devices belong to students who simply have not signed up. Note the scan and let them through.',
  },
  {
    title: 'Check the ID only when you need to',
    body: 'Carrier identity is recorded only when you tick “I checked a university ID card”. If you do not check an ID, no name is stored against the scan — that is by design.',
  },
  {
    title: 'Scan for spot checks, not queues',
    body: 'Verification is for spot checks and specific situations. If scanning starts to build a queue, stop and tell your supervisor: a scan that delays everyone is worse than no scan at all.',
  },
  {
    title: 'Someone who finds a device is not a thief',
    body: 'A device with an open missing report may be carried by a finder on their way to hand it in. Ask, do not accuse.',
  },
];

export default function SecurityGuidancePage() {
  return (
    <AppShell roles={['SECURITY', 'ADMIN']}>
      <PageHeader
        title="Officer guidance"
        description="The rules that keep this system trustworthy. If a procedure at your checkpoint conflicts with these principles, escalate rather than improvise."
      />

      <div className="space-y-3">
        {PRINCIPLES.map((principle, index) => (
          <Card key={principle.title} className="card-pad">
            <h2 className="text-sm font-semibold text-slate-900">
              <span className="mr-2 text-slate-400">{index + 1}.</span>
              {principle.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{principle.body}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Alert tone="info" title="If the system is wrong">
          Record what happened, keep the encounter calm, and report the incident to your supervisor. False alerts are
          tracked as a pilot metric precisely so that the rules can be corrected rather than defended.
        </Alert>
      </div>
    </AppShell>
  );
}
