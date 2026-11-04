import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { pilotMetrics } from '@/lib/metrics';
import { listCheckpoints } from '@/lib/repos/misc';
import { Alert, Badge, Card, CardHeader, LinkButton, PageHeader, Stat } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const session = await getPageSession(['ADMIN']);
  const [metrics, checkpoints] = await Promise.all([
    pilotMetrics(session.institution.id),
    listCheckpoints(session.institution.id),
  ]);

  const { adoption, reports, scans, found, baseline } = metrics;
  const avgScanSeconds = scans.avgDurationMs ? (scans.avgDurationMs / 1000).toFixed(1) : '—';

  return (
    <AppShell roles={['ADMIN']}>
      <PageHeader
        title={`${session.institution.name}`}
        description="Pilot scoreboard. Every number here is one the pilot was designed to answer — including the uncomfortable ones."
        action={
          <Link href="/admin/export?type=summary" className="btn-secondary">
            Export CSV
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Registration rate"
          value={`${adoption.registrationRate}%`}
          hint={`${adoption.studentsWithProducts} of ${adoption.activeStudents} students registered something`}
          tone={adoption.registrationRate >= 50 ? 'ok' : 'warn'}
        />
        <Stat
          label="Recovery rate"
          value={`${reports.recoveryRate}%`}
          hint={
            baseline
              ? `Baseline before the pilot: ${metrics.baselineRecoveryRate}%`
              : 'No baseline recorded yet — add one in Settings'
          }
          tone={baseline && reports.recoveryRate > (metrics.baselineRecoveryRate ?? 0) ? 'ok' : 'info'}
        />
        <Stat
          label="Median time to recovery"
          value={reports.medianRecoveryHours === null ? '—' : `${reports.medianRecoveryHours} h`}
          hint={baseline?.median_recovery_hours ? `Baseline: ${baseline.median_recovery_hours} h` : 'Across recovered cases'}
        />
        <Stat
          label="Average scan time"
          value={avgScanSeconds === '—' ? '—' : `${avgScanSeconds} s`}
          hint={scans.total ? `${scans.total} scans recorded · ${scans.offline} offline` : 'No scans yet'}
          tone={scans.avgDurationMs && scans.avgDurationMs > 20000 ? 'warn' : 'ok'}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Reports"
            subtitle="Missing-item reports by outcome. The recovery rate counts only cases that reached an outcome."
            action={
              <Link href="/admin/reports" className="btn-secondary btn-sm">
                Manage
              </Link>
            }
          />
          <div className="grid gap-3 p-4 sm:grid-cols-4">
            <MiniStat label="Open" value={reports.open} tone={reports.open ? 'danger' : 'neutral'} />
            <MiniStat label="Recovered" value={reports.recovered} tone="ok" />
            <MiniStat label="Not found" value={reports.closedUnfound} />
            <MiniStat label="False reports" value={reports.falseReports} tone={reports.falseReports ? 'warn' : 'neutral'} />
          </div>
          <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
            <p>
              {found.pending + found.matched} found item{found.pending + found.matched === 1 ? '' : 's'} awaiting action ·{' '}
              {found.returned} returned to owners.{' '}
              <Link href="/admin/found" className="font-medium text-brand-700 hover:underline">
                Open the found desk
              </Link>
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Checkpoint activity" />
          <div className="space-y-3 p-4">
            {scans.byCheckpoint.length === 0 ? (
              <p className="text-sm text-slate-500">No scans recorded yet.</p>
            ) : (
              scans.byCheckpoint.slice(0, 5).map((row) => (
                <div key={row.checkpoint ?? 'unassigned'}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{row.checkpoint ?? 'No checkpoint'}</span>
                    <span className="tabular-nums text-slate-900">{row.count}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {row.avg_duration_ms ? `${(row.avg_duration_ms / 1000).toFixed(1)} s average` : '—'}
                  </p>
                </div>
              ))
            )}
            <p className="border-t border-slate-100 pt-2 text-xs text-slate-500">
              {checkpoints.length} checkpoint{checkpoints.length === 1 ? '' : 's'} configured · {metrics.followUpRate}% of
              scans needed a conversation rather than a wave-through.
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">Result mix</h2>
          <p className="mt-1 text-sm text-slate-500">
            What officers actually see at the gate. A high share of “carrier is not the owner” usually means students are
            lending devices without recording it.
          </p>
          <ul className="mt-3 space-y-2">
            {Object.entries(scans.byResult).map(([result, count]) => (
              <li key={result} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{result.replace(/_/g, ' ').toLowerCase()}</span>
                <span className="tabular-nums font-medium text-slate-900">{count}</span>
              </li>
            ))}
            {Object.keys(scans.byResult).length === 0 ? (
              <li className="text-sm text-slate-500">No scans yet.</li>
            ) : null}
          </ul>
        </Card>

        <Card className="card-pad">
          <h2 className="text-base font-semibold text-slate-900">Governance</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="flex items-center justify-between">
              <span>Scan records kept for</span>
              <Badge tone="info">{session.institution.scan_retention_days} days</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>Individual scan history requires justification</span>
              <Badge tone={session.institution.require_scan_justification ? 'ok' : 'warn'}>
                {session.institution.require_scan_justification ? 'Yes' : 'No'}
              </Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>Aggregate analytics</span>
              <Badge tone={session.institution.allow_aggregate_analytics ? 'warn' : 'ok'}>
                {session.institution.allow_aggregate_analytics ? 'Enabled' : 'Disabled'}
              </Badge>
            </li>
          </ul>
          <div className="mt-4">
            <Alert tone="info" title="Read the awkward numbers first">
              If registration is low, or recovery has not improved on the baseline, say so in the pilot report. The point
              of a pilot is to find that out before a university buys anything.
            </Alert>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkButton href="/admin/audit">Audit log</LinkButton>
            <LinkButton href="/admin/settings">Settings & baseline</LinkButton>
          </div>
        </Card>
      </div>

      {baseline ? (
        <p className="mt-6 text-xs text-slate-500">
          Baseline source: {baseline.source} · period {formatDateTime(baseline.period_start)} –{' '}
          {formatDateTime(baseline.period_end)}
        </p>
      ) : null}
    </AppShell>
  );
}

function MiniStat({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'ok' | 'warn' | 'danger' | 'neutral' }) {
  const color =
    tone === 'ok'
      ? 'text-emerald-700'
      : tone === 'warn'
        ? 'text-amber-700'
        : tone === 'danger'
          ? 'text-red-700'
          : 'text-slate-900';
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
