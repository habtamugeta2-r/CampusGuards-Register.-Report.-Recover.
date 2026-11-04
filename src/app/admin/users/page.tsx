import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listUsers } from '@/lib/repos/users';
import { UserRowActions } from '@/components/admin-forms';
import { Badge, Card, EmptyState, PageHeader, Table } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { ROLE_LABEL, memberLabels } from '@/lib/constants';
import type { Role, UserStatus } from '@/lib/types';

export const metadata = { title: 'People' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'neutral'> = {
  ACTIVE: 'ok',
  PENDING: 'neutral',
  SUSPENDED: 'warn',
  DISABLED: 'danger',
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const session = await getPageSession(['ADMIN']);
  const { q, role } = await searchParams;
  const labels = memberLabels(session.institution.kind);

  const { rows, total } = await listUsers(session.institution.id, {
    search: q,
    role: (role as Role | 'ALL') ?? 'ALL',
    limit: 100,
  });

  return (
    <AppShell roles={['ADMIN']}>
      <PageHeader
        title="People"
        description={`${total} account${total === 1 ? '' : 's'}. Role changes sign the user out everywhere immediately.`}
      />

      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input
          aria-label={`Search name, email or ${labels.idLabel.toLowerCase()}`}
          name="q"
          defaultValue={q ?? ''}
          className="input max-w-sm"
          placeholder={`Search name, email or ${labels.idLabel.toLowerCase()}`}
        />
        <select aria-label="Filter by role" name="role" className="select w-auto" defaultValue={role ?? 'ALL'}>
          <option value="ALL">All roles</option>
          <option value="STUDENT">{labels.plural}</option>
          <option value="SECURITY">Security officers</option>
          <option value="ADMIN">Administrators</option>
        </select>
        <button className="btn-secondary">Search</button>
      </form>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No accounts match" description="Try a different search." />
        ) : (
          <Table
            head={
              <>
                <th scope="col" className="th">Name</th>
                <th scope="col" className="th">University ID</th>
                <th scope="col" className="th">Devices</th>
                <th scope="col" className="th">Joined</th>
                <th scope="col" className="th">Status</th>
                <th scope="col" className="th">Role & actions</th>
              </>
            }
          >
            {rows.map((user) => (
              <tr key={user.id}>
                <td className="td">
                  <p className="font-medium text-slate-900">{user.full_name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </td>
                <td className="td">{user.student_id ?? '—'}</td>
                <td className="td tabular-nums">{user.product_count}</td>
                <td className="td whitespace-nowrap">{formatDate(user.created_at)}</td>
                <td className="td">
                  <Badge tone={STATUS_TONE[user.status as UserStatus] ?? 'neutral'}>{user.status.toLowerCase()}</Badge>
                </td>
                <td className="td">
                  <div className="mb-1 text-xs text-slate-500">{ROLE_LABEL[user.role]}</div>
                  <UserRowActions
                    userId={user.id}
                    name={user.full_name}
                    role={user.role}
                    status={user.status}
                    isSelf={user.id === session.user.id}
                  />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </AppShell>
  );
}
