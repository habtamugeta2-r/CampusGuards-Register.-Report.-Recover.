import { route, ok, readJson, clientIp, userAgent } from '@/lib/http';
import { offlineSyncSchema } from '@/lib/validation';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { verifyAndRecord } from '@/lib/services/scan';
import { findCheckpointById } from '@/lib/repos/misc';

export const dynamic = 'force-dynamic';

/**
 * Uploads scans that were captured while the officer's device was offline.
 *
 * Each scan is re-resolved against the live database and stored with
 * source = OFFLINE_CACHE, so the log shows exactly which results were produced
 * from cached data rather than a live lookup.
 */
export const POST = route(async (req: Request) => {
  const session = await requireRole('SECURITY', 'ADMIN');
  const body = offlineSyncSchema.parse(await readJson(req));

  let checkpointName: string | null = null;
  if (body.checkpointId) {
    const checkpoint = await findCheckpointById(body.checkpointId, session.institution.id);
    checkpointName = checkpoint?.name ?? null;
  }

  const results: Array<{ token: string; result: string }> = [];

  for (const scan of body.scans) {
    try {
      const outcome = await verifyAndRecord({
        institutionId: session.institution.id,
        institutionName: session.institution.name,
        officerId: session.user.id,
        officerName: session.user.full_name,
        rawToken: scan.token,
        checkpointId: body.checkpointId || null,
        checkpointName,
        carrierIdentifier: scan.carrierIdentifier || null,
        carrierIdShown: Boolean(scan.carrierIdShown),
        note: scan.note || null,
        durationMs: scan.durationMs ?? null,
        source: 'OFFLINE_CACHE',
        scannedAt: scan.scannedAt ? new Date(scan.scannedAt) : null,
        ip: clientIp(req),
        userAgent: userAgent(req),
      });
      results.push({ token: outcome.token, result: outcome.result });
    } catch (error) {
      // A single unreadable code must not fail the whole batch.
      results.push({ token: scan.token, result: 'ERROR' });
      console.warn('[sync] scan rejected', error);
    }
  }

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'scan.offline_sync',
    entityType: 'institution',
    entityId: session.institution.id,
    metadata: { batchId: body.batchId, count: results.length, checkpoint: checkpointName },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ batchId: body.batchId, synced: results.length, results });
});
