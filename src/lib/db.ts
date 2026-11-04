import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';

/** int8 comes back as a string by default; every count we use fits in a JS number. */
types.setTypeParser(20, (value) => Number(value));

const globalForPool = globalThis as unknown as { pool?: Pool };

/** Lazy pool creation so that importing this module never throws at build time. */
export function getPool(): Pool {
  if (globalForPool.pool) return globalForPool.pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  }
  const useSsl = /[?&]sslmode=require/.test(connectionString) || process.env.PGSSL === '1';
  const pool = new Pool({
    connectionString,
    max: Number(process.env.PGPOOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: useSsl ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== '0' } : undefined,
  });

  globalForPool.pool = pool;
  return pool;
}

/** Escape hatch for scripts that need the raw pool (migrations, shutdown). */
export const pool = {
  query: <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) =>
    getPool().query<T>(text, params as never[]),
  end: () => getPool().end(),
};

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params as never[]);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run a unit of work in a transaction. Rolls back on any thrown error. */
export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const rows = await query<{ ok: number }>('SELECT 1 AS ok');
    return rows[0]?.ok === 1;
  } catch {
    return false;
  }
}
