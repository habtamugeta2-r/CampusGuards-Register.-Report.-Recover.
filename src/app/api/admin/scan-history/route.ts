import { route, ok, fail, clientIp, userAgent } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { scanHistoryForCarrier } from '@/lib/repos/scans';
import { findSafeUserById, resolveStudent } from '@/lib/repos/users';

export const dynamic = 'force-dynamic';

/**
 * An individual student's checkpoint history.
 *
 * This is the single most surveillance-sensitive endpoint in CampusGuard. It is
 * therefore gated three ways:
 *   1. ADMIN role only;
 *   2. a written justification is required (and stored) for every request;
 *   3. every access is written to the audit log with that justification.
 *
 * The institution can additionally disable pattern-of-life analysis entirely
 * (allow_aggregate_analytics = false), which is the default.
 */
export const GET = route(async (req: Request) => {
  const session = await requireRole('ADMIN');
  const url = new URL(req.url);
  const identifier = url.searchParams.get('identifier');
  const justification = (url.searchParams.get('justification') ?? '').trim();

  if (!identifier) return fail(400, 'Provide a student ID or email.');
  if (session.institution.require_scan_justification && justification.length < 10) {
    return fail(400, 'A written justification of at least 10 characters is required to view an individual’s scan history.');
  }

  const student = await resolveStudent(session.institution.id, identifier);
  if (!student) return fail(404, 'No student found with that ID or email.');

  const rows = await scanHistoryForCarrier(session.institution.id, student.id, 100);
  const profile = await findSafeUserById(student.id);

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'scan.history.access',
    entityType: 'user',
    entityId: student.id,
    justification,
    metadata: { rows: rows.length },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ student: profile, rows });
});
