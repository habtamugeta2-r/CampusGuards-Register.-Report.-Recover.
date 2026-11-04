import { route, ok } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * Data-subject access request: everything CampusGuard holds about one person,
 * as JSON. Delivered through the signed-in app rather than email so that the
 * export cannot be intercepted in transit to the wrong mailbox.
 */
export const GET = route(async () => {
  const session = await requireUser();
  const userId = session.user.id;

  const [products, missingReports, foundReports, scans, notifications, consents] = await Promise.all([
    query('SELECT p.*, pi.value AS qr_token FROM products p LEFT JOIN product_identifiers pi ON pi.product_id = p.id AND pi.kind = \'QR_TOKEN\' AND pi.revoked_at IS NULL WHERE p.owner_id = $1 ORDER BY p.registered_at DESC', [userId]),
    query('SELECT * FROM missing_reports WHERE reporter_id = $1 ORDER BY reported_at DESC', [userId]),
    query('SELECT * FROM found_reports WHERE reporter_id = $1 ORDER BY found_at DESC', [userId]),
    query('SELECT id, result, source, checkpoint_id, scanned_at, recorded_at FROM scan_events WHERE carrier_id = $1 ORDER BY recorded_at DESC LIMIT 500', [userId]),
    query('SELECT id, type, title, body, created_at, read_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200', [userId]),
    query('SELECT type, version, accepted, created_at FROM consent_records WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
  ]);

  await logAudit({
    institutionId: session.institution.id,
    actorId: userId,
    actorRole: session.role,
    action: 'data_subject.export',
    entityType: 'user',
    entityId: userId,
  });

  return ok({
    generatedAt: new Date().toISOString(),
    account: {
      id: session.user.id,
      name: session.user.full_name,
      email: session.user.email,
      role: session.user.role,
      status: session.user.status,
      createdAt: session.user.created_at,
      lastLoginAt: session.user.last_login_at,
    },
    profile: session.profile,
    products,
    missingReports,
    foundReports,
    scansOnMyDevices: scans,
    notifications,
    consents,
  });
});
