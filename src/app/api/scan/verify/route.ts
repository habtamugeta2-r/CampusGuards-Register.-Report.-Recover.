import { route, ok, fail, readJson, clientIp, userAgent } from '@/lib/http';
import { scanSchema } from '@/lib/validation';
import { requireRole } from '@/lib/auth';
import { verifyAndRecord } from '@/lib/services/scan';
import { findCheckpointById } from '@/lib/repos/misc';
import { SCAN_RESULT_META } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * Live checkpoint verification.
 *
 * The response deliberately contains the minimum an officer needs: the device
 * description, the registered owner's name and student ID, and the action to
 * take. It never contains an email address, a phone number or a full serial.
 */
export const POST = route(async (req: Request) => {
  const session = await requireRole('SECURITY', 'ADMIN');
  const body = scanSchema.parse(await readJson(req));

  // Resolve the checkpoint against the officer's own institution and use what
  // we resolved — never the raw id. An unknown or retired checkpoint (a stale
  // id cached on a phone that has been offline for days) used to be passed
  // straight through and blew up on the foreign key, losing the scan. Now the
  // scan is still recorded, with the checkpoint simply left blank.
  const checkpoint = body.checkpointId
    ? await findCheckpointById(body.checkpointId, session.institution.id)
    : null;

  try {
    const result = await verifyAndRecord({
      institutionId: session.institution.id,
      institutionName: session.institution.name,
      officerId: session.user.id,
      officerName: session.user.full_name,
      rawToken: body.token,
      checkpointId: checkpoint?.id ?? null,
      checkpointName: checkpoint?.name ?? null,
      carrierIdentifier: body.carrierIdentifier || null,
      carrierIdShown: Boolean(body.carrierIdShown),
      note: body.note || null,
      durationMs: body.durationMs ?? null,
      source: body.offline ? 'OFFLINE_CACHE' : undefined,
      scannedAt: body.scannedAt ? new Date(body.scannedAt) : null,
      ip: clientIp(req),
      userAgent: userAgent(req),
    });

    return ok({ ...result, meta: SCAN_RESULT_META[result.result] });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    if (status === 400) return fail(400, (error as Error).message);
    throw error;
  }
});
