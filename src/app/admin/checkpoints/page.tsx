import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listCheckpoints } from '@/lib/repos/misc';
import { CheckpointForm, CheckpointToggle } from '@/components/admin-forms';
import { Badge, Card, CardHeader, EmptyState, PageHeader, Table } from '@/components/ui';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'Checkpoints' };
export const dynamic = 'force-dynamic';

export default async function AdminCheckpointsPage() {
  const session = await getPageSession(['ADMIN']);
  const checkpoints = await listCheckpoints(session.institution.id);

  return (
    <AppShell roles={['ADMIN']}>
      <PageHeader
        title="Checkpoints"
        description="Where verification happens. Fewer, well-chosen checkpoints beat a checkpoint on every door."
      />

      <Card className="mb-6">
        <CardHeader title="Add a checkpoint" />
        <div className="p-4">
          <CheckpointForm />
        </div>
      </Card>

      <Card>
        {checkpoints.length === 0 ? (
          <EmptyState title="No checkpoints yet" description="Add the place where officers will actually scan." />
        ) : (
          <Table
            head={
              <>
                <th className="th">Name</th>
                <th className="th">Location</th>
                <th className="th">Created</th>
                <th className="th">Status</th>
                <th className="th" />
              </>
            }
          >
            {checkpoints.map((checkpoint) => (
              <tr key={checkpoint.id}>
                <td className="td font-medium text-slate-900">{checkpoint.name}</td>
                <td className="td">{checkpoint.location ?? '—'}</td>
                <td className="td whitespace-nowrap">{formatDate(checkpoint.created_at)}</td>
                <td className="td">
                  <Badge tone={checkpoint.is_active ? 'ok' : 'neutral'}>{checkpoint.is_active ? 'Active' : 'Inactive'}</Badge>
                </td>
                <td className="td text-right">
                  <CheckpointToggle checkpointId={checkpoint.id} isActive={checkpoint.is_active} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </AppShell>
  );
}
