import { route, ok, fail } from '@/lib/http';
import { healthCheck } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Liveness + database reachability. Used by the service worker and uptime checks. */
export const GET = route(async () => {
  const database = await healthCheck();
  return database
    ? ok({ status: 'ok', database: 'up', time: new Date().toISOString() })
    : fail(503, 'Database unreachable.');
});
