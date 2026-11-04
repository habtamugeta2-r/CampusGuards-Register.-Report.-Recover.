import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listConsents, listDataSubjectRequests } from '@/lib/repos/misc';
import { ChangePasswordForm, DataRequestForm } from '@/components/forms';
import { ExportDataButton } from '@/components/export-data-button';
import { Alert, Badge, Card, CardHeader, PageHeader, Table } from '@/components/ui';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'My data' };
export const dynamic = 'force-dynamic';

const STORED = [
  ['Account', 'Name, university email, password hash, optional phone number', 'Until you delete your account'],
  ['Student profile', 'University ID number, department, year', 'Until you delete your account'],
  ['Devices', 'Type, brand, model, colour, serial number, distinguishing marks, your notes', 'Until you remove the device'],
  ['QR tokens', 'The random code printed on each label', 'Until the label is replaced'],
  ['Reports', 'What happened, where you last had the device, when', 'Anonymised after the retention period below'],
  ['Scan records', 'Which of your devices was scanned, at which checkpoint, and whether an ID was checked', 'Deleted after the scan retention period'],
  ['Audit trail', 'Who accessed your records and why', 'Kept for the audit retention period'],
];

export default async function StudentPrivacyPage() {
  const session = await getPageSession();
  const [consents, requests] = await Promise.all([
    listConsents(session.user.id),
    listDataSubjectRequests(session.user.id),
  ]);

  return (
    <AppShell>
      <PageHeader
        title="My data"
        description="What CampusGuard holds about you, how long it is kept, and how to get it back or have it removed."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="What we store" subtitle="Nothing on this list is shared with advertisers or used for marketing." />
            <Table
              head={
                <>
                  <th scope="col" className="th">What</th>
                  <th scope="col" className="th">Details</th>
                  <th scope="col" className="th">Kept for</th>
                </>
              }
            >
              {STORED.map(([what, details, retention]) => (
                <tr key={what}>
                  <td className="td font-medium text-slate-900">{what}</td>
                  <td className="td">{details}</td>
                  <td className="td">{retention}</td>
                </tr>
              ))}
            </Table>
          </Card>

          <Card className="card-pad">
            <h2 className="text-base font-semibold text-slate-900">Scan records are short-lived</h2>
            <p className="mt-1 text-sm text-slate-600">
              A checkpoint scan records the device, the checkpoint and the time. It records your name only when an officer
              actually checks your ID card — and never your email, phone number or serial number. Scans are deleted
              automatically after {session.institution.scan_retention_days} days and are never used to build a picture of
              where you go.
            </p>
            <div className="mt-3">
              <Alert tone="info" title="You can ask for any of it">
                Export everything as JSON, request a correction, or ask for deletion. The university, not CampusGuard, is
                the data controller for your records — requests go to them and are logged.
              </Alert>
            </div>
            <div className="mt-4">
              <ExportDataButton />
            </div>
          </Card>

          <Card className="card-pad">
            <h2 className="text-base font-semibold text-slate-900">Make a data request</h2>
            <p className="mt-1 text-sm text-slate-600">
              Under Ethiopia’s Personal Data Protection Proclamation No. 1321/2024 you may request access to, correction
              of, or deletion of your personal data.
            </p>
            <div className="mt-3">
              <DataRequestForm />
            </div>
            {requests.length ? (
              <div className="mt-4">
                <Table
                  head={
                    <>
                      <th scope="col" className="th">Request</th>
                      <th scope="col" className="th">Status</th>
                      <th scope="col" className="th">Filed</th>
                    </>
                  }
                >
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td className="td">{request.kind}</td>
                      <td className="td">
                        <Badge tone={request.status === 'COMPLETED' ? 'ok' : 'neutral'}>{request.status}</Badge>
                      </td>
                      <td className="td">{formatDate(request.created_at)}</td>
                    </tr>
                  ))}
                </Table>
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="card-pad">
            <h2 className="text-base font-semibold text-slate-900">Consent</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {consents.map((consent) => (
                <li key={`${consent.type}-${consent.created_at}`} className="flex items-center justify-between gap-2">
                  <span className="text-slate-700">{consent.type.replace(/_/g, ' ').toLowerCase()}</span>
                  <Badge tone={consent.accepted ? 'ok' : 'neutral'}>
                    {consent.accepted ? 'accepted' : 'declined'} · v{consent.version}
                  </Badge>
                </li>
              ))}
              {!consents.length ? <li className="text-slate-500">No consent records on file.</li> : null}
            </ul>
          </Card>

          <Card className="card-pad">
            <h2 className="text-base font-semibold text-slate-900">Password</h2>
            <div className="mt-3">
              <ChangePasswordForm />
            </div>
          </Card>

          <Card className="card-pad">
            <h2 className="text-base font-semibold text-slate-900">Retention at {session.institution.code}</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              <li>Scan records: {session.institution.scan_retention_days} days</li>
              <li>Reports: anonymised after {session.institution.report_retention_days} days</li>
              <li>Audit logs: {session.institution.audit_retention_days} days</li>
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
