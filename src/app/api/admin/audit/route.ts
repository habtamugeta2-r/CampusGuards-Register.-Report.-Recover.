import { route, ok } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { listAuditLogs } from '@/lib/repos/misc';

export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  const session = await requireRole('ADMIN');
  const url = new URL(req.url);

  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const { rows, total } = await listAuditLogs(session.institution.id, {
    action: url.searchParams.get('action') ?? undefined,
    actorId: url.searchParams.get('actorId') ?? undefined,
    entityType: url.searchParams.get('entityType') ?? undefined,
    entityId: url.searchParams.get('entityId') ?? undefined,
    from: from ? new Date(from) : null,
    to: to ? new Date(to) : null,
    limit: Number(url.searchParams.get('limit') ?? 50),
    offset: Number(url.searchParams.get('offset') ?? 0),
  });

  // Reading the audit log is itself an auditable action: who reviewed the
  // institution's activity, when, and with which filters.
  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'audit.view',
    entityType: 'audit_log',
    metadata: { filters: Object.fromEntries(url.searchParams), returned: rows.length },
  });

  return ok({ rows, total });
});
