import { query, queryOne, tx } from '../db';
import { id } from '../ids';
import type {
  Institution,
  InstitutionDomain,
  InstitutionKind,
  InstitutionRequest,
  InstitutionStatus,
  PlatformAuditLog,
} from '../types';

/**
 * Platform-operator data access: tenants, their email domains, applications to
 * join, and the platform audit log.
 *
 * Every function here is reachable only through `requirePlatformAdmin()`
 * (except `createInstitutionRequest`, which is how an organisation applies).
 * Tenant-scoped data lives in the per-aggregate repositories; this module
 * deals only with the tenants themselves, and with counts — never with a
 * student, a device or a scan belonging to a particular tenant.
 */

export type InstitutionRow = Institution & {
  people: number;
  devices: number;
  scans_30d: number;
  open_reports: number;
  domains: string[];
  admin_count: number;
};

export type PlatformOverview = {
  organisations: number;
  organisationsByKind: Array<{ kind: InstitutionKind; count: number }>;
  organisationsByCountry: Array<{ country: string; count: number }>;
  people: number;
  devices: number;
  scans30d: number;
  openReports: number;
  pendingRequests: number;
  expiringLicences: Array<{ id: string; name: string; code: string; expiresAt: Date }>;
};

export function normaliseDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
}

export function isValidDomain(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain);
}

// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------

export async function listInstitutionRows(): Promise<InstitutionRow[]> {
  return query<InstitutionRow>(
    `SELECT i.*,
            (SELECT count(*) FROM users u WHERE u.institution_id = i.id AND u.deleted_at IS NULL)::int AS people,
            (SELECT count(*) FROM products p WHERE p.institution_id = i.id)::int AS devices,
            (SELECT count(*) FROM scan_events s
              WHERE s.institution_id = i.id AND s.scanned_at > now() - interval '30 days')::int AS scans_30d,
            (SELECT count(*) FROM missing_reports m
              WHERE m.institution_id = i.id AND m.status = 'OPEN')::int AS open_reports,
            (SELECT count(*) FROM users u
              WHERE u.institution_id = i.id AND u.role = 'ADMIN' AND u.deleted_at IS NULL)::int AS admin_count,
            COALESCE(
              (SELECT array_agg(d.domain ORDER BY d.is_primary DESC, d.domain)
                 FROM institution_domains d WHERE d.institution_id = i.id),
              '{}') AS domains
       FROM institutions i
      ORDER BY i.name ASC`,
  );
}

export async function findInstitutionByDomain(domain: string): Promise<Institution | null> {
  const clean = normaliseDomain(domain);
  if (!clean) return null;
  return queryOne<Institution>(
    `SELECT i.* FROM institution_domains d
       JOIN institutions i ON i.id = d.institution_id
      WHERE d.domain = $1`,
    [clean],
  );
}

export async function listDomains(): Promise<InstitutionDomain[]> {
  return query<InstitutionDomain>('SELECT * FROM institution_domains ORDER BY institution_id, is_primary DESC, domain');
}

export async function listDomainsFor(institutionId: string): Promise<InstitutionDomain[]> {
  return query<InstitutionDomain>(
    'SELECT * FROM institution_domains WHERE institution_id = $1 ORDER BY is_primary DESC, domain',
    [institutionId],
  );
}

export async function domainTaken(domain: string, exceptInstitutionId?: string): Promise<boolean> {
  const clean = normaliseDomain(domain);
  const row = await queryOne<{ institution_id: string }>(
    'SELECT institution_id FROM institution_domains WHERE domain = $1',
    [clean],
  );
  return Boolean(row) && row!.institution_id !== exceptInstitutionId;
}

export type CreateInstitutionInput = {
  name: string;
  code: string;
  kind: InstitutionKind;
  country: string;
  city?: string | null;
  dataRegion?: string;
  primaryDomain: string;
  extraDomains?: string[];
  status?: InstitutionStatus;
  seatLimit?: number | null;
  licenceExpiresAt?: Date | null;
  timezone?: string;
};

