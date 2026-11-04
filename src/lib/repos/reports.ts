import { query, queryOne, tx } from '../db';
import { id } from '../ids';
import type { FoundReport, FoundReportStatus, MissingReport, MissingReportStatus, ReportCategory } from '../types';

// ---------------------------------------------------------------------------
// Missing reports
// ---------------------------------------------------------------------------

export type MissingReportRow = MissingReport & {
  product_label: string;
  product_type: string;
  brand: string;
  model: string;
  token: string | null;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  owner_student_id: string | null;
  reporter_name: string;
};

const MISSING_SELECT = `
  SELECT mr.*,
         (p.type || ' ' || p.brand || ' ' || p.model) AS product_label,
         p.type AS product_type, p.brand, p.model, p.owner_id,
         (SELECT pi.value FROM product_identifiers pi
           WHERE pi.product_id = p.id AND pi.kind = 'QR_TOKEN' AND pi.revoked_at IS NULL
           ORDER BY pi.is_primary DESC, pi.created_at ASC LIMIT 1) AS token,
         u.full_name AS owner_name, u.email AS owner_email,
         sp.student_id AS owner_student_id,
         rep.full_name AS reporter_name
  FROM missing_reports mr
  JOIN products p   ON p.id = mr.product_id
  JOIN users u      ON u.id = p.owner_id
  LEFT JOIN student_profiles sp ON sp.user_id = u.id
  JOIN users rep    ON rep.id = mr.reporter_id
`;

