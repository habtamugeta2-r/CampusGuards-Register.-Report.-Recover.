import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { query, queryOne } from './db';
import { id } from './ids';
import { OFFICER_SESSION_TTL_HOURS, SESSION_COOKIE, SESSION_TTL_HOURS } from './constants';
import type {
  Institution,
  InstitutionKind,
  InstitutionStatus,
  PlatformRole,
  Role,
  SafeUser,
  SessionRow,
  SessionUser,
  StudentProfile,
} from './types';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function ttlFor(role: Role): number {
  // Security officers work on shared, supervised devices: shorter sessions.
  return role === 'SECURITY' ? OFFICER_SESSION_TTL_HOURS : SESSION_TTL_HOURS;
}

export async function createSession(
  userId: string,
  role: Role,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + ttlFor(role) * 3_600_000);

  await query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id.session(), userId, sha256(token), expiresAt, meta.ip ?? null, meta.userAgent ?? null],
  );

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });

  return { token, expiresAt };
}

const SESSION_SELECT = `
  SELECT
    s.id            AS session_id,
    s.last_seen_at  AS session_last_seen,
    u.id, u.institution_id, u.email, u.full_name, u.phone, u.role, u.status,
    u.platform_role, u.platform_scope_country,
    u.last_login_at, u.password_changed_at, u.failed_login_count, u.locked_until,
    u.created_at, u.updated_at, u.deleted_at,
    i.id AS i_id, i.name AS i_name, i.code AS i_code, i.email_domain AS i_email_domain,
    i.city AS i_city, i.country AS i_country, i.timezone AS i_timezone,
    i.kind AS i_kind, i.status AS i_status, i.licence_expires_at AS i_licence_expires_at,
    i.seat_limit AS i_seat_limit, i.logo_url AS i_logo_url, i.data_region AS i_data_region,
    i.scan_retention_days, i.report_retention_days, i.audit_retention_days,
    i.qr_token_rotate_days, i.require_scan_justification, i.allow_aggregate_analytics,
    i.created_at AS i_created_at, i.updated_at AS i_updated_at,
    p.id AS p_id, p.user_id AS p_user_id, p.student_id, p.department,
    p.year_of_study, p.dorm, p.fayda_id,
    p.created_at AS p_created_at, p.updated_at AS p_updated_at
  FROM sessions s
  JOIN users u        ON u.id = s.user_id
  JOIN institutions i ON i.id = u.institution_id
  LEFT JOIN student_profiles p ON p.user_id = u.id
`;

type SessionJoinRow = {
  session_id: string;
  session_last_seen: Date;
  i_id: string;
  i_name: string;
  i_code: string;
  i_email_domain: string;
  i_city: string | null;
  i_country: string;
  i_timezone: string;
  i_kind: InstitutionKind;
  i_status: InstitutionStatus;
  i_licence_expires_at: Date | null;
  i_seat_limit: number | null;
  i_logo_url: string | null;
  i_brand_primary: string | null;
  i_data_region: string;
  platform_role: PlatformRole;
  platform_scope_country: string | null;
  scan_retention_days: number;
  report_retention_days: number;
  audit_retention_days: number;
  qr_token_rotate_days: number;
  require_scan_justification: boolean;
  allow_aggregate_analytics: boolean;
  i_created_at: Date;
  i_updated_at: Date;
  p_id: string | null;
  p_user_id: string | null;
  student_id: string | null;
  department: string | null;
  year_of_study: number | null;
  dorm: string | null;
  fayda_id: string | null;
  p_created_at: Date | null;
  p_updated_at: Date | null;
} & SafeUser;

function mapSession(row: SessionJoinRow): SessionUser {
  const user: SafeUser = {
    id: row.id,
    institution_id: row.institution_id,
    email: row.email,
    full_name: row.full_name,
    phone: row.phone,
    role: row.role,
    platform_role: row.platform_role,
    platform_scope_country: row.platform_scope_country,
    status: row.status,
    last_login_at: row.last_login_at,
    password_changed_at: row.password_changed_at,
    failed_login_count: row.failed_login_count,
    locked_until: row.locked_until,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };

  const institution: Institution = {
    id: row.i_id,
    name: row.i_name,
    code: row.i_code,
    email_domain: row.i_email_domain,
    city: row.i_city,
    country: row.i_country,
    timezone: row.i_timezone,
    kind: row.i_kind,
    status: row.i_status,
    licence_expires_at: row.i_licence_expires_at,
    seat_limit: row.i_seat_limit,
    logo_url: row.i_logo_url,
    brand_primary: row.i_brand_primary,
    data_region: row.i_data_region,
    scan_retention_days: row.scan_retention_days,
    report_retention_days: row.report_retention_days,
    audit_retention_days: row.audit_retention_days,
    qr_token_rotate_days: row.qr_token_rotate_days,
    require_scan_justification: row.require_scan_justification,
    allow_aggregate_analytics: row.allow_aggregate_analytics,
    created_at: row.i_created_at,
    updated_at: row.i_updated_at,
  };

  const profile: StudentProfile | null = row.p_id
    ? {
        id: row.p_id,
        user_id: row.p_user_id!,
        student_id: row.student_id!,
        department: row.department,
        year_of_study: row.year_of_study,
        dorm: row.dorm,
        fayda_id: row.fayda_id,
        created_at: row.p_created_at!,
        updated_at: row.p_updated_at!,
      }
    : null;

  return {
    sessionId: row.session_id,
    user,
    institution,
    role: row.role,
    platformRole: row.platform_role,
    platformCountry: row.platform_scope_country,
    profile,
  };
}

/**
 * Resolves the signed-in user. Sessions are stored server-side (not JWTs) so an
 * officer's session can be revoked immediately when their shift ends or a
 * device goes missing.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = await queryOne<SessionJoinRow>(
    `${SESSION_SELECT} WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
    [sha256(token)],
  );

  if (!row) return null;
  if (row.deleted_at || row.status === 'DISABLED' || row.status === 'PENDING') return null;

  // Refresh last_seen_at at most once every 5 minutes to avoid a write per request.
  if (Date.now() - new Date(row.session_last_seen).getTime() > 5 * 60_000) {
    void query('UPDATE sessions SET last_seen_at = now() WHERE id = $1', [row.session_id]).catch(() => {});
  }

  return mapSession(row);
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await query('UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [
      sha256(token),
    ]).catch(() => {});
  }
  jar.delete(SESSION_COOKIE);
}

/** Used on password change / suspension: kill every other session. */
export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await query(
    `UPDATE sessions SET revoked_at = now()
     WHERE user_id = $1 AND revoked_at IS NULL
       AND ($2::text IS NULL OR id <> $2)`,
    [userId, exceptSessionId ?? null],
  );
}

export async function findSessionByTokenHash(hash: string): Promise<SessionRow | null> {
  return queryOne<SessionRow>('SELECT * FROM sessions WHERE token_hash = $1', [hash]);
}
