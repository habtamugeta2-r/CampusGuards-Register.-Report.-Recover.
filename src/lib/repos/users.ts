import { query, queryOne, tx } from '../db';
import { id } from '../ids';
import type { Role, SafeUser, StudentProfile, User, UserStatus } from '../types';

export const USER_COLUMNS = `id, institution_id, email, password_hash, full_name, phone, role, status,
  last_login_at, password_changed_at, failed_login_count, locked_until, created_at, updated_at, deleted_at`;
export const SAFE_USER_COLUMNS = `id, institution_id, email, full_name, phone, role, status,
  last_login_at, password_changed_at, failed_login_count, locked_until, created_at, updated_at, deleted_at`;

export async function findUserByEmail(institutionId: string, email: string): Promise<User | null> {
  return queryOne<User>(`SELECT ${USER_COLUMNS} FROM users WHERE institution_id = $1 AND lower(email) = lower($2)`, [
    institutionId,
    email,
  ]);
}

export async function findUserById(userId: string): Promise<User | null> {
  return queryOne<User>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [userId]);
}

export async function findSafeUserById(userId: string): Promise<SafeUser | null> {
  return queryOne<SafeUser>(`SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = $1`, [userId]);
}

export async function findProfileByUserId(userId: string): Promise<StudentProfile | null> {
  return queryOne<StudentProfile>('SELECT * FROM student_profiles WHERE user_id = $1', [userId]);
}

/** Resolves a student by university ID number or institutional email. */
export async function resolveStudent(
  institutionId: string,
  identifier: string,
): Promise<{ id: string; full_name: string } | null> {
  const needle = identifier.trim().toLowerCase();
  return queryOne<{ id: string; full_name: string }>(
    `SELECT u.id, u.full_name
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.institution_id = $1 AND u.deleted_at IS NULL
        AND (lower(u.email) = $2 OR lower(sp.student_id) = $2)
      LIMIT 1`,
    [institutionId, needle],
  );
}

export async function findProfileByStudentId(studentId: string): Promise<StudentProfile | null> {
  return queryOne<StudentProfile>('SELECT * FROM student_profiles WHERE student_id = $1', [studentId]);
}

export type CreateUserInput = {
  institutionId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string | null;
  role?: Role;
  status?: UserStatus;
  studentId?: string | null;
  department?: string | null;
  yearOfStudy?: number | null;
  dorm?: string | null;
};

