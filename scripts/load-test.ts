import './env';
import { query, queryOne } from '../src/lib/db';
import { OFFLINE_CACHE_MAX_ROWS } from '../src/lib/constants';
import { generateQrToken } from '../src/lib/tokens';
import { hashPassword } from '../src/lib/password';

/**
 * Load test at pilot scale (implementation to-do 2.24).
 *
 *   npm run dev            # in another terminal
 *   npm run load-test
 *
 * A real pilot at a large Ethiopian campus is ~20–40k registered devices
 * (AAU alone enrols tens of thousands of students). The two endpoints that
 * matter operationally are the ones this script measures:
 *
 *   GET  /api/scan/manifest  — the offline registry snapshot an officer's
 *                              phone downloads before a shift. It is the
 *                              biggest payload in the product and the one
 *                              that fails worst on bad connectivity.
 *   POST /api/scan/verify    — the hot path at the gate. An officer standing
 *                              in a queue feels every 100 ms of this.
 *
 * Everything is created inside a throwaway institution and deleted at the end,
 * so the demo data is untouched.
 */

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const PASSWORD = 'Load#Test#2026';

const DEVICES = Number(process.env.LOAD_DEVICES ?? 20_000);
const STUDENTS = Number(process.env.LOAD_STUDENTS ?? Math.round(DEVICES / 4));
const OPEN_REPORTS = Number(process.env.LOAD_OPEN_REPORTS ?? Math.round(DEVICES / 20));
const SCAN_EVENTS = Number(process.env.LOAD_SCAN_EVENTS ?? 20_000);

/** Acceptance thresholds. Chosen from how the endpoints are actually used, not
 *  from round numbers: a manifest is downloaded once per shift on campus wifi,
 *  and a gate scan happens while someone waits. */
const LIMITS = {
  manifestP95Ms: 5_000,
  manifestBytes: 40 * 1024 * 1024,
  verifyP95Ms: 750,
};

const INSTITUTION_ID = 'ins_loadtest';
const OFFICER_EMAIL = 'officer@loadtest.invalid';

const TYPES = ['LAPTOP', 'PHONE', 'TABLET', 'MONITOR', 'CAMERA', 'AUDIO', 'WATCH', 'OTHER'];
const BRANDS = ['Lenovo', 'HP', 'Dell', 'Apple', 'Samsung', 'Tecno', 'Infinix', 'Acer', 'Asus', 'Xiaomi'];
const MODELS = ['ThinkPad E14', 'ProBook 450', 'Latitude 5420', 'MacBook Air M2', 'Galaxy A14', 'Spark 10', 'Aspire 5', 'Redmi 12'];

let failures = 0;

function pass(message: string): void {
  console.log(`ok   ${message}`);
}

function fail(message: string): void {
  failures += 1;
  console.log(`FAIL ${message}`);
}

function check(condition: boolean, message: string): void {
  if (condition) pass(message);
  else fail(message);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function ms(values: number[]): string {
  return `${Math.round(percentile(values, 50))}ms p50 / ${Math.round(percentile(values, 95))}ms p95 / ${Math.round(Math.max(...values))}ms max`;
}

/** Multi-row INSERT in chunks: 20k round trips would dominate the runtime. */
async function batchInsert(sql: string, rows: unknown[][], chunk = 500): Promise<void> {
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const params: unknown[] = [];
    const tuples = slice.map((row) => {
      const placeholders = row.map((value) => {
        params.push(value);
        return `$${params.length}`;
      });
      return `(${placeholders.join(',')})`;
    });
    await query(`${sql} VALUES ${tuples.join(',')}`, params);
  }
}

async function cookieFor(email: string): Promise<string> {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
    redirect: 'manual',
  });
  if (response.status !== 200) {
    throw new Error(`login failed for ${email}: ${response.status} ${await response.text()}`);
  }
  return (response.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
}

