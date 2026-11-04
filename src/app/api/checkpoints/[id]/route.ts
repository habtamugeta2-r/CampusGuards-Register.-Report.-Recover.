import { route, ok, fail, readJson, clientIp, userAgent, notFound } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { findCheckpointById, updateCheckpoint } from '@/lib/repos/misc';

export const dynamic = 'force-dynamic';

export const PATCH = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireRole('ADMIN');
  const { id: checkpointId } = await params;
  const existing = await findCheckpointById(checkpointId, session.institution.id);
  if (!existing) notFound('Checkpoint not found.');

  const body = (await readJson(req)) as { name?: string; location?: string | null; isActive?: boolean };
  if (body.name !== undefined && !body.name.trim()) return fail(400, 'Name is required.');

  await updateCheckpoint(checkpointId, session.institution.id, {
    name: body.name?.trim(),
    location: body.location,
    isActive: body.isActive,
  });

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'checkpoint.update',
    entityType: 'checkpoint',
    entityId: checkpointId,
    metadata: body,
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ ok: true });
});
