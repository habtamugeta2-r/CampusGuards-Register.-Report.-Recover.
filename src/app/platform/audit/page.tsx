import { getPlatformPageSession } from '@/lib/auth';
import { listPlatformAudit } from '@/lib/repos/platform';
import { Card, CardHeader, EmptyState, PageHeader } from '@/components/ui';

export const metadata = { title: 'Platform audit · CampusGuard' };
export const dynamic = 'force-dynamic';

/**
 * Who did what to which tenant, from outside that tenant.
 *
 * Deliberately separate from each organisation's own audit log: a platform
 * operator's actions must be reviewable by someone who is not the operator's
 * own institution, and they must not be editable by a tenant administrator.
 */
export default async function PlatformAuditPage() {
  await getPlatformPageSession();
  const rows = await listPlatformAudit(200);

  return (
    <>
      <PageHeader
        title="Platform audit"
        description="Every action taken across tenants: creating, suspending, re-licensing. It records no personal data about students — that stays in each organisation’s own log."
      />

      <Card>
        <CardHeader title={`${rows.length} most recent actions`} />
        {rows.length === 0 ? (
          <EmptyState title="Nothing logged yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="th">When</th>
                  <th scope="col" className="th">Operator</th>
                  <th scope="col" className="th">Action</th>
                  <th scope="col" className="th">Organisation</th>
                  <th scope="col" className="th">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="td whitespace-nowrap">{new Date(row.created_at).toLocaleString('en-ET')}</td>
                    <td className="td">{row.actor_email}</td>
                    <td className="td">
                      <span className="code-chip">{row.action}</span>
                    </td>
                    <td className="td">{row.entity_type === 'institution' ? row.entity_id : '—'}</td>
                    <td className="td text-xs">
                      {typeof row.metadata === 'object' && row.metadata
                        ? Object.entries(row.metadata as Record<string, unknown>)
                            .map(([key, value]) => `${key}: ${String(value)}`)
                            .join(' · ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
