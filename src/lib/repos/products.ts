import { query, queryOne, tx } from '../db';
import { id } from '../ids';
import { generateQrToken, MAX_TOKEN_ATTEMPTS } from '../tokens';
import { conflict } from '../http';
import type { Product, ProductIdentifier, ProductStatus, ProductType } from '../types';

export type ProductRow = Product & {
  owner_name: string;
  owner_email: string;
  owner_student_id: string | null;
  owner_status: string;
  token: string | null;
  active_missing_report_id: string | null;
};

const PRODUCT_SELECT = `
  SELECT p.*,
         u.full_name AS owner_name,
         u.email     AS owner_email,
         sp.student_id AS owner_student_id,
         u.status    AS owner_status,
         (SELECT pi.value FROM product_identifiers pi
           WHERE pi.product_id = p.id AND pi.kind = 'QR_TOKEN' AND pi.revoked_at IS NULL
           ORDER BY pi.is_primary DESC, pi.created_at ASC LIMIT 1) AS token,
         (SELECT mr.id FROM missing_reports mr
           WHERE mr.product_id = p.id AND mr.status = 'OPEN'
           ORDER BY mr.reported_at DESC LIMIT 1) AS active_missing_report_id
  FROM products p
  JOIN users u ON u.id = p.owner_id
  LEFT JOIN student_profiles sp ON sp.user_id = u.id
`;

export async function findProductById(productId: string): Promise<ProductRow | null> {
  return queryOne<ProductRow>(`${PRODUCT_SELECT} WHERE p.id = $1`, [productId]);
}

export async function findProductByIdFor(productId: string, ownerId: string): Promise<ProductRow | null> {
  return queryOne<ProductRow>(`${PRODUCT_SELECT} WHERE p.id = $1 AND p.owner_id = $2`, [productId, ownerId]);
}

/** The lookup used by checkpoint scanning and the public status page. */
export async function findProductByToken(token: string): Promise<ProductRow | null> {
  return queryOne<ProductRow>(
    `SELECT p.*,
            u.full_name AS owner_name,
            u.email     AS owner_email,
            sp.student_id AS owner_student_id,
            u.status    AS owner_status,
            pi.value    AS token,
            (SELECT mr.id FROM missing_reports mr
              WHERE mr.product_id = p.id AND mr.status = 'OPEN'
              ORDER BY mr.reported_at DESC LIMIT 1) AS active_missing_report_id
     FROM product_identifiers pi
     JOIN products p ON p.id = pi.product_id
     JOIN users u    ON u.id = p.owner_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE pi.value = $1
       AND pi.revoked_at IS NULL
       -- See offlineManifest: a deleted owner's label resolves to
       -- "not registered" rather than showing an erased person's name.
       AND u.deleted_at IS NULL`,
    [token],
  );
}

export type CreateProductInput = {
  institutionId: string;
  ownerId: string;
  type: ProductType;
  brand: string;
  model: string;
  serialNumber?: string | null;
  color?: string | null;
  distinguishingMarks?: string | null;
  notes?: string | null;
};