async function seed(): Promise<string[]> {
  console.log(`\n— seeding ${DEVICES} devices / ${STUDENTS} students / ${OPEN_REPORTS} open reports / ${SCAN_EVENTS} scans —`);
  const started = Date.now();

  await query(`DELETE FROM institutions WHERE id = $1`, [INSTITUTION_ID]);
  await query(
    `INSERT INTO institutions (id, name, code, email_domain, city) VALUES ($1,'Load Test University','LOADTEST','loadtest.invalid','Addis Ababa')`,
    [INSTITUTION_ID],
  );

  const officerHash = await hashPassword(PASSWORD);
  await query(
    `INSERT INTO users (id, institution_id, email, password_hash, full_name, role, status)
     VALUES ('usr_load_officer',$1,$2,$3,'Load Test Officer','SECURITY','ACTIVE'),
            ('usr_load_admin',$1,'admin@loadtest.invalid',$3,'Load Test Admin','ADMIN','ACTIVE')`,
    [INSTITUTION_ID, OFFICER_EMAIL, officerHash],
  );

  const studentHash = officerHash; // same cost factor; reused deliberately (bcrypt is the slow part)
  const studentRows: unknown[][] = [];
  const profileRows: unknown[][] = [];
  for (let i = 0; i < STUDENTS; i += 1) {
    const userId = `usr_load_s${i}`;
    studentRows.push([userId, INSTITUTION_ID, `student${i}@loadtest.invalid`, studentHash, `Load Student ${i}`, 'STUDENT', 'ACTIVE']);
    profileRows.push([`stp_load_s${i}`, userId, `LT/${String(100000 + i)}`, ['Engineering', 'Medicine', 'Business', 'Law', 'Science'][i % 5], (i % 5) + 1]);
  }
  await batchInsert(
    `INSERT INTO users (id, institution_id, email, password_hash, full_name, role, status)`,
    studentRows,
  );
  await batchInsert(`INSERT INTO student_profiles (id, user_id, student_id, department, year_of_study)`, profileRows);

  const productRows: unknown[][] = [];
  const identifierRows: unknown[][] = [];
  const tokens: string[] = [];
  const now = new Date();
  for (let i = 0; i < DEVICES; i += 1) {
    const productId = `prd_load_${i}`;
    const ownerId = `usr_load_s${i % STUDENTS}`;
    const token = generateQrToken();
    tokens.push(token);
    productRows.push([
      productId,
      INSTITUTION_ID,
      ownerId,
      TYPES[i % TYPES.length],
      BRANDS[i % BRANDS.length],
      MODELS[i % MODELS.length],
      `SN-LOAD-${i}`,
      i % 5 === 0 ? 'REPORTED_MISSING' : 'ACTIVE',
      new Date(now.getTime() - i * 60_000).toISOString(),
    ]);
    identifierRows.push([`pid_load_${i}`, productId, 'QR_TOKEN', token, null, true]);
  }
  await batchInsert(
    `INSERT INTO products (id, institution_id, owner_id, type, brand, model, serial_number, status, registered_at)`,
    productRows,
  );
  await batchInsert(
    `INSERT INTO product_identifiers (id, product_id, kind, value, label, is_primary)`,
    identifierRows,
  );

  const reportRows: unknown[][] = [];
  for (let i = 0; i < OPEN_REPORTS; i += 1) {
    reportRows.push([
      `mrp_load_${i}`,
      INSTITUTION_ID,
      `prd_load_${(i * Math.max(1, Math.floor(DEVICES / Math.max(1, OPEN_REPORTS)))) % DEVICES}`,
      `usr_load_s${i % STUDENTS}`,
      ['LOST', 'STOLEN', 'MISPLACED'][i % 3],
      'OPEN',
    ]);
  }
  await batchInsert(
    `INSERT INTO missing_reports (id, institution_id, product_id, reporter_id, category, status)`,
    reportRows,
  );

  const scanRows: unknown[][] = [];
  for (let i = 0; i < SCAN_EVENTS; i += 1) {
    const token = tokens[i % tokens.length];
    const flagged = i % 20 === 0;
    scanRows.push([
      `sce_load_${i}`,
      INSTITUTION_ID,
      `prd_load_${i % DEVICES}`,
      token,
      'usr_load_officer',
      flagged ? 'MISMATCH' : 'REGISTERED_OK',
      new Date(now.getTime() - i * 30_000).toISOString(),
    ]);
  }
  await batchInsert(
    `INSERT INTO scan_events (id, institution_id, product_id, token_scanned, scanned_by_id, result, scanned_at)`,
    scanRows,
  );

  console.log(`     seeded in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  return tokens;
}

async function cleanup(): Promise<void> {
  await query(`DELETE FROM institutions WHERE id = $1`, [INSTITUTION_ID]);
  const remaining = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM products WHERE institution_id = $1`,
    [INSTITUTION_ID],
  );
  check(remaining?.n === '0', 'load-test data removed');
}

