import './env';
/**
 * Applies every SQL file in db/migrations that has not been applied yet.
 *
 *   npm run db:migrate
 *
 * Each file runs inside its own transaction. Applied files are recorded in
 * `schema_migrations` with a checksum so that editing an already-applied
 * migration is caught instead of silently ignored.
 */
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pool, query } from '../src/lib/db';

const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      checksum   TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function applied(): Promise<Map<string, string>> {
  const rows = await query<{ filename: string; checksum: string }>(
    'SELECT filename, checksum FROM schema_migrations',
  );
  return new Map(rows.map((r) => [r.filename, r.checksum]));
}

async function main() {
  await ensureTable();
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  const done = await applied();
  let count = 0;

  for (const file of files) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const previous = done.get(file);

    if (previous && previous !== checksum) {
      throw new Error(
        `Migration ${file} changed after it was applied. Restore the original file or write a new migration.`,
      );
    }
    if (previous) continue;

    process.stdout.write(`applying ${file} … `);
    await pool.query(sql);
    await query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1,$2)', [file, checksum]);
    process.stdout.write('ok\n');
    count += 1;
  }

  console.log(count ? `${count} migration(s) applied.` : 'Database is up to date.');
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => {});
  process.exit(1);
});
