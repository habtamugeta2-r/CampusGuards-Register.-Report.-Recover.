import { query } from './db';
import { id } from './ids';

export type AuditInput = {
  institutionId: string;
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: unknown;
  justification?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Append-only audit trail.
 *
 * Every read of a student's records by staff, every status change and every
 * scan lands here. Rows are never updated or deleted except by the retention
 * job, and the log is visible only to administrators.
 *
 * Failures are swallowed on purpose: losing an audit row must not break the
 * user-facing operation, but it is logged loudly for follow-up.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs
         (id, institution_id, actor_id, actor_role, action, entity_type, entity_id,
          justification, metadata, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id.audit(),
        input.institutionId,
        input.actorId ?? null,
        input.actorRole ?? null,
        input.action,
        input.entityType ?? null,
        input.entityId ?? null,
        input.justification ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        input.ip ?? null,
        input.userAgent ?? null,
      ],
    );
  } catch (error) {
    console.error('[audit] failed to write audit row', { action: input.action, error });
  }
}

/** Convenience wrapper for request handlers. */
export function auditFromRequest(
  req: Request,
  base: Omit<AuditInput, 'ip' | 'userAgent'>,
) {
  return logAudit({
    ...base,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: req.headers.get('user-agent'),
  });
}
