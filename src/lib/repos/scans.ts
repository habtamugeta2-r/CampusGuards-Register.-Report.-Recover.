import { query, queryOne, tx } from '../db';
import { id } from '../ids';
import type { ScanEvent, ScanResult, ScanSource } from '../types';

export type ScanEventRow = ScanEvent & {
  officer_name: string;
  checkpoint_name: string | null;
  product_label: string | null;
  carrier_label: string | null;
};

const SCAN_SELECT = `
  SELECT s.*,
         u.full_name AS officer_name,
         c.name AS checkpoint_name,
         (p.type || ' ' || p.brand || ' ' || p.model) AS product_label,
         cu.full_name AS carrier_label
  FROM scan_events s
  JOIN users u ON u.id = s.scanned_by_id
  LEFT JOIN checkpoints c ON c.id = s.checkpoint_id
  LEFT JOIN products p    ON p.id = s.product_id
  LEFT JOIN users cu      ON cu.id = s.carrier_id
`;

export type RecordScanInput = {
  institutionId: string;
  checkpointId?: string | null;
  productId?: string | null;
  token: string;
  scannedById: string;
  result: ScanResult;
  source?: ScanSource;
  carrierId?: string | null;
  carrierName?: string | null;
  carrierIdShown?: boolean;
  note?: string | null;
  durationMs?: number | null;
  scannedAt?: Date | null;
  syncBatchId?: string | null;
};

export async function recordScan(input: RecordScanInput): Promise<ScanEvent> {
  const rows = await query<ScanEvent>(
    `INSERT INTO scan_events
       (id, institution_id, checkpoint_id, product_id, token_scanned, scanned_by_id, result, source,
        carrier_id, carrier_name, carrier_id_shown, note, duration_ms, scanned_at, sync_batch_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,COALESCE($14::timestamptz, now()),$15)
     RETURNING *`,
    [
      id.scan(),
      input.institutionId,
      input.checkpointId ?? null,
      input.productId ?? null,
      input.token,
      input.scannedById,
      input.result,
      input.source ?? 'LIVE',
      input.carrierId ?? null,
      input.carrierName ?? null,
      input.carrierIdShown ?? false,
      input.note ?? null,
      input.durationMs ?? null,
      input.scannedAt ?? null,
      input.syncBatchId ?? null,
    ],
  );
  return rows[0]!;
}

/** Flushes a batch of scans captured while an officer's device was offline. */
export async function recordScanBatch(
  institutionId: string,
  scannedById: string,
  batchId: string,
  checkpointId: string | null,
  scans: Array<RecordScanInput>,
): Promise<number> {
  return tx(async (client) => {
    let written = 0;
    for (const scan of scans) {
      await client.query(
        `INSERT INTO scan_events
           (id, institution_id, checkpoint_id, product_id, token_scanned, scanned_by_id, result, source,
            carrier_id, carrier_name, carrier_id_shown, note, duration_ms, scanned_at, sync_batch_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'OFFLINE_CACHE',$8,$9,$10,$11,$12,COALESCE($13::timestamptz, now()),$14)`,
        [
          id.scan(),
          institutionId,
          checkpointId,
          scan.productId ?? null,
          scan.token,
          scannedById,
          scan.result,
          scan.carrierId ?? null,
          scan.carrierName ?? null,
          scan.carrierIdShown ?? false,
          scan.note ?? null,
          scan.durationMs ?? null,
          scan.scannedAt ?? null,
          batchId,
        ],
      );
      written += 1;
    }
    return written;
  });
}

