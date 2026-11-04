import { query, queryOne } from '../db';
import { id } from '../ids';
import type { AuditLog, Checkpoint, ConsentType, Institution, Notification } from '../types';

// ---------------------------------------------------------------------------
// Checkpoints
// ---------------------------------------------------------------------------

export async function listCheckpoints(institutionId: string, activeOnly = false): Promise<Checkpoint[]> {
  return query<Checkpoint>(
    `SELECT * FROM checkpoints WHERE institution_id = $1 ${activeOnly ? 'AND is_active = true' : ''}
     ORDER BY name ASC`,
    [institutionId],
  );
}

export async function createCheckpoint(institutionId: string, name: string, location?: string | null): Promise<Checkpoint> {
  const rows = await query<Checkpoint>(
    `INSERT INTO checkpoints (id, institution_id, name, location) VALUES ($1,$2,$3,$4) RETURNING *`,
    [id.checkpoint(), institutionId, name, location ?? null],
  );
  return rows[0]!;
}

export async function updateCheckpoint(
  checkpointId: string,
  institutionId: string,
  patch: { name?: string; location?: string | null; isActive?: boolean },
): Promise<void> {
  await query(
    `UPDATE checkpoints
        SET name = COALESCE($3, name),
            location = CASE WHEN $4::text IS NULL THEN location ELSE $4 END,
            is_active = COALESCE($5, is_active),
            updated_at = now()
      WHERE id = $1 AND institution_id = $2`,
    [checkpointId, institutionId, patch.name ?? null, patch.location === undefined ? null : patch.location, patch.isActive ?? null],
  );
}

export async function findCheckpointById(checkpointId: string, institutionId: string): Promise<Checkpoint | null> {
  return queryOne<Checkpoint>('SELECT * FROM checkpoints WHERE id = $1 AND institution_id = $2', [
    checkpointId,
    institutionId,
  ]);
}

// ---------------------------------------------------------------------------
// Institutions & settings
// ---------------------------------------------------------------------------

/**
 * Domain lookup lives in repos/platform.ts, against institution_domains: an
 * organisation can claim more than one domain, and this module should not grow
 * a second, subtly different version of the same rule.
 */

export async function listInstitutions(): Promise<Institution[]> {
  return query<Institution>('SELECT * FROM institutions ORDER BY code ASC');
}

export async function findInstitutionById(institutionId: string): Promise<Institution | null> {
  return queryOne<Institution>('SELECT * FROM institutions WHERE id = $1', [institutionId]);
}

export async function updateInstitutionSettings(
  institutionId: string,
  patch: Partial<Pick<Institution, 'scan_retention_days' | 'report_retention_days' | 'audit_retention_days' | 'require_scan_justification' | 'allow_aggregate_analytics'>>,
): Promise<void> {
  const map: Array<[keyof typeof patch, string]> = [
    ['scan_retention_days', 'scan_retention_days'],
    ['report_retention_days', 'report_retention_days'],
    ['audit_retention_days', 'audit_retention_days'],
    ['require_scan_justification', 'require_scan_justification'],
    ['allow_aggregate_analytics', 'allow_aggregate_analytics'],
  ];
  const fields: string[] = [];
  const params: unknown[] = [institutionId];
  for (const [key, column] of map) {
    const value = patch[key];
    if (value === undefined) continue;
    params.push(value);
    fields.push(`${column} = $${params.length}`);
  }
  if (!fields.length) return;
  await query(`UPDATE institutions SET ${fields.join(', ')}, updated_at = now() WHERE id = $1`, params);
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export type AuditFilters = {
  action?: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  from?: Date | null;
  to?: Date | null;
  limit?: number;
  offset?: number;
};

export async function listAuditLogs(institutionId: string, filters: AuditFilters = {}) {
  const params: unknown[] = [institutionId];
  const where = ['a.institution_id = $1'];

  if (filters.action) {
    params.push(`%${filters.action}%`);
    where.push(`a.action ILIKE $${params.length}`);
  }
  if (filters.actorId) {
    params.push(filters.actorId);
    where.push(`a.actor_id = $${params.length}`);
  }
  if (filters.entityType) {
    params.push(filters.entityType);
    where.push(`a.entity_type = $${params.length}`);
  }
  if (filters.entityId) {
    params.push(filters.entityId);
    where.push(`a.entity_id = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    where.push(`a.created_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    where.push(`a.created_at <= $${params.length}`);
  }

  const clause = `WHERE ${where.join(' AND ')}`;
  const [{ total } = { total: 0 }] = await query<{ total: number }>(
    `SELECT count(*)::int AS total FROM audit_logs a ${clause}`,
    params,
  );

  const limit = Math.min(filters.limit ?? 50, 200);
  const offset = filters.offset ?? 0;
  params.push(limit, offset);
  const rows = await query<AuditLog & { actor_name: string | null }>(
    `SELECT a.*, u.full_name AS actor_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
      ${clause}
      ORDER BY a.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { rows, total };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function listNotifications(userId: string, limit = 30): Promise<Notification[]> {
  return query<Notification>(
    `SELECT * FROM notifications WHERE user_id = $1 AND channel = 'IN_APP'
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit],
  );
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  const row = await queryOne<{ count: number }>(
    `SELECT count(*)::int AS count FROM notifications
      WHERE user_id = $1 AND channel = 'IN_APP' AND read_at IS NULL`,
    [userId],
  );
  return row?.count ?? 0;
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  await query('UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2', [
    notificationId,
    userId,
  ]);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await query('UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL', [userId]);
}

// ---------------------------------------------------------------------------
// Consent & data-subject requests
// ---------------------------------------------------------------------------

export async function recordConsent(
  userId: string,
  type: ConsentType,
  version: string,
  accepted: boolean,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<void> {
  await query(
    `INSERT INTO consent_records (id, user_id, type, version, accepted, ip, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id.consent(), userId, type, version, accepted, meta.ip ?? null, meta.userAgent ?? null],
  );
}

export async function listConsents(userId: string) {
  return query<{ type: ConsentType; version: string; accepted: boolean; created_at: Date }>(
    `SELECT type, version, accepted, created_at FROM consent_records
      WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
}

export async function createDataSubjectRequest(
  userId: string,
  kind: string,
  details?: string | null,
): Promise<string> {
  const requestId = id.dataRequest();
  await query(
    `INSERT INTO data_subject_requests (id, user_id, kind, details) VALUES ($1,$2,$3,$4)`,
    [requestId, userId, kind, details ?? null],
  );
  return requestId;
}

export async function listDataSubjectRequests(userId: string) {
  return query<{ id: string; kind: string; status: string; created_at: Date; completed_at: Date | null }>(
    `SELECT id, kind, status, created_at, completed_at FROM data_subject_requests
      WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
}
