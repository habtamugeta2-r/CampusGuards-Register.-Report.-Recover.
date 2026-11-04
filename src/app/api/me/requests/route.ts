import { route, ok, fail, readJson } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { createDataSubjectRequest } from '@/lib/repos/misc';
import { logAudit } from '@/lib/audit';
import { notifyMany } from '@/lib/notifications';
import { listAdminIds } from '@/lib/repos/users';

export const dynamic = 'force-dynamic';

const KINDS = ['ACCESS', 'EXPORT', 'DELETION', 'CORRECTION', 'OBJECTION'];

/**
 * Data-subject requests under Proclamation No. 1321/2024.
 *
 * Deletion is intentionally a REQUEST, not an instant destructive action: the
 * university may need to keep an incident record, and erasure has to be carried
 * out (and evidenced) by the data controller.
 */
export const POST = route(async (req: Request) => {
  const session = await requireUser();
  const body = (await readJson(req)) as { kind?: string; details?: string };
  const kind = (body.kind ?? '').toUpperCase();
  if (!KINDS.includes(kind)) return fail(400, `Choose one of: ${KINDS.join(', ')}.`);

  const requestId = await createDataSubjectRequest(session.user.id, kind, body.details ?? null);

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'data_subject.request',
    entityType: 'data_subject_request',
    entityId: requestId,
    metadata: { kind },
  });

  await notifyMany(await listAdminIds(session.institution.id), {
    type: 'data_subject.request',
    title: `Data subject request: ${kind}`,
    body: `${session.user.full_name} (${session.user.email}) submitted a ${kind.toLowerCase()} request.`,
    link: '/admin/audit',
  });

  return ok({ id: requestId });
});