export async function createUser(input: CreateUserInput): Promise<User> {
  const userId = id.user();
  return tx(async (client) => {
    const { rows } = await client.query<User>(
      `INSERT INTO users (id, institution_id, email, password_hash, full_name, phone, role, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING ${USER_COLUMNS}`,
      [
        userId,
        input.institutionId,
        input.email.toLowerCase(),
        input.passwordHash,
        input.fullName,
        input.phone ?? null,
        input.role ?? 'STUDENT',
        input.status ?? 'ACTIVE',
      ],
    );
    const user = rows[0]!;

    if (input.studentId) {
      await client.query(
        `INSERT INTO student_profiles (id, user_id, student_id, department, year_of_study, dorm)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id.profile(), userId, input.studentId, input.department ?? null, input.yearOfStudy ?? null, input.dorm ?? null],
      );
    }
    return user;
  });
}

export type UserListFilters = {
  role?: Role | 'ALL';
  status?: UserStatus | 'ALL';
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listUsers(institutionId: string, filters: UserListFilters = {}) {
  const params: unknown[] = [institutionId];
  const where: string[] = ['u.institution_id = $1', 'u.deleted_at IS NULL'];

  if (filters.role && filters.role !== 'ALL') {
    params.push(filters.role);
    where.push(`u.role = $${params.length}`);
  }
  if (filters.status && filters.status !== 'ALL') {
    params.push(filters.status);
    where.push(`u.status = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    const p = `$${params.length}`;
    where.push(`(u.full_name ILIKE ${p} OR u.email ILIKE ${p} OR p.student_id ILIKE ${p})`);
  }

  const clause = `WHERE ${where.join(' AND ')}`;
  const limit = Math.min(filters.limit ?? 50, 200);
  const offset = filters.offset ?? 0;

  const [{ total } = { total: 0 }] = await query<{ total: number }>(
    `SELECT count(*)::int AS total FROM users u LEFT JOIN student_profiles p ON p.user_id = u.id ${clause}`,
    params,
  );

  params.push(limit, offset);
  const rows = await query<SafeUser & { student_id: string | null; department: string | null; product_count: number }>(
    `SELECT ${SAFE_USER_COLUMNS.split(',')
      .map((c) => `u.${c.trim()}`)
      .join(', ')},
      p.student_id, p.department,
      (SELECT count(*)::int FROM products pr WHERE pr.owner_id = u.id AND pr.status <> 'RETIRED') AS product_count
     FROM users u
     LEFT JOIN student_profiles p ON p.user_id = u.id
     ${clause}
     ORDER BY u.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return { rows, total };
}

export async function updateUserRole(userId: string, role: Role): Promise<void> {
  await query('UPDATE users SET role = $2, updated_at = now() WHERE id = $1', [userId, role]);
}

export async function updateUserStatus(userId: string, status: UserStatus): Promise<void> {
  await query('UPDATE users SET status = $2, updated_at = now() WHERE id = $1', [userId, status]);
}

export async function updatePassword(userId: string, passwordHash: string): Promise<void> {
  await query(
    'UPDATE users SET password_hash = $2, password_changed_at = now(), failed_login_count = 0, locked_until = NULL, updated_at = now() WHERE id = $1',
    [userId, passwordHash],
  );
}

export async function softDeleteUser(userId: string): Promise<void> {
  await tx(async (client) => {
    await client.query(
      `UPDATE users
         SET deleted_at = now(), status = 'DISABLED',
             email = email || '.deleted.' || extract(epoch from now())::bigint,
             phone = NULL, updated_at = now()
       WHERE id = $1`,
      [userId],
    );
    await client.query('UPDATE student_profiles SET fayda_id = NULL WHERE user_id = $1', [userId]);
    await client.query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
  });
}

/** Login bookkeeping: lock after repeated failures, reset on success. */
export async function recordFailedLogin(userId: string, maxAttempts = 8): Promise<void> {
  await query(
    `UPDATE users
        SET failed_login_count = failed_login_count + 1,
            locked_until = CASE WHEN failed_login_count + 1 >= $2
                                THEN now() + interval '15 minutes' ELSE NULL END,
            updated_at = now()
      WHERE id = $1`,
    [userId, maxAttempts],
  );
}

export async function recordSuccessfulLogin(userId: string): Promise<void> {
  await query(
    'UPDATE users SET last_login_at = now(), failed_login_count = 0, locked_until = NULL, updated_at = now() WHERE id = $1',
    [userId],
  );
}

export async function countUsersByRole(institutionId: string): Promise<Record<string, number>> {
  const rows = await query<{ role: Role; count: number }>(
    `SELECT role, count(*)::int AS count FROM users
      WHERE institution_id = $1 AND deleted_at IS NULL
      GROUP BY role`,
    [institutionId],
  );
  return Object.fromEntries(rows.map((r) => [r.role, r.count]));
}

export async function listSecurityOfficerIds(institutionId: string): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM users WHERE institution_id = $1 AND role = 'SECURITY' AND status = 'ACTIVE' AND deleted_at IS NULL`,
    [institutionId],
  );
  return rows.map((r) => r.id);
}

export async function listAdminIds(institutionId: string): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM users WHERE institution_id = $1 AND role = 'ADMIN' AND status = 'ACTIVE' AND deleted_at IS NULL`,
    [institutionId],
  );
  return rows.map((r) => r.id);
}