/** Creates a tenant and claims its email domains atomically. */
export async function createInstitution(input: CreateInstitutionInput): Promise<Institution> {
  const primary = normaliseDomain(input.primaryDomain);
  const extras = (input.extraDomains ?? []).map(normaliseDomain).filter(Boolean);

  return tx(async (client) => {
    const institutionId = id.institution();
    const rows = await client.query<Institution>(
      `INSERT INTO institutions
         (id, name, code, email_domain, city, country, timezone, kind, status,
          licence_expires_at, seat_limit, data_region)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        institutionId,
        input.name,
        input.code,
        primary,
        input.city ?? null,
        input.country,
        input.timezone ?? 'Africa/Addis_Ababa',
        input.kind,
        input.status ?? 'TRIAL',
        input.licenceExpiresAt ?? null,
        input.seatLimit ?? null,
        input.dataRegion ?? input.country,
      ],
    );

    // The primary domain row already exists: cg_sync_institution_email_domain
    // creates it from institutions.email_domain the moment the tenant is
    // inserted. Re-inserting it here would violate the unique constraint, so
    // we only mark it verified. Extra domains are genuinely new rows — if one
    // of those is already claimed, the unique violation is allowed to surface
    // as a 409, which is the point of having the constraint at all.
    await client.query(
      `UPDATE institution_domains SET verified_at = now(), is_primary = true
        WHERE institution_id = $1 AND domain = $2`,
      [institutionId, primary],
    );

    for (const domain of extras.filter((d) => d !== primary)) {
      await client.query(
        `INSERT INTO institution_domains (id, institution_id, domain, is_primary, verified_at)
         VALUES ($1,$2,$3,false, now())`,
        [id.domain(), institutionId, domain],
      );
    }

    return rows.rows[0]!;
  });
}

export type UpdateInstitutionInput = Partial<
  Pick<
    Institution,
    | 'name'
    | 'code'
    | 'kind'
    | 'status'
    | 'city'
    | 'country'
    | 'timezone'
    | 'licence_expires_at'
    | 'seat_limit'
    | 'logo_url'
    | 'brand_primary'
    | 'data_region'
    | 'scan_retention_days'
    | 'report_retention_days'
    | 'audit_retention_days'
    | 'qr_token_rotate_days'
    | 'require_scan_justification'
    | 'allow_aggregate_analytics'
  >
>;

export async function updateInstitution(institutionId: string, patch: UpdateInstitutionInput): Promise<void> {
  const map: Array<[keyof UpdateInstitutionInput, string]> = [
    ['name', 'name'],
    ['code', 'code'],
    ['kind', 'kind'],
    ['status', 'status'],
    ['city', 'city'],
    ['country', 'country'],
    ['timezone', 'timezone'],
    ['licence_expires_at', 'licence_expires_at'],
    ['seat_limit', 'seat_limit'],
    ['logo_url', 'logo_url'],
    ['brand_primary', 'brand_primary'],
    ['data_region', 'data_region'],
    ['scan_retention_days', 'scan_retention_days'],
    ['report_retention_days', 'report_retention_days'],
    ['audit_retention_days', 'audit_retention_days'],
    ['qr_token_rotate_days', 'qr_token_rotate_days'],
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

/**
 * Editing an institution's own profile — the fields an administrator may
 * change. Branding is among them because it is the organisation's own face on
 * its own labels and pages; it grants no access to anything.
 */
export async function updateInstitutionProfile(
  institutionId: string,
  patch: Partial<Pick<Institution, 'name' | 'city' | 'country' | 'timezone' | 'logo_url' | 'brand_primary'>>,
): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [institutionId];
  for (const key of ['name', 'city', 'country', 'timezone', 'logo_url', 'brand_primary'] as const) {
    const value = patch[key];
    if (value === undefined) continue;
    params.push(value);
    fields.push(`${key} = $${params.length}`);
  }
  if (!fields.length) return;
  await query(`UPDATE institutions SET ${fields.join(', ')}, updated_at = now() WHERE id = $1`, params);
}

export async function addDomain(institutionId: string, domain: string): Promise<InstitutionDomain> {
  const clean = normaliseDomain(domain);
  const rows = await query<InstitutionDomain>(
    `INSERT INTO institution_domains (id, institution_id, domain, is_primary, verified_at)
     VALUES ($1,$2,$3,FALSE, now())
     RETURNING *`,
    [id.domain(), institutionId, clean],
  );
  return rows[0]!;
}

export async function removeDomain(institutionId: string, domainId: string): Promise<boolean> {
  const rows = await query(
    `DELETE FROM institution_domains WHERE id = $1 AND institution_id = $2 AND is_primary = FALSE`,
    [domainId, institutionId],
  );
  return (rows as unknown as { rowCount?: number }).rowCount !== 0;
}

/** Counts people with an account, for seat-limit checks. */
export async function countSeatsUsed(institutionId: string): Promise<number> {
  const row = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM users WHERE institution_id = $1 AND deleted_at IS NULL AND role <> 'SECURITY'`,
    [institutionId],
  );
  return Number(row?.n ?? 0);
}

// ---------------------------------------------------------------------------
// Applications to join
// ---------------------------------------------------------------------------

export type CreateRequestInput = {
  organisationName: string;
  kind: InstitutionKind;
  country: string;
  city?: string | null;
  contactName: string;
  contactEmail: string;
  primaryDomain: string;
  extraDomains?: string[];
  estimatedPeople?: number | null;
  message?: string | null;
};

export async function createInstitutionRequest(input: CreateRequestInput): Promise<InstitutionRequest> {
  const rows = await query<InstitutionRequest>(
    `INSERT INTO institution_requests
       (id, organisation_name, kind, country, city, contact_name, contact_email,
        primary_domain, extra_domains, estimated_people, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      id.request(),
      input.organisationName,
      input.kind,
      input.country || 'Ethiopia',
      input.city ?? null,
      input.contactName,
      input.contactEmail,
      normaliseDomain(input.primaryDomain),
      (input.extraDomains ?? []).map(normaliseDomain).filter(Boolean),
      input.estimatedPeople ?? null,
      input.message ?? null,
    ],
  );
  return rows[0]!;
}

export async function listRequests(status: 'NEW' | 'ALL' = 'NEW'): Promise<InstitutionRequest[]> {
  return query<InstitutionRequest>(
    `SELECT * FROM institution_requests
      WHERE ($1::text = 'ALL' OR status = $1)
      ORDER BY created_at DESC`,
    [status],
  );
}

export async function findRequest(requestId: string): Promise<InstitutionRequest | null> {
  return queryOne<InstitutionRequest>('SELECT * FROM institution_requests WHERE id = $1', [requestId]);
}

export async function decideRequest(
  requestId: string,
  decision: 'APPROVED' | 'REJECTED',
  reviewerId: string,
  notes: string | null,
  createdInstitutionId: string | null,
): Promise<void> {
  await query(
    `UPDATE institution_requests
        SET status = $2, reviewed_by_user_id = $3, reviewed_at = now(),
            review_notes = $4, created_institution_id = $5, updated_at = now()
      WHERE id = $1 AND status = 'NEW'`,
    [requestId, decision, reviewerId, notes, createdInstitutionId],
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export async function platformOverview(): Promise<PlatformOverview> {
  const [totals] = await query<{
    organisations: string;
    people: string;
    devices: string;
    scans_30d: string;
    open_reports: string;
    pending_requests: string;
  }>(
    `SELECT (SELECT count(*) FROM institutions WHERE status <> 'CLOSED')::text AS organisations,
            (SELECT count(*) FROM users WHERE deleted_at IS NULL)::text AS people,
            (SELECT count(*) FROM products)::text AS devices,
            (SELECT count(*) FROM scan_events WHERE scanned_at > now() - interval '30 days')::text AS scans_30d,
            (SELECT count(*) FROM missing_reports WHERE status = 'OPEN')::text AS open_reports,
            (SELECT count(*) FROM institution_requests WHERE status = 'NEW')::text AS pending_requests`,
  );

  const byKind = await query<{ kind: InstitutionKind; count: number }>(
    `SELECT kind, count(*)::int AS count FROM institutions WHERE status <> 'CLOSED'
      GROUP BY kind ORDER BY count DESC, kind`,
  );

  const byCountry = await query<{ country: string; count: number }>(
    `SELECT country, count(*)::int AS count FROM institutions WHERE status <> 'CLOSED'
      GROUP BY country ORDER BY count DESC, country`,
  );

  const expiring = await query<{ id: string; name: string; code: string; expiresAt: Date }>(
    `SELECT id, name, code, licence_expires_at AS "expiresAt"
       FROM institutions
      WHERE licence_expires_at IS NOT NULL
        AND licence_expires_at < now() + interval '60 days'
      ORDER BY licence_expires_at ASC
      LIMIT 10`,
  );

  return {
    organisations: Number(totals?.organisations ?? 0),
    organisationsByKind: byKind,
    organisationsByCountry: byCountry,
    people: Number(totals?.people ?? 0),
    devices: Number(totals?.devices ?? 0),
    scans30d: Number(totals?.scans_30d ?? 0),
    openReports: Number(totals?.open_reports ?? 0),
    pendingRequests: Number(totals?.pending_requests ?? 0),
    expiringLicences: expiring,
  };
}

// ---------------------------------------------------------------------------
// Country overview
// ---------------------------------------------------------------------------

export type CountryOverview = {
  country: string;
  /** How many organisations the caller's scope actually matches. */
  matchedOrganisations: number;
  totals: {
    organisations: number;
    people: number;
    devices: number;
    scans30d: number;
    reportsOpen: number;
    reportsRecovered: number;
    /** Percentage of closed reports that ended in a recovery. 0 when nothing has closed. */
    recoveryRate: number;
  };
  /**
   * One row per organisation. Names and counts — deliberately not people: a
   * ministry can reasonably be told how each university is doing, and must not
   * be told who owns what inside any of them.
   */
  organisations: Array<{
    id: string;
    name: string;
    code: string;
    kind: InstitutionKind;
    status: InstitutionStatus;
    city: string | null;
    people: number;
    devices: number;
    scans30d: number;
    reportsOpen: number;
    reportsRecovered: number;
  }>;
  byKind: Array<{ kind: InstitutionKind; count: number }>;
  /** Scans per day for the last 30 days, oldest first. */
  daily: Array<{ day: string; scans: number }>;
};

export async function countryOverview(country: string): Promise<CountryOverview> {
  const totals = await queryOne<{
    organisations: number;
    people: number;
    devices: number;
    scans_30d: number;
    reports_open: number;
    reports_recovered: number;
  }>(
    `WITH orgs AS (SELECT id FROM institutions WHERE country = $1)
     SELECT (SELECT count(*) FROM orgs)::int AS organisations,
            (SELECT count(*) FROM users u JOIN orgs o ON o.id = u.institution_id
              WHERE u.deleted_at IS NULL)::int AS people,
            (SELECT count(*) FROM products p JOIN orgs o ON o.id = p.institution_id)::int AS devices,
            (SELECT count(*) FROM scan_events s JOIN orgs o ON o.id = s.institution_id
              WHERE s.scanned_at > now() - interval '30 days')::int AS scans_30d,
            (SELECT count(*) FROM missing_reports m JOIN orgs o ON o.id = m.institution_id
              WHERE m.status = 'OPEN')::int AS reports_open,
            (SELECT count(*) FROM missing_reports m JOIN orgs o ON o.id = m.institution_id
              WHERE m.status = 'RESOLVED_RECOVERED')::int AS reports_recovered`,
    [country],
  );

  const organisations = await query<{
    id: string;
    name: string;
    code: string;
    kind: InstitutionKind;
    status: InstitutionStatus;
    city: string | null;
    people: number;
    devices: number;
    scans_30d: number;
    reports_open: number;
    reports_recovered: number;
  }>(
    `SELECT i.id, i.name, i.code, i.kind, i.status, i.city,
            (SELECT count(*) FROM users u
              WHERE u.institution_id = i.id AND u.deleted_at IS NULL)::int AS people,
            (SELECT count(*) FROM products p WHERE p.institution_id = i.id)::int AS devices,
            (SELECT count(*) FROM scan_events s
              WHERE s.institution_id = i.id
                AND s.scanned_at > now() - interval '30 days')::int AS scans_30d,
            (SELECT count(*) FROM missing_reports m
              WHERE m.institution_id = i.id AND m.status = 'OPEN')::int AS reports_open,
            (SELECT count(*) FROM missing_reports m
              WHERE m.institution_id = i.id AND m.status = 'RESOLVED_RECOVERED')::int AS reports_recovered
       FROM institutions i
      WHERE i.country = $1
      ORDER BY i.name`,
    [country],
  );

  const byKind = await query<{ kind: InstitutionKind; count: number }>(
    `SELECT kind, count(*)::int AS count FROM institutions
      WHERE country = $1 GROUP BY kind ORDER BY count DESC, kind`,
    [country],
  );

  const daily = await query<{ day: string; scans: number }>(
    `SELECT to_char(date_trunc('day', s.scanned_at), 'YYYY-MM-DD') AS day, count(*)::int AS scans
       FROM scan_events s
       JOIN institutions i ON i.id = s.institution_id
      WHERE i.country = $1
        AND s.scanned_at > now() - interval '30 days'
      GROUP BY 1 ORDER BY 1`,
    [country],
  );

  const recovered = Number(totals?.reports_recovered ?? 0);
  const open = Number(totals?.reports_open ?? 0);

  return {
    country,
    matchedOrganisations: organisations.length,
    totals: {
      organisations: Number(totals?.organisations ?? 0),
      people: Number(totals?.people ?? 0),
      devices: Number(totals?.devices ?? 0),
      scans30d: Number(totals?.scans_30d ?? 0),
      reportsOpen: open,
      reportsRecovered: recovered,
      recoveryRate: open + recovered === 0 ? 0 : Math.round((recovered / (open + recovered)) * 100),
    },
    organisations: organisations.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      kind: row.kind,
      status: row.status,
      city: row.city,
      people: row.people,
      devices: row.devices,
      scans30d: row.scans_30d,
      reportsOpen: row.reports_open,
      reportsRecovered: row.reports_recovered,
    })),
    byKind,
    daily,
  };
}

// ---------------------------------------------------------------------------
// Platform audit log
// ---------------------------------------------------------------------------

export type PlatformAuditInput = {
  actorUserId: string | null;
  actorEmail: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

export async function logPlatformAudit(input: PlatformAuditInput): Promise<void> {
  try {
    await query(
      `INSERT INTO platform_audit_logs
         (id, actor_user_id, actor_email, action, entity_type, entity_id, metadata, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,
      [
        id.audit(),
        input.actorUserId,
        input.actorEmail,
        input.action,
        input.entityType ?? null,
        input.entityId ?? null,
        JSON.stringify(input.metadata ?? {}),
        input.ip ?? null,
        input.userAgent ?? null,
      ],
    );
  } catch (error) {
    // Same policy as the tenant audit log: never let logging break the action,
    // but make the failure impossible to miss.
    console.error('[platform-audit] write failed', error);
  }
}

export async function listPlatformAudit(limit = 100): Promise<PlatformAuditLog[]> {
  return query<PlatformAuditLog>(
    'SELECT * FROM platform_audit_logs ORDER BY created_at DESC LIMIT $1',
    [limit],
  );
}
