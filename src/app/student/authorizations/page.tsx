import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listAuthorizationsForBorrower, listAuthorizationsForOwner } from '@/lib/repos/borrow';
import { RevokeAuthorizationButton } from '@/components/forms';
import { Card, CardHeader, EmptyState, PageHeader, Table } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: 'Borrowing' };
export const dynamic = 'force-dynamic';

export default async function AuthorizationsPage() {
  const session = await getPageSession(['STUDENT']);
  const [granted, received] = await Promise.all([
    listAuthorizationsForOwner(session.user.id),
    listAuthorizationsForBorrower(session.user.id),
  ]);

  return (
    <AppShell roles={['STUDENT']}>
      <PageHeader
        title="Borrowing"
        description="Lending a laptop to a classmate is normal. Recording it here keeps a checkpoint scan from turning a loan into an incident."
      />

      <Card className="mb-6">
        <CardHeader
          title="Devices you have lent out"
          subtitle="These students can carry your device without triggering an alert."
        />
        {granted.length === 0 ? (
          <EmptyState title="Nothing lent out" description="Open a device and choose “authorise borrower” to add one." />
        ) : (
          <Table
            head={
              <>
                <th className="th">Device</th>
                <th className="th">Borrower</th>
                <th className="th">Until</th>
                <th className="th">Reason</th>
                <th className="th" />
              </>
            }
          >
            {granted.map((authorization) => (
              <tr key={authorization.id}>
                <td className="td">{authorization.product_label}</td>
                <td className="td">
                  {authorization.borrower_name}
                  {authorization.borrower_student_id ? (
                    <span className="ml-1 text-xs text-slate-500">({authorization.borrower_student_id})</span>
                  ) : null}
                </td>
                <td className="td whitespace-nowrap">{formatDateTime(authorization.ends_at)}</td>
                <td className="td">{authorization.reason ?? '—'}</td>
                <td className="td text-right">
                  {authorization.revoked_at ? (
                    <span className="text-xs text-slate-400">Revoked</span>
                  ) : (
                    <RevokeAuthorizationButton authorizationId={authorization.id} />
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Devices lent to you"
          subtitle="If an officer scans one of these, they will see that the owner authorised you."
        />
        {received.length === 0 ? (
          <EmptyState title="Nothing borrowed" description="Devices other students have shared with you appear here." />
        ) : (
          <Table
            head={
              <>
                <th className="th">Device</th>
                <th className="th">Owner</th>
                <th className="th">Until</th>
                <th className="th">Reason</th>
              </>
            }
          >
            {received.map((authorization) => (
              <tr key={authorization.id}>
                <td className="td">{authorization.product_label}</td>
                <td className="td">{authorization.owner_name}</td>
                <td className="td whitespace-nowrap">{formatDateTime(authorization.ends_at)}</td>
                <td className="td">{authorization.reason ?? '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </AppShell>
  );
}
