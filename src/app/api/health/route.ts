import { route, ok, fail } from '@/lib/http';
import { healthCheck, query, queryOne } from '@/lib/db';
import { lastRetentionRun } from '@/lib/retention';

export const dynamic = 'force-dynamic';

/**
 * Health and monitoring.
 *
 * Plain `GET /api/health` is the liveness probe: cheap, unauthenticated, and
 * safe to poll every 60 seconds. It answers one question — is the app up and can
 * it reach the database.
 *
 * `GET /api/health?deep=1` is for monitoring, not for the public internet. It
 * reports the things the runbook says to alert on: how stale the retention job
 * is, whether data-subject requests are piling up, and whether someone is
 * hammering the login endpoint. It requires either an ADMIN session or a
 * `MONITOR_TOKEN` matching the environment variable of the same name, and it
 * never returns personal data — only counts and ages.
 */
export const GET = route(async (req: Request) => {
  const databaseUp = await healthCheck();
  const url = new URL(req.url);

  if (url.searchParams.get('deep') !== '1') {
    return databaseUp
      ? ok({ status: 'ok', database: 'up', time: new Date().toISOString() })
      : fail(503, 'Database unreachable.');
  }

  const { requireUser } = await import('@/lib/auth');
  const token = process.env.MONITOR_TOKEN;
  const presented = req.headers.get('x-monitor-token');

  let authorised = Boolean(token) && presented === token;
  let session = null;
  if (!authorised) {
    try {
      session = await requireUser();
      authorised = session.role === 'ADMIN';
    } catch {
      authorised = false;
    }
  }
  if (!authorised) return fail(401, 'Administrator session or a valid monitoring token is required.');

  if (!databaseUp) return fail(503, 'Database unreachable.');

  // A signed-in administrator sees only their own institution's numbers; an
  // infrastructure monitor (token-authenticated, no session) sees the whole
  // deployment. Counts only — never a name, email or identifier.
  const institutionId = session?.institution.id ?? (url.searchParams.get('institutionId') ?? null);

  const [counts] = await query<{
    users: string;
    products: string;
    scan_events: string;
    open_reports: string;
    pending_requests: string;
    failed_logins_1h: string;
  }>(
    `SELECT (SELECT count(*) FROM users
              WHERE deleted_at IS NULL AND ($1::text IS NULL OR institution_id = $1))::text AS users,
            (SELECT count(*) FROM products
              WHERE ($1::text IS NULL OR institution_id = $1))::text AS products,
            (SELECT count(*) FROM scan_events
              WHERE ($1::text IS NULL OR institution_id = $1))::text AS scan_events,
            (SELECT count(*) FROM missing_reports
              WHERE status = 'OPEN' AND ($1::text IS NULL OR institution_id = $1))::text AS open_reports,
            (SELECT count(*) FROM data_subject_requests dsr
               JOIN users u ON u.id = dsr.user_id
              WHERE dsr.status IN ('RECEIVED','IN_PROGRESS')
                AND ($1::text IS NULL OR u.institution_id = $1))::text AS pending_requests,
            (SELECT count(*) FROM audit_logs
              WHERE action = 'auth.login_failed' AND created_at > now() - interval '1 hour'
                AND ($1::text IS NULL OR institution_id = $1))::text AS failed_logins_1h`,
    [institutionId],
  );

  const retention = await lastRetentionRun(institutionId);
  const migrations = await queryOne<{ applied: string }>('SELECT count(*)::text AS applied FROM schema_migrations');

  const checks = {
    database: databaseUp ? 'up' : 'down',
    retentionStale: retention ? Date.now() - new Date(retention.ran_at).getTime() > 48 * 3_600_000 : null,
    pendingDataSubjectRequests: Number(counts?.pending_requests ?? 0),
    failedLoginsLastHour: Number(counts?.failed_logins_1h ?? 0),
  };

  return ok({
    status: databaseUp ? 'ok' : 'degraded',
    time: new Date().toISOString(),
    migrationsApplied: Number(migrations?.applied ?? 0),
    counts: {
      users: Number(counts?.users ?? 0),
      products: Number(counts?.products ?? 0),
      scanEvents: Number(counts?.scan_events ?? 0),
      openReports: Number(counts?.open_reports ?? 0),
      pendingDataSubjectRequests: checks.pendingDataSubjectRequests,
      failedLoginsLastHour: checks.failedLoginsLastHour,
    },
    retention: retention
      ? { lastRunAt: retention.ran_at, stale: checks.retentionStale }
      : { lastRunAt: null, stale: null },
    checks,
  });
});
