import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listMissingReportsForOwner } from '@/lib/repos/reports';
import { Badge, Card, EmptyState, LinkButton, PageHeader, Table } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: 'Reports' };
export const dynamic = 'force-dynamic';

const STATUS: Record<string, { tone: 'ok' | 'warn' | 'danger' | 'neutral'; label: string }> = {
  OPEN: { tone: 'danger', label: 'Open' },
  RESOLVED_RECOVERED: { tone: 'ok', label: 'Recovered' },
  CLOSED_UNFOUND: { tone: 'neutral', label: 'Closed, not found' },
  WITHDRAWN: { tone: 'neutral', label: 'Withdrawn' },
  FALSE_REPORT: { tone: 'warn', label: 'False report' },
};

export default async function StudentReportsPage() {
  const session = await getPageSession(['STUDENT']);
  const reports = await listMissingReportsForOwner(session.user.id);

  return (
    <AppShell roles={['STUDENT']}>
      <PageHeader
        title="Your reports"
        description="Every missing-item report you have filed. Security sees these the moment you file them."
        action={
          <Link href="/student/reports/new" className="btn-primary">
            Report something missing
          </Link>
        }
      />

      <Card>
        {reports.length === 0 ? (
          <EmptyState
            title="No reports"
            description="If a device goes missing, file a report here so that every checkpoint and the lost-property desk know to look for it."
            action={
              <Link href="/student/reports/new" className="btn-primary">
                Report something missing
              </Link>
            }
          />
        ) : (
          <Table
            head={
              <>
                <th className="th">Device</th>
                <th className="th">What happened</th>
                <th className="th">Last seen</th>
                <th className="th">Filed</th>
                <th className="th">Status</th>
              </>
            }
          >
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="td font-medium text-slate-900">{report.brand} {report.model}</td>
                <td className="td">{report.category.charAt(0) + report.category.slice(1).toLowerCase()}</td>
                <td className="td">{report.last_known_location ?? '—'}</td>
                <td className="td whitespace-nowrap">{formatDateTime(report.reported_at)}</td>
                <td className="td">
                  <Badge tone={STATUS[report.status]?.tone ?? 'neutral'}>{STATUS[report.status]?.label ?? report.status}</Badge>
                  {report.resolution_notes ? (
                    <p className="mt-1 max-w-xs text-xs text-slate-500">{report.resolution_notes}</p>
                  ) : null}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="mt-4">
        <LinkButton href="/student">Back to overview</LinkButton>
      </div>
    </AppShell>
  );
}
