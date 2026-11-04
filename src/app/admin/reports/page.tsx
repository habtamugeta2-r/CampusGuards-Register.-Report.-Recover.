import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listMissingReports } from '@/lib/repos/reports';
import { ResolveReportForm } from '@/components/admin-forms';
import { Badge, Card, EmptyState, PageHeader, Table } from '@/components/ui';
import { formatDateTime, hoursBetween } from '@/lib/format';
import type { MissingReportStatus, ReportCategory } from '@/lib/types';

export const metadata = { title: 'Reports' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'neutral' | 'info'> = {
  OPEN: 'danger',
  RESOLVED_RECOVERED: 'ok',
  CLOSED_UNFOUND: 'neutral',
  WITHDRAWN: 'neutral',
  FALSE_REPORT: 'warn',
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await getPageSession(['ADMIN', 'SECURITY']);
  const { status, q } = await searchParams;

  const { rows } = await listMissingReports(session.institution.id, {
    status: (status as MissingReportStatus | 'ALL') ?? 'ALL',
    search: q,
    limit: 100,
  });

  const tabs: Array<[string, string]> = [
    ['ALL', 'All'],
    ['OPEN', 'Open'],
    ['RESOLVED_RECOVERED', 'Recovered'],
    ['CLOSED_UNFOUND', 'Not found'],
    ['FALSE_REPORT', 'False reports'],
  ];

  return (
    <AppShell roles={['ADMIN', 'SECURITY']}>
      <PageHeader
        title="Missing-item reports"
        description="Close a report with a real outcome — the recovery figures depend on it. Each outcome is audited and the owner is told."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([value, label]) => {
          const params = new URLSearchParams();
          params.set('status', value);
          if (q) params.set('q', q);
          const active = (status ?? 'ALL') === value;
          return (
            <a
              key={value}
              href={`/admin/reports?${params.toString()}`}
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium ${
                active ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </a>
          );
        })}
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="Nothing here" description="No reports match this filter." />
        ) : (
          <Table
            head={
              <>
                <th scope="col" className="th">Device</th>
                <th scope="col" className="th">Owner</th>
                <th scope="col" className="th">What happened</th>
                <th scope="col" className="th">Last seen</th>
                <th scope="col" className="th">Filed</th>
                <th scope="col" className="th">Status</th>
                <th scope="col" className="th">Action</th>
              </>
            }
          >
            {rows.map((report) => (
              <tr key={report.id}>
                <td className="td">
                  <p className="font-medium text-slate-900">
                    {report.brand} {report.model}
                  </p>
                  <p className="text-xs text-slate-500">{report.product_type}</p>
                </td>
                <td className="td">
                  <p className="text-slate-800">{report.owner_name}</p>
                  <p className="text-xs text-slate-500">{report.owner_student_id ?? report.owner_email}</p>
                </td>
                <td className="td">{(report.category as ReportCategory).toLowerCase()}</td>
                <td className="td">{report.last_known_location ?? '—'}</td>
                <td className="td whitespace-nowrap">
                  {formatDateTime(report.reported_at)}
                  {report.resolved_at ? (
                    <p className="text-xs text-slate-500">
                      closed in {hoursBetween(report.reported_at, report.resolved_at)} h
                    </p>
                  ) : null}
                </td>
                <td className="td">
                  <Badge tone={STATUS_TONE[report.status] ?? 'neutral'}>
                    {report.status.replace(/_/g, ' ').toLowerCase()}
                  </Badge>
                  {report.resolution_notes ? (
                    <p className="mt-1 max-w-xs text-xs text-slate-500">{report.resolution_notes}</p>
                  ) : null}
                </td>
                <td className="td">
                  {report.status === 'OPEN' ? <ResolveReportForm reportId={report.id} /> : <span className="text-xs text-slate-500">Closed</span>}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </AppShell>
  );
}
