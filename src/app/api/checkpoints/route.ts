import { route, ok, readJson, clientIp, userAgent } from '@/lib/http';
import { checkpointSchema } from '@/lib/validation';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createCheckpoint, listCheckpoints } from '@/lib/repos/misc';

export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  const session = await requireRole('SECURITY', 'ADMIN');
  const activeOnly = new URL(req.url).searchParams.get('active') === '1';
  return ok({ rows: await listCheckpoints(session.institution.id, activeOnly) });
});

export const POST = route(async (req: Request) => {
  const session = await requireRole('ADMIN');
  const body = checkpointSchema.parse(await readJson(req));
  const checkpoint = await createCheckpoint(session.institution.id, body.name, body.location || null);

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'checkpoint.create',
    entityType: 'checkpoint',
    entityId: checkpoint.id,
    metadata: { name: checkpoint.name },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ id: checkpoint.id });
});