/** Creates the product, its QR identifier and the first ownership record. */
export async function createProduct(input: CreateProductInput): Promise<{ product: Product; token: string }> {
  const productId = id.product();

  return tx(async (client) => {
    const { rows } = await client.query<Product>(
      `INSERT INTO products
         (id, institution_id, owner_id, type, brand, model, serial_number, color, distinguishing_marks, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        productId,
        input.institutionId,
        input.ownerId,
        input.type,
        input.brand,
        input.model,
        input.serialNumber || null,
        input.color || null,
        input.distinguishingMarks || null,
        input.notes || null,
      ],
    );
    const product = rows[0]!;

    const token = await insertQrIdentifier(client, productId);

    if (input.serialNumber) {
      await client.query(
        `INSERT INTO product_identifiers (id, product_id, kind, value, is_primary)
         VALUES ($1,$2,'SERIAL',$3,false)`,
        [id.identifier(), productId, input.serialNumber],
      );
    }

    await client.query(
      `INSERT INTO ownerships (id, product_id, owner_id, event) VALUES ($1,$2,$3,'REGISTERED')`,
      [id.ownership(), productId, input.ownerId],
    );

    return { product, token };
  });
}

type Executor = { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

/** Generates a fresh opaque QR token, retrying on the (astronomically rare) collision. */
async function insertQrIdentifier(client: Executor, productId: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt++) {
    const token = generateQrToken();
    try {
      await client.query(
        `INSERT INTO product_identifiers (id, product_id, kind, value, is_primary)
         VALUES ($1,$2,'QR_TOKEN',$3,true)`,
        [id.identifier(), productId, token],
      );
      return token;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') continue;
      throw error;
    }
  }
  throw new Error('Could not generate a unique QR token.');
}

/** Issues a replacement label (old code stops working immediately). */
export async function rotateQrToken(productId: string, reason = 'Replaced by owner'): Promise<string> {
  return tx(async (client) => {
    await client.query(
      `UPDATE product_identifiers SET revoked_at = now(), revoked_reason = $2
        WHERE product_id = $1 AND kind = 'QR_TOKEN' AND revoked_at IS NULL`,
      [productId, reason],
    );
    return insertQrIdentifier(client, productId);
  });
}

export async function listProductIdentifiers(productId: string): Promise<ProductIdentifier[]> {
  return query<ProductIdentifier>(
    'SELECT * FROM product_identifiers WHERE product_id = $1 ORDER BY created_at DESC',
    [productId],
  );
}

export async function updateProduct(
  productId: string,
  patch: Partial<Pick<Product, 'brand' | 'model' | 'serial_number' | 'color' | 'distinguishing_marks' | 'notes' | 'type'>>,
): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [productId];
  const map: Record<string, unknown> = {
    brand: patch.brand,
    model: patch.model,
    serial_number: patch.serial_number,
    color: patch.color,
    distinguishing_marks: patch.distinguishing_marks,
    notes: patch.notes,
    type: patch.type,
  };
  for (const [column, value] of Object.entries(map)) {
    if (value === undefined) continue;
    params.push(value ?? null);
    fields.push(`${column} = $${params.length}`);
  }
  if (!fields.length) return;
  await query(`UPDATE products SET ${fields.join(', ')}, updated_at = now() WHERE id = $1`, params);
}

export async function setProductStatus(productId: string, status: ProductStatus, reason?: string): Promise<void> {
  await query(
    `UPDATE products
        SET status = $2,
            retired_at = CASE WHEN $2 = 'RETIRED' THEN now() ELSE NULL END,
            retired_reason = CASE WHEN $2 = 'RETIRED' THEN $3 ELSE NULL END,
            updated_at = now()
      WHERE id = $1`,
    [productId, status, reason ?? null],
  );
}

export async function listProductsByOwner(ownerId: string): Promise<ProductRow[]> {
  return query<ProductRow>(
    `${PRODUCT_SELECT} WHERE p.owner_id = $1 ORDER BY p.registered_at DESC`,
    [ownerId],
  );
}

export type ProductFilters = {
  status?: ProductStatus | 'ALL';
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listProducts(institutionId: string, filters: ProductFilters = {}) {
  const params: unknown[] = [institutionId];
  const where = ['p.institution_id = $1'];

  if (filters.status && filters.status !== 'ALL') {
    params.push(filters.status);
    where.push(`p.status = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    const p = `$${params.length}`;
    where.push(`(p.brand ILIKE ${p} OR p.model ILIKE ${p} OR p.serial_number ILIKE ${p}
                 OR u.full_name ILIKE ${p} OR sp.student_id ILIKE ${p}
                 OR EXISTS (SELECT 1 FROM product_identifiers pi WHERE pi.product_id = p.id AND pi.value ILIKE ${p}))`);
  }

  const clause = `WHERE ${where.join(' AND ')}`;
  const [{ total } = { total: 0 }] = await query<{ total: number }>(
    `SELECT count(*)::int AS total FROM products p
       JOIN users u ON u.id = p.owner_id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
     ${clause}`,
    params,
  );

  const limit = Math.min(filters.limit ?? 50, 200);
  const offset = filters.offset ?? 0;
  params.push(limit, offset);
  const rows = await query<ProductRow>(
    `${PRODUCT_SELECT} ${clause} ORDER BY p.registered_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return { rows, total };
}

export async function countProductsByStatus(institutionId: string): Promise<Record<string, number>> {
  const rows = await query<{ status: ProductStatus; count: number }>(
    `SELECT status, count(*)::int AS count FROM products WHERE institution_id = $1 GROUP BY status`,
    [institutionId],
  );
  return Object.fromEntries(rows.map((r) => [r.status, r.count]));
}

/** Rows pushed to a security officer's device for offline verification. */
export type OfflineManifestRow = {
  token: string;
  status: ProductStatus;
  label: string;
  owner: string;
  owner_id: string;
  flagged: boolean;
};

export async function offlineManifest(institutionId: string, limit = 20000): Promise<OfflineManifestRow[]> {
  const rows = await query<OfflineManifestRow>(
    `SELECT pi.value AS token,
            p.status,
            (p.type || ' ' || p.brand || ' ' || p.model) AS label,
            u.full_name AS owner,
            p.owner_id,
            EXISTS (SELECT 1 FROM missing_reports mr WHERE mr.product_id = p.id AND mr.status = 'OPEN') AS flagged
       FROM product_identifiers pi
       JOIN products p ON p.id = pi.product_id
       JOIN users u    ON u.id = p.owner_id
      WHERE p.institution_id = $1
        AND pi.kind = 'QR_TOKEN'
        AND pi.revoked_at IS NULL
        AND p.status <> 'RETIRED'
        -- A deleted account means the person asked to be removed. Their device
        -- must not keep circulating on every officer's phone with their name
        -- attached, so it leaves the registry snapshot immediately. Historical
        -- reports and scan events are untouched: those are governed by the
        -- retention windows, not by this filter.
        AND u.deleted_at IS NULL
      ORDER BY p.registered_at DESC
      LIMIT $2`,
    [institutionId, limit],
  );
  return rows;
}
