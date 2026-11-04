import { route, ok } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { pilotMetrics } from '@/lib/metrics';
import { lastRetentionRun } from '@/lib/retention';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const session = await requireRole('ADMIN');
  const [metrics, retention] = await Promise.all([
    pilotMetrics(session.institution.id),
    lastRetentionRun(session.institution.id),
  ]);
  return ok({ metrics, lastRetentionRun: retention });
});