async function main(): Promise<void> {
  console.log(`CampusGuard load test — ${DEVICES} devices, ${BASE}`);
  const tokens = await seed();
  const cookie = await cookieFor(OFFICER_EMAIL);

  // ---------------------------------------------------------------- manifest
  console.log('\n— GET /api/scan/manifest —');
  const manifestTimes: number[] = [];
  let payloadBytes = 0;
  let rowCount = 0;
  let truncated = false;

  for (let run = 0; run < 5; run += 1) {
    const started = Date.now();
    const response = await fetch(`${BASE}/api/scan/manifest`, { headers: { cookie } });
    const body = await response.text();
    const elapsed = Date.now() - started;
    if (response.status !== 200) {
      fail(`manifest returned ${response.status}`);
      break;
    }
    if (run > 0) manifestTimes.push(elapsed); // first run pays Next.js dev compile
    payloadBytes = Buffer.byteLength(body);
    const json = JSON.parse(body) as { count: number; truncated: boolean };
    rowCount = json.count;
    truncated = json.truncated;
  }

  const expectedRows = Math.min(DEVICES, OFFLINE_CACHE_MAX_ROWS);
  const expectTruncated = DEVICES > OFFLINE_CACHE_MAX_ROWS;
  console.log(`     ${rowCount} rows · ${(payloadBytes / 1024 / 1024).toFixed(2)} MB · ${ms(manifestTimes)}`);
  check(rowCount === expectedRows, `manifest returned ${expectedRows} rows (got ${rowCount})`);
  check(
    truncated === expectTruncated,
    expectTruncated
      ? `manifest reports truncation above the ${OFFLINE_CACHE_MAX_ROWS}-row cache cap`
      : `manifest not truncated at the ${OFFLINE_CACHE_MAX_ROWS}-row cache cap`,
  );
  check(percentile(manifestTimes, 95) <= LIMITS.manifestP95Ms, `manifest p95 within ${LIMITS.manifestP95Ms}ms (${Math.round(percentile(manifestTimes, 95))}ms)`);
  check(payloadBytes <= LIMITS.manifestBytes, `manifest payload under ${LIMITS.manifestBytes / 1024 / 1024}MB (${(payloadBytes / 1024 / 1024).toFixed(2)}MB)`);

  // The database half of that, isolated from JSON serialisation and HTTP.
  const plan = await query<{ 'QUERY PLAN': string }>(
    `EXPLAIN (ANALYZE, BUFFERS, TIMING) SELECT pi.value, p.status, (p.type || ' ' || p.brand || ' ' || p.model), u.full_name, p.owner_id,
            EXISTS (SELECT 1 FROM missing_reports mr WHERE mr.product_id = p.id AND mr.status = 'OPEN')
       FROM product_identifiers pi
       JOIN products p ON p.id = pi.product_id
       JOIN users u    ON u.id = p.owner_id
      WHERE p.institution_id = $1 AND pi.kind = 'QR_TOKEN' AND pi.revoked_at IS NULL AND p.status <> 'RETIRED'
      ORDER BY p.registered_at DESC
      LIMIT $2`,
    [INSTITUTION_ID, DEVICES],
  );
  const planText = plan.map((r) => r['QUERY PLAN']).join('\n');
  const execution = planText.match(/Execution Time: ([\d.]+) ms/);
  const dbMs = execution ? Number(execution[1]) : Number.NaN;
  console.log(`     database execution ${dbMs.toFixed(0)}ms (plan below)`);
  console.log(planText.split('\n').map((l) => `       ${l.trim()}`).join('\n'));

  // ------------------------------------------------------------------ verify
  console.log('\n— POST /api/scan/verify —');
  const verifyTimes: number[] = [];
  const verifyErrors: number[] = [];
  const sample = 120;
  for (let i = 0; i < sample; i += 1) {
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    const started = Date.now();
    const response = await fetch(`${BASE}/api/scan/verify`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ token, checkpointId: `CP${(i % 3) + 1}`, durationMs: 1500 + (i % 900) }),
    });
    verifyTimes.push(Date.now() - started);
    if (response.status !== 200) {
      verifyErrors.push(response.status);
      if (verifyErrors.length === 1) console.log(`     first error: ${response.status} ${(await response.text()).slice(0, 300)}`);
    } else {
      await response.text();
    }
  }
  console.log(`     ${sample} scans · ${ms(verifyTimes)}`);
  check(verifyErrors.length === 0, `no verify errors (${verifyErrors.length} non-200)`);
  check(percentile(verifyTimes, 95) <= LIMITS.verifyP95Ms, `verify p95 within ${LIMITS.verifyP95Ms}ms (${Math.round(percentile(verifyTimes, 95))}ms)`);

  // ------------------------------------------------------------ scan history
  console.log('\n— GET /api/admin/scan-history (justified lookup) —');
  const adminCookie = await cookieFor('admin@loadtest.invalid');
  const started = Date.now();
  const response = await fetch(
    `${BASE}/api/admin/scan-history?identifier=LT%2F100000&justification=Load%20test%20of%20the%20justified%20lookup%20path`,
    { headers: { cookie: adminCookie } },
  );
  const historyText = await response.text();
  const historyMs = Date.now() - started;
  console.log(`     ${response.status} in ${historyMs}ms (${(Buffer.byteLength(historyText) / 1024).toFixed(1)} KB)`);
  check(response.status === 200, 'justified scan-history lookup succeeds at scale');
  check(historyMs <= 3_000, `justified scan-history lookup within 3s (${historyMs}ms)`);

  if (process.env.LOAD_KEEP === '1') {
    console.log('\n     LOAD_KEEP=1 — load-test institution left in place for inspection');
  } else {
    await cleanup();
  }

  console.log(`\n${failures === 0 ? 'Load test passed.' : `${failures} load-test check(s) failed.`}`);
  if (failures > 0) process.exitCode = 1;
}

main().then(
  async () => {
    const { getPool } = await import('../src/lib/db');
    await getPool().end().catch(() => undefined);
  },
  async (error) => {
    console.error(error);
    const { getPool } = await import('../src/lib/db');
    await getPool().end().catch(() => undefined);
    process.exitCode = 1;
  },
);
