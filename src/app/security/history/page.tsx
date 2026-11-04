import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { listScanEvents } from '@/lib/repos/scans';
import { Badge, Card, EmptyState, PageHeader, Table } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { SCAN_RESULT_META } from '@/lib/constants';
import type { ScanResult } from '@/lib/types';

export const metadata = { title: 'My scans' };
export const dynamic = 'force-dynamic';

const TONES: Record<ScanResult, 'ok' | 'warn' | 'danger'> = {
  REGISTERED_OK: 'ok',
  AUTHORIZED_BORROWER: 'ok',
  ACTIVE_MISSING_REPORT: 'danger',
  NOT_REGISTERED: 'warn',
  MISMATCH: 'warn',
};

export default async function ScanHistoryPage() {
  const session = await getPageSession(['SECURITY', 'ADMIN']);
  const { rows } = await listScanEvents(session.institution.id, {
    officerId: session.user.id,
    limit: 100,
  });

  return (
    <AppShell roles={['SECURITY', 'ADMIN']}>
      <PageHeader
        title="My scans"
        description="Every scan you have recorded, newest first. Scan records are kept for a limited period and then deleted automatically."
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No scans yet" description="Scans you perform appear here within a few seconds." />
        ) : (
          <Table
            head={
              <>
                <th className="th">When</th>
                <th className="th">Result</th>
                <th className="th">Device</th>
                <th className="th">Checkpoint</th>
                <th className="th">Source</th>
                <th className="th">Code</th>
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
                <td className="td">
                  {row.source === 'OFFLINE_CACHE' ? (
                    <Badge tone="warn">Offline cache</Badge>
                  ) : row.source === 'MANUAL_ENTRY' ? (
                    <Badge>Manual entry</Badge>
                  ) : (
                    <Badge tone="ok">Live</Badge>
                  )}
                </td>
                <td className="td font-mono text-xs text-slate-500">{row.token_scanned}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </AppShell>
  );
}
