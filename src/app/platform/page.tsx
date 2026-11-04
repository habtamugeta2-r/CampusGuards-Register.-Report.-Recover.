import Link from 'next/link';
import { getPlatformPageSession } from '@/lib/auth';
import { listInstitutionRows, platformOverview } from '@/lib/repos/platform';
import { Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from '@/components/ui';
import { INSTITUTION_KIND_LABEL, INSTITUTION_STATUS_LABEL } from '@/lib/constants';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'Platform overview' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'info' | 'neutral'> = {
  ACTIVE: 'ok',
  TRIAL: 'info',
  SUSPENDED: 'warn',
  CLOSED: 'danger',
};

export default async function PlatformOverviewPage() {
  await getPlatformPageSession();
  const [overview, institutions] = await Promise.all([platformOverview(), listInstitutionRows()]);

  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Every organisation on this deployment, and the shape of the deployment itself. Counts only — no names, devices or scans from inside a tenant appear here."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Organisations" value={overview.organisations} />
        <Stat label="People" value={overview.people} hint="accounts across all tenants" />
        <Stat label="Devices" value={overview.devices} />
        <Stat label="Scans (30 days)" value={overview.scans30d} />
        <Stat
          label="Applications"
          value={overview.pendingRequests}
          tone={overview.pendingRequests > 0 ? 'warn' : 'neutral'}
          hint={overview.pendingRequests > 0 ? 'awaiting review' : 'none waiting'}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Organisation types" subtitle="The platform is not higher-education-only." />
          <div className="px-4 py-3 sm:px-6">
            {overview.organisationsByKind.length === 0 ? (
              <p className="muted">No organisations yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {overview.organisationsByKind.map((row) => (
                  <li key={row.kind} className="flex items-center justify-between gap-3">
                    <span className="text-slate-700">{INSTITUTION_KIND_LABEL[row.kind] ?? row.kind}</span>
                    <span className="font-medium tabular-nums text-slate-900">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Countries" subtitle="Each is a data-residency obligation, not just a label." />
          <div className="px-4 py-3 sm:px-6">
            <ul className="space-y-1.5 text-sm">
              {overview.organisationsByCountry.map((row) => (
                <li key={row.country} className="flex items-center justify-between gap-3">
                  <span className="text-slate-700">{row.country}</span>
                  <span className="font-medium tabular-nums text-slate-900">{row.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card>
          <CardHeader title="Licences expiring" subtitle="Next 60 days" />
          <div className="px-4 py-3 sm:px-6">
            {overview.expiringLicences.length === 0 ? (
              <p className="muted">Nothing expiring in the next 60 days.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {overview.expiringLicences.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3">
                    <Link href={`/platform/organisations`} className="text-slate-700 hover:underline">
                      {row.name}
                    </Link>
                    <span className="font-medium text-slate-900">{formatDate(row.expiresAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Organisations"
          subtitle={`${institutions.length} on this deployment`}
          action={
            <Link href="/platform/organisations" className="btn-secondary btn-sm">
              Manage
            </Link>
          }
        />
        {institutions.length === 0 ? (
          <EmptyState
            title="No organisations yet"
            description="Create the first one, or wait for an application to arrive."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="th">Organisation</th>
                  <th scope="col" className="th">Type</th>
                  <th scope="col" className="th">Domains</th>
                  <th scope="col" className="th">Region</th>
                  <th scope="col" className="th">People</th>
                  <th scope="col" className="th">Devices</th>
                  <th scope="col" className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {institutions.map((row) => (
                  <tr key={row.id}>
                    <td className="td">
                      <span className="font-medium text-slate-900">{row.name}</span>
                      <br />
                      <span className="text-xs text-slate-500">{row.code}</span>
                    </td>
                    <td className="td">{INSTITUTION_KIND_LABEL[row.kind] ?? row.kind}</td>
                    <td className="td text-xs">
                      {row.domains?.join(', ') || '—'}
                    </td>
                    <td className="td">
                      {row.data_region}
                      {row.country !== row.data_region ? <span className="block text-xs text-slate-500">{row.country}</span> : null}
                    </td>
                    <td className="td tabular-nums">
                      {row.people}
                      {row.seat_limit ? <span className="text-slate-500"> / {row.seat_limit}</span> : null}
                    </td>
                    <td className="td tabular-nums">{row.devices}</td>
                    <td className="td">
                      <Badge tone={STATUS_TONE[row.status] ?? 'neutral'}>
                        {INSTITUTION_STATUS_LABEL[row.status] ?? row.status}
                      </Badge>
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
