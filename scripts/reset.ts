import './env';
import { pool } from '../src/lib/db';

/** Drops everything and reapplies migrations. Development only. */
async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_RESET !== '1') {
    throw new Error('Refusing to reset a production database. Set FORCE_RESET=1 if you really mean it.');
  }
  console.log('Dropping schema…');
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  console.log('Schema dropped. Now run: npm run db:migrate && npm run db:seed');
  await pool.end();
  process.exit(0);
}

main().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => {});
  process.exit(1);
});
