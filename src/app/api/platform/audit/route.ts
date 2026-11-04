import { route, ok } from '@/lib/http';
import { requirePlatformAdmin } from '@/lib/auth';
import { listPlatformAudit } from '@/lib/repos/platform';

export const dynamic = 'force-dynamic';

/** Platform-operator actions across tenants. Ids and metadata only. */
export const GET = route(async (req: Request) => {
  await requirePlatformAdmin();
  const requested = Number(new URL(req.url).searchParams.get('limit') ?? 200);
  const limit = Math.min(Math.max(Number.isFinite(requested) ? requested : 200, 1), 500);
  return ok({ rows: await listPlatformAudit(limit) });
});
