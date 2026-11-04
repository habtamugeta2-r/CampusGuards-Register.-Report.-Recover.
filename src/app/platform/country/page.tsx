import { Badge, Card, CardHeader, EmptyState, PageHeader, Stat, Table } from '@/components/ui';
import { countryScopeFor, getPlatformShellSession } from '@/lib/auth';
import { countryOverview } from '@/lib/repos/platform';
import { INSTITUTION_KIND_LABEL, INSTITUTION_STATUS_LABEL } from '@/lib/constants';

export const metadata = { title: 'Country · CampusGuard' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'info' | 'neutral'> = {
  ACTIVE: 'ok',
  TRIAL: 'info',
  SUSPENDED: 'warn',
  CLOSED: 'danger',
};

/**
 * The country scoreboard.
 *
 * A ministry or a federation needs to know whether the platform is working
 * across a country: how many organisations have joined, how many people and
 * devices they hold, how often checkpoints are used, and what share of
 * reported losses end in a recovery.
 *
 * It does not need — and is not given — a single person. Every number here is
 * an aggregate; the per-organisation rows are the smallest unit this screen
 * resolves to, and they stop at counts.
 */
export default async function CountryPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const session = await getPlatformShellSession();
  const { country: requested } = await searchParams;
  const country = countryScopeFor(session, requested ?? null);
  const overview = await countryOverview(country);

  return (
    <>
      <PageHeader
        title={`${country} · national view`}
        description={
          session.platformRole === 'COUNTRY_ADMIN'
            ? `Every organisation on CampusGuard in ${country}. Counts only: this view cannot open a tenant, and it never shows a person.`
            : `How the platform is doing across ${country}. Counts per organisation, totals for the country — never a person or a device.`
        }
      />

      {overview.matchedOrganisations === 0 ? (
        <EmptyState
          title={`No organisations in ${country}`}
          description={
            session.platformRole === 'COUNTRY_ADMIN'
              ? 'Your grant is scoped to this country and nothing here matches it. Country is free text on both the tenant and your grant, so a spelling difference is the usual cause.'
              : 'No tenant records this country yet.'
          }
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Organisations" value={overview.totals.organisations} />
        <Stat label="People" value={overview.totals.people} hint="accounts across every organisation" />
        <Stat label="Devices registered" value={overview.totals.devices} />
        <Stat label="Checkpoint scans" value={overview.totals.scans30d} hint="last 30 days" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label="Open loss reports" value={overview.totals.reportsOpen} />
        <Stat label="Recovered" value={overview.totals.reportsRecovered} />
        <Stat
          label="Recovery rate"
          value={`${overview.totals.recoveryRate}%`}
          hint="recovered out of every report that has closed"
          tone={overview.totals.recoveryRate >= 50 ? 'ok' : 'neutral'}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Organisations"
            subtitle="Adoption and outcome by organisation. Nothing on this screen resolves to a person."
          />
          {overview.organisations.length === 0 ? (
            <div className="px-4 py-6 sm:px-6">
              <p className="muted">Nothing to show yet.</p>
            </div>
          ) : (
            <Table
              head={
                <>
                  <th scope="col" className="px-4 py-2 text-left font-medium sm:px-6">
                    Organisation
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Type
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    People
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Devices
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Scans 30d
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium sm:px-6">
                    Recovered
                  </th>
                </>
              }
            >
              {overview.organisations.map((org) => (
                <tr key={org.id}>
                  <td className="px-4 py-2.5 sm:px-6">
                    <span className="font-medium text-slate-900">{org.name}</span>
                    <span className="block text-xs text-slate-500">
                      {[org.code, org.city].filter(Boolean).join(' · ')}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">
                    {INSTITUTION_KIND_LABEL[org.kind] ?? org.kind}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={STATUS_TONE[org.status] ?? 'neutral'}>
                      {INSTITUTION_STATUS_LABEL[org.status] ?? org.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{org.people}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{org.devices}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{org.scans30d}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 sm:px-6">
                    {org.reportsRecovered}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="By organisation type" subtitle="The platform is not higher-education-only." />
            <div className="px-4 py-3 sm:px-6">
              <ul className="space-y-1.5 text-sm">
                {overview.byKind.map((row) => (
                  <li key={row.kind} className="flex items-center justify-between gap-3">
                    <span className="text-slate-700">{INSTITUTION_KIND_LABEL[row.kind] ?? row.kind}</span>
                    <span className="font-medium tabular-nums text-slate-900">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <CardHeader title="Checkpoint activity" subtitle="Scans per day, last 30 days" />
            <div className="px-4 py-3 sm:px-6">
              {overview.daily.length === 0 ? (
                <p className="muted">No scans recorded in the last 30 days.</p>
              ) : (
                <Sparkline data={overview.daily} />
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/**
 * A 30-day bar chart, drawn as text-scaled divs rather than an SVG so it stays
 * readable to a screen reader as a list and costs no client-side JavaScript.
 */
function Sparkline({ data }: { data: Array<{ day: string; scans: number }> }) {
  const max = Math.max(...data.map((d) => d.scans), 1);
  const total = data.reduce((sum, d) => sum + d.scans, 0);

  return (
    <>
      <div className="flex h-24 items-end gap-[3px]" aria-hidden="true">
        {data.map((d) => (
          <div
            key={d.day}
            className="flex-1 rounded-sm bg-brand-600"
            style={{ height: `${Math.max(4, Math.round((d.scans / max) * 100))}%` }}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {total.toLocaleString()} scans over {data.length} active {data.length === 1 ? 'day' : 'days'}, peaking at{' '}
        {max.toLocaleString()} in a day.
      </p>
      <table className="sr-only">
        <caption>Checkpoint scans per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Scans</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day}</th>
              <td>{d.scans}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