export type ScanFilters = {
  result?: ScanResult | 'ALL';
  checkpointId?: string | 'ALL';
  officerId?: string | 'ALL';
  source?: ScanSource | 'ALL';
  from?: Date | null;
  to?: Date | null;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listScanEvents(institutionId: string, filters: ScanFilters = {}) {
  const params: unknown[] = [institutionId];
  const where = ['s.institution_id = $1'];

  if (filters.result && filters.result !== 'ALL') {
    params.push(filters.result);
    where.push(`s.result = $${params.length}`);
  }
  if (filters.checkpointId && filters.checkpointId !== 'ALL') {
    params.push(filters.checkpointId);
    where.push(`s.checkpoint_id = $${params.length}`);
  }
  if (filters.officerId && filters.officerId !== 'ALL') {
    params.push(filters.officerId);
    where.push(`s.scanned_by_id = $${params.length}`);
  }
  if (filters.source && filters.source !== 'ALL') {
    params.push(filters.source);
    where.push(`s.source = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    where.push(`s.recorded_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    where.push(`s.recorded_at <= $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    const p = `$${params.length}`;
    where.push(`(s.token_scanned ILIKE ${p} OR cu.full_name ILIKE ${p} OR p.serial_number ILIKE ${p})`);
  }

  const clause = `WHERE ${where.join(' AND ')}`;
  const [{ total } = { total: 0 }] = await query<{ total: number }>(
    `SELECT count(*)::int AS total FROM scan_events s
       LEFT JOIN products p ON p.id = s.product_id
       LEFT JOIN users cu  ON cu.id = s.carrier_id
     ${clause}`,
    params,
  );

  const limit = Math.min(filters.limit ?? 50, 200);
  const offset = filters.offset ?? 0;
  params.push(limit, offset);
  const rows = await query<ScanEventRow>(
    `${SCAN_SELECT} ${clause} ORDER BY s.recorded_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { rows, total };
}

/**
 * An individual student's scan history.
 *
 * This is the most surveillance-sensitive query in the system. Callers MUST
 * supply a written justification and the access must be audit-logged by the
 * caller (see /api/admin/scan-history).
 */
export async function scanHistoryForCarrier(
  institutionId: string,
  carrierId: string,
  limit = 100,
): Promise<ScanEventRow[]> {
  return query<ScanEventRow>(
    `${SCAN_SELECT}
     WHERE s.institution_id = $1 AND s.carrier_id = $2
     ORDER BY s.recorded_at DESC
     LIMIT $3`,
    [institutionId, carrierId, limit],
  );
}

export type ScanStats = {
  total: number;
  offline: number;
  avgDurationMs: number | null;
  byResult: Record<string, number>;
  byCheckpoint: Array<{ checkpoint: string | null; count: number; avg_duration_ms: number | null }>;
  perDay: Array<{ day: string; count: number }>;
};

export async function scanStats(institutionId: string, from?: Date | null, to?: Date | null): Promise<ScanStats> {
  const params: unknown[] = [institutionId];
  let range = '';
  if (from) {
    params.push(from);
    range += ` AND s.recorded_at >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    range += ` AND s.recorded_at <= $${params.length}`;
  }

  const [summary] = await query<{ total: number; offline: number; avg_duration_ms: number | null }>(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE s.source = 'OFFLINE_CACHE')::int AS offline,
            round(avg(s.duration_ms))::int AS avg_duration_ms
       FROM scan_events s
      WHERE s.institution_id = $1${range}`,
    params,
  );

  const byResultRows = await query<{ result: ScanResult; count: number }>(
    `SELECT s.result, count(*)::int AS count FROM scan_events s
      WHERE s.institution_id = $1${range} GROUP BY s.result`,
    params,
  );

  const byCheckpoint = await query<{ checkpoint: string | null; count: number; avg_duration_ms: number | null }>(
    `SELECT c.name AS checkpoint, count(*)::int AS count, round(avg(s.duration_ms))::int AS avg_duration_ms
       FROM scan_events s
       LEFT JOIN checkpoints c ON c.id = s.checkpoint_id
      WHERE s.institution_id = $1${range}
      GROUP BY c.name
      ORDER BY count DESC`,
    params,
  );

  const perDay = await query<{ day: string; count: number }>(
    `SELECT to_char(date_trunc('day', s.recorded_at), 'YYYY-MM-DD') AS day, count(*)::int AS count
       FROM scan_events s
      WHERE s.institution_id = $1${range}
      GROUP BY 1 ORDER BY 1 DESC LIMIT 60`,
    params,
  );

  return {
    total: summary?.total ?? 0,
    offline: summary?.offline ?? 0,
    avgDurationMs: summary?.avg_duration_ms ?? null,
    byResult: Object.fromEntries(byResultRows.map((r) => [r.result, r.count])),
    byCheckpoint,
    perDay,
  };
}

export async function duplicateTokenScans(institutionId: string, since: Date): Promise<Array<{ token_scanned: string; locations: number; scans: number }>> {
  return query(
    `SELECT s.token_scanned,
            count(DISTINCT s.checkpoint_id)::int AS locations,
            count(*)::int AS scans
       FROM scan_events s
      WHERE s.institution_id = $1 AND s.recorded_at >= $2 AND s.product_id IS NOT NULL
      GROUP BY s.token_scanned
     HAVING count(DISTINCT s.checkpoint_id) > 1
      ORDER BY locations DESC, scans DESC
      LIMIT 50`,
    [institutionId, since],
  );
}
