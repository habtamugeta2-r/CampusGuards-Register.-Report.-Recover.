import { query, queryOne, tx } from '../db';
import { id } from '../ids';
import type { BorrowAuthorization } from '../types';

export type BorrowRow = BorrowAuthorization & {
  borrower_name: string;
  borrower_student_id: string | null;
  product_label: string;
  owner_name: string;
};

const BORROW_SELECT = `
  SELECT b.*,
         ub.full_name AS borrower_name,
         sb.student_id AS borrower_student_id,
         (p.type || ' ' || p.brand || ' ' || p.model) AS product_label,
         uo.full_name AS owner_name
  FROM borrow_authorizations b
  JOIN users ub   ON ub.id = b.borrower_id
  JOIN users uo   ON uo.id = b.owner_id
  JOIN products p ON p.id = b.product_id
  LEFT JOIN student_profiles sb ON sb.user_id = ub.id
`;

/** Accepts a student ID number or an institutional email address. */
export async function resolveBorrower(
  institutionId: string,
  identifier: string,
): Promise<{ id: string; full_name: string } | null> {
  const needle = identifier.trim().toLowerCase();
  return queryOne<{ id: string; full_name: string }>(
    `SELECT u.id, u.full_name
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.institution_id = $1
        AND u.deleted_at IS NULL
        AND (lower(u.email) = $2 OR lower(sp.student_id) = $2)
      LIMIT 1`,
    [institutionId, needle],
  );
}

export async function createAuthorization(input: {
  productId: string;
  ownerId: string;
  borrowerId: string;
  borrowerIdentifier: string;
  endsAt: Date;
  reason?: string | null;
}): Promise<BorrowAuthorization> {
  const rows = await query<BorrowAuthorization>(
    `INSERT INTO borrow_authorizations
       (id, product_id, owner_id, borrower_id, borrower_identifier, reason, ends_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      id.borrow(),
      input.productId,
      input.ownerId,
      input.borrowerId,
      input.borrowerIdentifier,
      input.reason ?? null,
      input.endsAt,
    ],
  );
  return rows[0]!;
}

/** The check used during verification: is this carrier currently authorised? */
export async function hasActiveAuthorization(productId: string, borrowerId: string): Promise<boolean> {
  const row = await queryOne<{ ok: boolean }>(
    `SELECT true AS ok FROM borrow_authorizations
      WHERE product_id = $1 AND borrower_id = $2
        AND revoked_at IS NULL AND starts_at <= now() AND ends_at >= now()
      LIMIT 1`,
    [productId, borrowerId],
  );
  return Boolean(row?.ok);
}

/** Authorisations currently in force for a product (any borrower). */
export async function activeAuthorizationsForProduct(productId: string): Promise<BorrowRow[]> {
  return query<BorrowRow>(
    `${BORROW_SELECT}
     WHERE b.product_id = $1 AND b.revoked_at IS NULL AND b.starts_at <= now() AND b.ends_at >= now()
     ORDER BY b.ends_at ASC`,
    [productId],
  );
}

export async function listAuthorizationsForOwner(ownerId: string): Promise<BorrowRow[]> {
  return query<BorrowRow>(
    `${BORROW_SELECT} WHERE b.owner_id = $1 ORDER BY b.created_at DESC LIMIT 100`,
    [ownerId],
  );
}

export async function listAuthorizationsForBorrower(borrowerId: string): Promise<BorrowRow[]> {
  return query<BorrowRow>(
    `${BORROW_SELECT} WHERE b.borrower_id = $1 ORDER BY b.created_at DESC LIMIT 100`,
    [borrowerId],
  );
}

export async function findAuthorizationById(authId: string): Promise<BorrowAuthorization | null> {
  return queryOne<BorrowAuthorization>('SELECT * FROM borrow_authorizations WHERE id = $1', [authId]);
}

export async function revokeAuthorization(authId: string, revokedById: string): Promise<void> {
  await tx(async (client) => {
    await client.query(
      `UPDATE borrow_authorizations SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`,
      [authId],
    );
    void revokedById;
  });
}
