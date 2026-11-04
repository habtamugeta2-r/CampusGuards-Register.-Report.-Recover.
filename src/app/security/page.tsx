import { AppShell } from '@/components/app-shell';
import { ScanConsole } from '@/components/scan-console';
import { listCheckpoints } from '@/lib/repos/misc';
import { getPageSession } from '@/lib/auth';
import { Alert, PageHeader } from '@/components/ui';

export const metadata = { title: 'Scan' };
export const dynamic = 'force-dynamic';

export default async function SecurityScanPage() {
  const session = await getPageSession(['SECURITY', 'ADMIN']);
  const checkpoints = await listCheckpoints(session.institution.id, true);

  return (
    <AppShell roles={['SECURITY', 'ADMIN']}>
      <PageHeader
        title="Checkpoint scanning"
        description="Spot-check devices at a checkpoint. Keep it conversational: the screen tells you what to ask, not what to conclude."
      />

      {checkpoints.length === 0 ? (
        <div className="mb-4">
          <Alert tone="warn" title="No checkpoints configured">
            An administrator needs to add at least one checkpoint before scans can be attributed to a location. You can
            still scan — the record will simply have no checkpoint attached.
          </Alert>
        </div>
      ) : null}

      <ScanConsole checkpoints={checkpoints.map((c) => ({ id: c.id, name: c.name }))} />
    </AppShell>
  );
}
