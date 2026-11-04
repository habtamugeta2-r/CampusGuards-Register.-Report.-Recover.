import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listScanEvents, scanStats } from '@/lib/repos/scans';
import { listCheckpoints } from '@/lib/repos/misc';
import { ScanHistoryLookup } from '@/components/admin-forms';
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, Stat, Table } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { SCAN_RESULT_META } from '@/lib/constants';
import type { ScanResult } from '@/lib/types';

export const metadata = { title: 'Scan log' };
export const dynamic = 'force-dynamic';

const TONES: Record<ScanResult, 'ok' | 'warn' | 'danger'> = {
  REGISTERED_OK: 'ok',
  AUTHORIZED_BORROWER: 'ok',
  ACTIVE_MISSING_REPORT: 'danger',
  NOT_REGISTERED: 'warn',
  MISMATCH: 'warn',
};

export default async function AdminScansPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; checkpoint?: string }>;
}) {
  const session = await getPageSession(['ADMIN']);
  const { result, checkpoint } = await searchParams;

  const [{ rows, total }, stats, checkpoints] = await Promise.all([
    listScanEvents(session.institution.id, {
      result: (result as ScanResult | 'ALL') ?? 'ALL',
      checkpointId: checkpoint ?? 'ALL',
      limit: 100,
    }),
    scanStats(session.institution.id),
    listCheckpoints(session.institution.id),
  ]);

  return (
    <AppShell roles={['ADMIN']}>
      <PageHeader
        title="Scan log"
        description="What officers saw at checkpoints. This is the surveillance-sensitive table: it is retained briefly and access is audited."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Scans" value={stats.total} hint="All time" />
        <Stat label="Average time" value={stats.avgDurationMs ? `${(stats.avgDurationMs / 1000).toFixed(1)} s` : '—'} hint="Scan to result" />
        <Stat label="Offline scans" value={stats.offline} hint="Resolved from the device cache" />
        <Stat
          label="Needed a conversation"
          value={`${stats.total ? Math.round((((stats.byResult.MISMATCH ?? 0) + (stats.byResult.ACTIVE_MISSING_REPORT ?? 0)) / stats.total) * 100) : 0}%`}
          hint="Mismatch or missing-report hits"
        />
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Look up one student’s history"
          subtitle="Restricted. A written justification is required and stored permanently in the audit log."
        />
        <div className="p-4">
          <ScanHistoryLookup />
          <div className="mt-3">
            <Alert tone="warn" title="Use this for investigations, not curiosity">
              Pulling a person’s movement record without a documented reason is a misuse of the system and is visible to
              every other administrator in the audit log.
            </Alert>
          </div>
        </div>
      </Card>

      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <select name="result" className="select w-auto" defaultValue={result ?? 'ALL'}>
          <option value="ALL">All results</option>
          {Object.keys(SCAN_RESULT_META).map((key) => (
            <option key={key} value={key}>
              {SCAN_RESULT_META[key as ScanResult].label}
            </option>
          ))}
        </select>
        <select name="checkpoint" className="select w-auto" defaultValue={checkpoint ?? 'ALL'}>
          <option value="ALL">All checkpoints</option>
          {checkpoints.map((cp) => (
            <option key={cp.id} value={cp.id}>
              {cp.name}
            </option>
          ))}
        </select>
        <button className="btn-secondary">Filter</button>
      </form>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No scans match" description="Adjust the filters above." />
        ) : (
          <Table
            head={
              <>
                <th className="th">When</th>
                <th className="th">Result</th>
                <th className="th">Device</th>
                <th className="th">Checkpoint</th>
                <th className="th">Officer</th>
                <th className="th">Source</th>
              </>
            }
          >
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="td whitespace-nowrap">{formatDateTime(row.recorded_at)}</td>
                <td className="td">
                  <Badge tone={TONES[row.result]}>{SCAN_RESULT_META[row.result].label}</Badge>
                </td>
                <td className="td">{row.product_label ?? '—'}</td>
                <td className="td">{row.checkpoint_name ?? '—'}</td>
                <td className="td">{row.officer_name}</td>
                <td className="td">
                  {row.source === 'OFFLINE_CACHE' ? (
                    <Badge tone="warn">Offline</Badge>
                  ) : row.source === 'MANUAL_ENTRY' ? (
                    <Badge>Manual</Badge>
                  ) : (
                    <Badge tone="ok">Live</Badge>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
        {total > rows.length ? (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            Showing the most recent {rows.length} of {total}.
          </p>
        ) : null}
      </Card>
    </AppShell>
  );
}
