import './env';
import { pool } from '../src/lib/db';
import { runRetention } from '../src/lib/retention';

/**
 * Applies the retention policy for every institution.
 *
 * Schedule nightly. See docs/03-operations/deployment.md.
 */
async function main() {
  const results = await runRetention();
  if (!results.length) {
    console.log('No institutions configured.');
  }
  for (const result of results) {
    console.log(
      `${result.institution}: scan events deleted ${result.scanEventsDeleted}, ` +
        `notifications deleted ${result.notificationsDeleted}, ` +
        `sessions deleted ${result.sessionsDeleted}, ` +
        `reports anonymised ${result.reportsAnonymised}, ` +
        `audit rows deleted ${result.auditLogsDeleted}`,
    );
  }
  await pool.end();
  process.exit(0);
}

main().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => {});
  process.exit(1);
});
