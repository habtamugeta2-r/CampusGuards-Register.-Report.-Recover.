import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listAuditLogs } from '@/lib/repos/misc';
import { Badge, Card, EmptyState, PageHeader, Table } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: 'Audit log' };
export const dynamic = 'force-dynamic';

const ACTION_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'info' | 'neutral'> = {
  'scan.history.access': 'warn',
  'user.delete': 'danger',
  'user.update': 'warn',
  'report.missing.resolve': 'info',
  'product.qr_rotate': 'info',
  'admin.export': 'warn',
  'data_subject.request': 'info',
  'auth.login_failed': 'danger',
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityId?: string }>;
}) {
  const session = await getPageSession(['ADMIN']);
  const { action, entityId } = await searchParams;

  const { rows, total } = await listAuditLogs(session.institution.id, {
    action,
    entityId,
    limit: 100,
  });

  return (
    <AppShell roles={['ADMIN']}>
      <PageHeader
        title="Audit log"
        description={`${total} recorded action${total === 1 ? '' : 's'}. Rows cannot be edited or deleted except by the retention job.`}
      />

      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input name="action" defaultValue={action ?? ''} className="input max-w-xs" placeholder="Filter by action (e.g. scan.verify)" />
        <input name="entityId" defaultValue={entityId ?? ''} className="input max-w-xs" placeholder="Filter by record ID" />
        <button className="btn-secondary">Filter</button>
      </form>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No audit entries match" description="Every sensitive action is recorded here." />
        ) : (
          <Table
            head={
              <>
                <th className="th">When</th>
                <th className="th">Action</th>
                <th className="th">Actor</th>
                <th className="th">Record</th>
                <th className="th">Justification</th>
              </>
            }
          >
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="td whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                <td className="td">
                  <Badge tone={ACTION_TONE[row.action] ?? 'neutral'}>{row.action}</Badge>
                </td>
                <td className="td">
                  {row.actor_name ?? 'System / public'}
                  {row.actor_role ? <span className="ml-1 text-xs text-slate-500">({row.actor_role.toLowerCase()})</span> : null}
                </td>
                <td className="td text-xs">
                  {row.entity_type ? (
                    <>
                      {row.entity_type}
                      {row.entity_id ? <span className="ml-1 font-mono text-slate-500">{row.entity_id.slice(0, 18)}</span> : null}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="td">{row.justification ?? '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </AppShell>
  );
}
