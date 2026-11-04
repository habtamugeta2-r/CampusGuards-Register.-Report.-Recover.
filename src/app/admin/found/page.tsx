import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listFoundReports, listMissingReports } from '@/lib/repos/reports';
import { FoundActionForm } from '@/components/admin-forms';
import { Alert, Badge, Card, EmptyState, PageHeader, Table } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: 'Found items' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'info' | 'neutral'> = {
  PENDING: 'warn',
  MATCHED: 'info',
  RETURNED: 'ok',
  DISPOSED: 'neutral',
};

export default async function AdminFoundPage() {
  const session = await getPageSession(['ADMIN', 'SECURITY']);
  const [found, missing] = await Promise.all([
    listFoundReports(session.institution.id, { limit: 100 }),
    listMissingReports(session.institution.id, { status: 'OPEN', limit: 100 }),
  ]);

  const openOptions = missing.rows.map((report) => ({
    id: report.id,
    label: `${report.brand} ${report.model} · ${report.owner_name}`,
  }));

  return (
    <AppShell roles={['ADMIN', 'SECURITY']}>
      <PageHeader
        title="Found items"
        description="The lost-property desk queue. Matching a found device to an open report is the moment the whole system earns its keep."
      />

      <div className="mb-4">
        <Alert tone="info" title="Never pass on the finder’s contact details">
          The owner is told their device was found and where to collect it. The finder’s name and contact details stay
          with the desk — handing them out invites harassment and social engineering.
        </Alert>
      </div>

      <Card>
        {found.rows.length === 0 ? (
          <EmptyState title="Nothing handed in" description="Items found on campus appear here as soon as someone reports them." />
        ) : (
          <Table
            head={
              <>
                <th className="th">Device</th>
                <th className="th">Owner on file</th>
                <th className="th">Where it was found</th>
                <th className="th">Handed in</th>
                <th className="th">Status</th>
                <th className="th">Action</th>
              </>
            }
          >
            {found.rows.map((report) => (
              <tr key={report.id}>
                <td className="td">
                  <p className="font-medium text-slate-900">{report.product_label ?? 'Unregistered item'}</p>
                  {report.description ? <p className="max-w-xs text-xs text-slate-500">{report.description}</p> : null}
                </td>
                <td className="td">
                  {report.owner_name ? (
                    <>
                      <p className="text-slate-800">{report.owner_name}</p>
                      <p className="text-xs text-slate-500">{report.owner_student_id ?? report.owner_email}</p>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">No label — cannot identify owner</span>
                  )}
                </td>
                <td className="td">{report.location ?? '—'}</td>
                <td className="td whitespace-nowrap">{formatDateTime(report.found_at)}</td>
                <td className="td">
                  <Badge tone={STATUS_TONE[report.status] ?? 'neutral'}>{report.status.toLowerCase()}</Badge>
                  {report.custody_location ? (
                    <p className="mt-1 text-xs text-slate-500">{report.custody_location}</p>
                  ) : null}
                </td>
                <td className="td">
                  {report.status === 'RETURNED' || report.status === 'DISPOSED' ? (
                    <span className="text-xs text-slate-400">Done</span>
                  ) : (
                    <FoundActionForm
                      foundId={report.id}
                      hasMatch={Boolean(report.matched_missing_report_id)}
                      missingReports={openOptions}
                    />
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </AppShell>
  );
}