export async function createMissingReport(input: {
  institutionId: string;
  productId: string;
  reporterId: string;
  category: ReportCategory;
  description?: string | null;
  lastKnownLocation?: string | null;
  occurredAt?: Date | null;
  channel?: string;
}): Promise<MissingReport> {
  return tx(async (client) => {
    const { rows } = await client.query<MissingReport>(
      `INSERT INTO missing_reports
         (id, institution_id, product_id, reporter_id, category, description, last_known_location, occurred_at, channel)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        id.missingReport(),
        input.institutionId,
        input.productId,
        input.reporterId,
        input.category,
        input.description ?? null,
        input.lastKnownLocation ?? null,
        input.occurredAt ?? null,
        input.channel ?? 'CAMPUSGUARD',
      ],
    );

    await client.query(`UPDATE products SET status = 'REPORTED_MISSING', updated_at = now() WHERE id = $1`, [
      input.productId,
    ]);

    return rows[0]!;
  });
}

export async function findOpenMissingByProduct(productId: string): Promise<MissingReport | null> {
  return queryOne<MissingReport>(
    `SELECT * FROM missing_reports WHERE product_id = $1 AND status = 'OPEN' ORDER BY reported_at DESC LIMIT 1`,
    [productId],
  );
}

export async function findMissingReportById(reportId: string): Promise<MissingReportRow | null> {
  return queryOne<MissingReportRow>(`${MISSING_SELECT} WHERE mr.id = $1`, [reportId]);
}

export type MissingFilters = {
  status?: MissingReportStatus | 'ALL';
  category?: ReportCategory | 'ALL';
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listMissingReports(institutionId: string, filters: MissingFilters = {}) {
  const params: unknown[] = [institutionId];
  const where = ['mr.institution_id = $1'];

  if (filters.status && filters.status !== 'ALL') {
    params.push(filters.status);
    where.push(`mr.status = $${params.length}`);
  }
  if (filters.category && filters.category !== 'ALL') {
    params.push(filters.category);
    where.push(`mr.category = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    const p = `$${params.length}`;
    where.push(`(p.brand ILIKE ${p} OR p.model ILIKE ${p} OR p.serial_number ILIKE ${p}
                 OR u.full_name ILIKE ${p} OR sp.student_id ILIKE ${p} OR mr.last_known_location ILIKE ${p})`);
  }

  const clause = `WHERE ${where.join(' AND ')}`;
  const [{ total } = { total: 0 }] = await query<{ total: number }>(
    `SELECT count(*)::int AS total FROM missing_reports mr
       JOIN products p ON p.id = mr.product_id
       JOIN users u    ON u.id = p.owner_id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
     ${clause}`,
    params,
  );

  const limit = Math.min(filters.limit ?? 50, 200);
  const offset = filters.offset ?? 0;
  params.push(limit, offset);
  const rows = await query<MissingReportRow>(
    `${MISSING_SELECT} ${clause}
     ORDER BY CASE WHEN mr.status = 'OPEN' THEN 0 ELSE 1 END, mr.reported_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { rows, total };
}

export async function listMissingReportsForOwner(ownerId: string): Promise<MissingReportRow[]> {
  return query<MissingReportRow>(
    `${MISSING_SELECT} WHERE p.owner_id = $1 ORDER BY mr.reported_at DESC`,
    [ownerId],
  );
}

/**
 * Closes a missing report.
 *
 * RESOLVED_RECOVERED returns the device to ACTIVE service; every other outcome
 * leaves the product flagged so that a scan still shows history to an officer
 * without re-opening the report.
 */
export async function resolveMissingReport(
  reportId: string,
  status: MissingReportStatus,
  handledById: string,
  notes?: string | null,
): Promise<void> {
  await tx(async (client) => {
    const { rows } = await client.query<MissingReport>(
      `UPDATE missing_reports
          SET status = $2, resolved_at = now(), resolution_notes = $3, handled_by_id = $4
        WHERE id = $1
        RETURNING *`,
      [reportId, status, notes ?? null, handledById],
    );
    const report = rows[0];
    if (!report) return;

    if (status === 'RESOLVED_RECOVERED') {
      await client.query(
        `UPDATE products SET status = 'RECOVERED', updated_at = now() WHERE id = $1`,
        [report.product_id],
      );
      await client.query(
        `INSERT INTO ownerships (id, product_id, owner_id, event, note)
         VALUES ($1,$2,$3,'RECOVERED',$4)`,
        [id.ownership(), report.product_id, report.reporter_id, notes ?? 'Recovered via CampusGuard'],
      );
    } else if (status === 'WITHDRAWN') {
      await client.query(`UPDATE products SET status = 'ACTIVE', updated_at = now() WHERE id = $1`, [
        report.product_id,
      ]);
    }

    // Any pending found reports for the same device follow the outcome.
    await client.query(
      `UPDATE found_reports
          SET status = CASE WHEN $2 = 'RESOLVED_RECOVERED' THEN 'RETURNED'::text ELSE 'DISPOSED'::text END,
              matched_missing_report_id = COALESCE(matched_missing_report_id, $1),
              returned_at = CASE WHEN $2 = 'RESOLVED_RECOVERED' THEN now() ELSE returned_at END
        WHERE product_id = $3 AND status IN ('PENDING','MATCHED')`,
      [reportId, status, report.product_id],
    );
  });
}

// ---------------------------------------------------------------------------
// Found reports
// ---------------------------------------------------------------------------

export type FoundReportRow = FoundReport & {
  product_label: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_student_id: string | null;
  reporter_name: string | null;
};

const FOUND_SELECT = `
  SELECT fr.*,
         (p.type || ' ' || p.brand || ' ' || p.model) AS product_label,
         u.full_name AS owner_name, u.email AS owner_email, sp.student_id AS owner_student_id,
         rep.full_name AS reporter_name
  FROM found_reports fr
  LEFT JOIN products p ON p.id = fr.product_id
  LEFT JOIN users u    ON u.id = p.owner_id
  LEFT JOIN student_profiles sp ON sp.user_id = u.id
  LEFT JOIN users rep  ON rep.id = fr.reporter_id
`;

export async function createFoundReport(input: {
  institutionId: string;
  productId?: string | null;
  tokenScanned?: string | null;
  reporterId?: string | null;
  finderName?: string | null;
  finderContact?: string | null;
  location?: string | null;
  description?: string | null;
  foundAt?: Date | null;
}): Promise<FoundReport> {
  const reportId = id.foundReport();

  return tx(async (client) => {
    // If the device has an open missing report, match immediately: this is the
    // moment the whole platform exists for.
    const match = input.productId
      ? (
          await client.query<{ id: string }>(
            `SELECT id FROM missing_reports WHERE product_id = $1 AND status = 'OPEN'
              ORDER BY reported_at DESC LIMIT 1`,
            [input.productId],
          )
        ).rows[0]
      : undefined;

    const { rows } = await client.query<FoundReport>(
      `INSERT INTO found_reports
         (id, institution_id, product_id, token_scanned, reporter_id, finder_name, finder_contact,
          location, description, found_at, status, matched_missing_report_id, matched_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10::timestamptz, now()),$11,$12,$13)
       RETURNING *`,
      [
        reportId,
        input.institutionId,
        input.productId ?? null,
        input.tokenScanned ?? null,
        input.reporterId ?? null,
        input.finderName ?? null,
        input.finderContact ?? null,
        input.location ?? null,
        input.description ?? null,
        input.foundAt ?? null,
        match ? 'MATCHED' : 'PENDING',
        match?.id ?? null,
        match ? new Date() : null,
      ],
    );
    return rows[0]!;
  });
}

export async function listFoundReports(institutionId: string, filters: { status?: FoundReportStatus | 'ALL'; limit?: number; offset?: number } = {}) {
  const params: unknown[] = [institutionId];
  const where = ['fr.institution_id = $1'];
  if (filters.status && filters.status !== 'ALL') {
    params.push(filters.status);
    where.push(`fr.status = $${params.length}`);
  }
  const clause = `WHERE ${where.join(' AND ')}`;

  const [{ total } = { total: 0 }] = await query<{ total: number }>(
    `SELECT count(*)::int AS total FROM found_reports fr ${clause}`,
    params,
  );

  const limit = Math.min(filters.limit ?? 50, 200);
  const offset = filters.offset ?? 0;
  params.push(limit, offset);
  const rows = await query<FoundReportRow>(
    `${FOUND_SELECT} ${clause}
     ORDER BY CASE WHEN fr.status IN ('PENDING','MATCHED') THEN 0 ELSE 1 END, fr.found_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { rows, total };
}

export async function findFoundReportById(reportId: string): Promise<FoundReportRow | null> {
  return queryOne<FoundReportRow>(`${FOUND_SELECT} WHERE fr.id = $1`, [reportId]);
}

/** Records that the device was handed back to its owner. */
export async function markFoundReturned(
  reportId: string,
  handledById: string,
  opts: { notes?: string | null; custodyLocation?: string | null } = {},
): Promise<void> {
  await tx(async (client) => {
    const { rows } = await client.query<FoundReport>(
      `UPDATE found_reports
          SET status = 'RETURNED', returned_at = now(), return_notes = $2, custody_location = $3, handled_by_id = $4
        WHERE id = $1
        RETURNING *`,
      [reportId, opts.notes ?? null, opts.custodyLocation ?? null, handledById],
    );
    const found = rows[0];
    if (!found) return;

    if (found.matched_missing_report_id) {
      await client.query(
        `UPDATE missing_reports
            SET status = 'RESOLVED_RECOVERED', resolved_at = now(),
                resolution_notes = COALESCE($2, 'Recovered through CampusGuard'), handled_by_id = $3
          WHERE id = $1 AND status = 'OPEN'`,
        [found.matched_missing_report_id, opts.notes ?? null, handledById],
      );
    }
    if (found.product_id) {
      await client.query(`UPDATE products SET status = 'RECOVERED', updated_at = now() WHERE id = $1`, [
        found.product_id,
      ]);
    }
  });
}

export async function matchFoundReport(foundId: string, missingId: string): Promise<void> {
  await query(
    `UPDATE found_reports SET matched_missing_report_id = $2, matched_at = now(),
            status = CASE WHEN status = 'PENDING' THEN 'MATCHED' ELSE status END
      WHERE id = $1`,
    [foundId, missingId],
  );
}
