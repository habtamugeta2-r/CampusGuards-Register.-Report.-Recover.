import { route, ok } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { offlineManifest } from '@/lib/repos/products';
import { OFFLINE_CACHE_MAX_ROWS, OFFLINE_CACHE_TTL_HOURS } from '@/lib/constants';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * Registry snapshot for an officer's device cache.
 *
 * Ethiopian campus connectivity is unreliable, so the scanning interface has to
 * work offline. The payload is deliberately minimal (token, status, device
 * description, owner name) and the client encrypts it before writing it to
 * IndexedDB with a non-extractable key, so a lost phone does not leak the
 * registry. Results resolved from this cache are always labelled as cached, and
 * the authoritative result is recomputed server-side when the device syncs.
 */
export const GET = route(async () => {
  const session = await requireRole('SECURITY', 'ADMIN');

  // Fetch one row past the cap so `truncated` reports what it claims: that the
  // registry is larger than the cache and some devices are NOT on the phone.
  // Comparing `rows.length >= cap` reported "truncated" when the registry
  // happened to be exactly the cap size, which is not truncation at all.
  const rows = await offlineManifest(session.institution.id, OFFLINE_CACHE_MAX_ROWS + 1);
  const truncated = rows.length > OFFLINE_CACHE_MAX_ROWS;
  if (truncated) rows.length = OFFLINE_CACHE_MAX_ROWS;

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'offline.manifest_download',
    entityType: 'institution',
    entityId: session.institution.id,
    metadata: { rows: rows.length },
  });

  return ok({
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + OFFLINE_CACHE_TTL_HOURS * 3_600_000).toISOString(),
    institution: session.institution.code,
    count: rows.length,
    truncated,
    rows,
  });
});
