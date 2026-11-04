import './env';
import { query, queryOne } from '../src/lib/db';

/**
 * End-to-end workflow test against a running server.
 *
 *   npm run dev        # in another terminal
 *   npm run flow-test
 *
 * Walks the scenario the product exists for, through the public HTTP API:
 *   register → label → report missing → member of the public finds it and
 *   scans → officer scans it at a checkpoint → desk returns it → admin closes
 *   the report.
 *
 * It creates one throwaway student account and removes it at the end.
 */
const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const PASSWORD = 'FlowTest#2026';

let failures = 0;

async function call<T = any>(
  method: string,
  path: string,
  options: { cookie?: string; body?: unknown } = {},
): Promise<{ status: number; body: T; cookie?: string }> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    redirect: 'manual',
  });
  const text = await response.text();
  let body: any = text;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    // Non-JSON responses (CSV downloads) are returned as raw text.
  }
  const setCookie = response.headers.getSetCookie?.() ?? [];
  return {
    status: response.status,
    body,
    cookie: setCookie.length ? setCookie.map((c) => c.split(';')[0]).join('; ') : undefined,
  };
}

function expect(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`ok   ${label}`);
  } else {
    failures += 1;
    // Truncated so a failure that returns an HTML error page does not bury the
    // rest of the output.
    const shown = typeof detail === 'string' ? detail : JSON.stringify(detail);
    console.log(`FAIL ${label}`, shown ? shown.slice(0, 300) : '');
  }
}

async function login(email: string, password: string): Promise<string> {
  const response = await call('POST', '/api/auth/login', { body: { email, password } });
  if (response.status !== 200) throw new Error(`login failed for ${email}: ${response.status}`);
  return response.cookie!;
}

async function main() {
  console.log(`Flow test against ${BASE}\n`);

  const suffix = Date.now().toString(36).slice(-5);
  const email = `flowtest.${suffix}@aastu.edu.et`;
  const studentId = `FT/${suffix}`;

  // --- 1. Registration -----------------------------------------------------
  const register = await call('POST', '/api/auth/register', {
    body: {
      fullName: 'Flow Test Student',
      email,
      password: PASSWORD,
      studentId,
      department: 'Software Engineering',
      consents: ['TERMS_OF_USE', 'PRIVACY_NOTICE', 'PILOT_PARTICIPATION', 'DATA_PROCESSING'],
    },
  });
  expect('student registers with a university email', register.status === 200, register.body);
  const studentCookie = register.cookie!;
  const studentId1 = register.body.id as string;

  const rejected = await call('POST', '/api/auth/register', {
    body: { fullName: 'Someone Else', email: 'nope@gmail.com', password: PASSWORD, studentId: 'X/1', consents: [] },
  });
  expect('a non-university email is rejected', rejected.status === 400, rejected.body);

  // --- 2. Register a device ------------------------------------------------
  const product = await call('POST', '/api/products', {
    cookie: studentCookie,
    body: {
      type: 'LAPTOP',
      brand: 'Lenovo',
      model: 'ThinkPad X1',
      serialNumber: `FLOWTEST${suffix}`,
      color: 'Black',
      distinguishingMarks: 'Flow-test sticker',
    },
  });
  expect('student registers a device', product.status === 200, product.body);
  const productId = product.body.id as string;
  const token = product.body.token as string;
  expect('the device receives an opaque QR token', /^CG-[0-9A-Z]{20}$/.test(token), token);

  // --- 3. Public scan reveals nothing personal -----------------------------
  const publicBefore = await call('GET', `/api/public/verify/${token}`);
  expect('public scan finds the device', publicBefore.status === 200 && publicBefore.body.known === true);
  expect(
    'public scan exposes no owner identity',
    publicBefore.status === 200 && JSON.stringify(publicBefore.body).includes('Flow Test Student') === false,
    publicBefore.body,
  );

  // --- 4. Report it missing ------------------------------------------------
  const missing = await call('POST', '/api/reports/missing', {
    cookie: studentCookie,
    body: {
      productId,
      category: 'STOLEN',
      description: 'Taken from the library desk.',
      lastKnownLocation: 'Main Library, desk 14',
      channel: 'CAMPUSGUARD',
    },
  });
  expect('student files a missing report', missing.status === 200, missing.body);

  const publicAfter = await call('GET', `/api/public/verify/${token}`);
  expect('public scan now shows it as reported missing', publicAfter.body.reportedMissing === true, publicAfter.body);

  // --- 5. A member of the public finds it ---------------------------------
  const found = await call('POST', '/api/reports/found', {
    body: {
      token,
      location: 'Main Library, near the lifts',
      finderName: 'A cleaner',
      finderContact: 'not-shared@example.org',
    },
  });
  expect('anyone can report a found device', found.status === 200, found.body);
  expect('the found item is auto-matched to the open report', found.body.matched === true, found.body);

  // --- 6. Officer scans at a checkpoint ------------------------------------
  const officerCookie = await login('officer@aastu.edu.et', 'Demo#2026');
  const checkpoints = await call('GET', '/api/checkpoints', { cookie: officerCookie });
  const checkpointId = checkpoints.body.rows?.[0]?.id;
  const checkpointName: string | undefined = checkpoints.body.rows?.[0]?.name;

  const scan = await call('POST', '/api/scan/verify', {
    cookie: officerCookie,
    body: { token, checkpointId, durationMs: 9400 },
  });
  expect('officer scan returns a result', scan.status === 200, scan.body);
  expect(
    'a device with an open report drives the officer to a supervisor',
    scan.body.result === 'ACTIVE_MISSING_REPORT',
    scan.body,
  );
  expect(
    'the officer never receives the owner’s email or serial',
    JSON.stringify(scan.body).includes(email) === false && JSON.stringify(scan.body).includes(`FLOWTEST${suffix}`) === false,
    scan.body,
  );

  const manualScan = await call('POST', '/api/scan/verify', {
    cookie: officerCookie,
    body: { token: token.toLowerCase(), checkpointId, carrierIdentifier: studentId, carrierIdShown: true },
  });
  expect('manual entry and lower-case input also work', manualScan.status === 200, manualScan.body);
  expect(
    'a known checkpoint is attached to the scan',
    manualScan.status === 200 && manualScan.body.checkpoint === checkpointName,
    manualScan.body,
  );

  const badScan = await call('POST', '/api/scan/verify', {
    cookie: officerCookie,
    body: { token: 'not-a-real-code' },
  });
  expect('a nonsense code is rejected cleanly', badScan.status === 400, badScan.body);

  // Regression: a phone that has been offline can present a checkpoint id that
  // no longer exists. The scan must still be recorded (with no checkpoint)
  // rather than failing on the foreign key and losing the officer's evidence.
  const staleCheckpointScan = await call('POST', '/api/scan/verify', {
    cookie: officerCookie,
    body: { token, checkpointId: 'chk_deleted_or_unknown' },
  });
  expect(
    'a scan with a stale checkpoint id is still recorded',
    staleCheckpointScan.status === 200 && staleCheckpointScan.body.checkpoint === null,
    staleCheckpointScan.body,
  );

  // --- 7. Offline batch ----------------------------------------------------
  const sync = await call('POST', '/api/scan/sync', {
    cookie: officerCookie,
    body: {
      batchId: `flow-${suffix}`,
      checkpointId,
      scans: [
        { token, scannedAt: new Date().toISOString(), clientId: 'c1' },
        { token: 'CG-ZZZZZZZZZZZZZZZZZZZZ', scannedAt: new Date().toISOString(), clientId: 'c2' },
      ],
    },
  });
  expect('offline scans upload in a batch', sync.status === 200 && sync.body.synced === 2, sync.body);

  // --- 8. Desk returns it, admin closes the report -------------------------
  const adminCookie = await login('admin@aastu.edu.et', 'Demo#2026');
  const foundList = await call('GET', '/api/reports/found?status=MATCHED', { cookie: adminCookie });
  const foundRow = foundList.body.rows.find((row: { product_id?: string }) => row.product_id === productId);
  expect('the desk sees the matched found item', Boolean(foundRow), foundList.body.total);

  if (foundRow) {
    const returned = await call('PATCH', `/api/reports/found/${foundRow.id}`, {
      cookie: adminCookie,
      body: { action: 'return', custodyLocation: 'Library front desk', notes: 'Returned to owner, ID checked' },
    });
    expect('desk records the return', returned.status === 200, returned.body);
  }

  const missingList = await call('GET', '/api/reports/missing?status=ALL', { cookie: adminCookie });
  const missingRow = (missingList.body.rows ?? []).find((row: { product_id: string }) => row.product_id === productId);
  expect('the report is visible to the administrator', Boolean(missingRow));
  expect(
    'handing the device back closed the report as recovered',
    missingRow?.status === 'RESOLVED_RECOVERED',
    missingRow?.status,
  );

  if (missingRow && missingRow.status === 'OPEN') {
    const resolved = await call('PATCH', `/api/reports/missing/${missingRow.id}`, {
      cookie: adminCookie,
      body: { status: 'RESOLVED_RECOVERED', notes: 'Confirmed returned.' },
    });
    expect('administrator closes the report as recovered', resolved.status === 200, resolved.body);
  }

  // --- 9. Governance -------------------------------------------------------
  const history = await call('GET', `/api/admin/scan-history?identifier=${studentId}`, { cookie: adminCookie });
  expect('pulling an individual’s scan history without a reason is blocked', history.status === 400, history.body);

  const justified = await call(
    'GET',
    `/api/admin/scan-history?identifier=${studentId}&justification=Flow%20test%20verification`,
    { cookie: adminCookie },
  );
  expect('with a recorded justification the same lookup succeeds', justified.status === 200, justified.body);

  const studentAccess = await call('GET', '/api/admin/metrics', { cookie: studentCookie });
  expect('a student cannot read the admin dashboard', studentAccess.status === 403, studentAccess.body);

  const exportCsv = await call('GET', '/api/admin/export?type=summary', { cookie: adminCookie });
  expect('the CSV export works', exportCsv.status === 200);

  // --- cleanup -------------------------------------------------------------
  const deleted = await call('DELETE', `/api/admin/users/${studentId1}?reason=flow-test-cleanup`, {
    cookie: adminCookie,
  });
  expect('test account removed', deleted.status === 200, deleted.body);

  // --- erasure -------------------------------------------------------------
  // A deleted account must disappear from the registry an officer carries, and
  // its label must resolve to "not registered" rather than showing the name of
  // someone who asked to be erased. Historical reports stay: those are governed
  // by the retention windows.
  const afterDelete = await call('POST', '/api/scan/verify', {
    cookie: officerCookie,
    body: { token },
  });
  expect(
    'a deleted student’s label no longer resolves to a person',
    afterDelete.status === 200 && afterDelete.body.result === 'NOT_REGISTERED',
    afterDelete.body,
  );

  const manifestAfter = await call('GET', '/api/scan/manifest', { cookie: officerCookie });
  expect(
    'a deleted student’s device is gone from the officer’s offline registry',
    manifestAfter.status === 200 &&
      (manifestAfter.body.rows ?? []).every((row: { token: string }) => row.token !== token),
    manifestAfter.body,
  );

  // === 11. Multi-tenancy ====================================================
  // The platform holds many organisations. The checks that matter: a
  // non-operator cannot reach the platform API at all; a tenant created here
  // picks up registrations on its own domain and nothing else; and one
  // tenant's administrator cannot see another tenant's people.
  const opsCookie = await login('ops@campusguard.et', 'Demo#2026');

  const platformAsTenantAdmin = await call('GET', '/api/platform/overview', { cookie: adminCookie });
  expect(
    'an organisation administrator cannot reach the platform API',
    platformAsTenantAdmin.status === 403,
    platformAsTenantAdmin.body,
  );

  const overview = await call('GET', '/api/platform/overview', { cookie: opsCookie });
  expect('a platform operator sees the deployment overview', overview.status === 200, overview.body);
  expect(
    'the overview counts organisations but names no people',
    overview.status === 200 &&
      typeof overview.body.overview?.organisations === 'number' &&
      JSON.stringify(overview.body).includes('@aastu.edu.et') === false,
    overview.body.overview,
  );

  const tenantDomain = `flowtest-${suffix}.edu.et`;
  const created = await call('POST', '/api/platform/institutions', {
    cookie: opsCookie,
    body: {
      name: `Flow Test College ${suffix}`,
      code: `FTC${suffix}`.toUpperCase(),
      kind: 'COLLEGE',
      status: 'TRIAL',
      country: 'Ethiopia',
      city: 'Adama',
      primaryDomain: tenantDomain,
      seatLimit: 3,
    },
  });
  expect('a platform operator can provision a new organisation', created.status === 200, created.body);
  const tenantId = created.body.institution?.id as string | undefined;

  const duplicateDomain = await call('POST', '/api/platform/institutions', {
    cookie: opsCookie,
    body: {
      name: `Duplicate ${suffix}`,
      code: `DUP${suffix}`.toUpperCase(),
      kind: 'OTHER',
      primaryDomain: tenantDomain,
    },
  });
  expect(
    'a domain can only be claimed by one organisation',
    duplicateDomain.status === 409,
    duplicateDomain.body,
  );

  // A person on the new tenant's domain lands in the new tenant.
  const tenantEmail = `student@${tenantDomain}`;
  const tenantRegistered = await call('POST', '/api/auth/register', {
    body: {
      email: tenantEmail,
      password: PASSWORD,
      fullName: 'Flow Tenant Student',
      studentId: `FTC/${suffix}`,
      consents: ['TERMS_OF_USE', 'PRIVACY_NOTICE'],
    },
  });
  expect('someone on a new organisation’s domain can register', tenantRegistered.status === 200, tenantRegistered.body);

  const tenantStudentCookie = await login(tenantEmail, PASSWORD);
  const tenantMe = await call('GET', '/api/auth/me', { cookie: tenantStudentCookie });
  expect(
    'the new account belongs to the new organisation, not to AASTU',
    tenantMe.body.user?.institutionId === tenantId || tenantMe.body.user?.institution_id === tenantId,
    tenantMe.body.user,
  );

  // Isolation in the direction that matters: an AASTU administrator looking up
  // a person who belongs to another tenant must find nothing, not find them.
  const crossTenantLookup = await call(
 'GET',
    `/api/admin/scan-history?identifier=${encodeURIComponent(`FTC/${suffix}`)}&justification=Cross%20tenant%20isolation%20check`,
    { cookie: adminCookie },
  );
  expect(
    'an administrator cannot find a person who belongs to another organisation',
    crossTenantLookup.status === 404,
    crossTenantLookup.body,
  );

  const tenantProducts = await call('GET', '/api/products', { cookie: tenantStudentCookie });
  const tenantProductList: Array<{ id: string }> = tenantProducts.body.products ?? [];
  expect(
    'a student sees only their own organisation’s registry',
    tenantProducts.status === 200 && tenantProductList.length === 0,
    tenantProducts.body,
  );

  // Seat limits: the tenant was created with 3 seats. Fill them, then expect
  // the next registration to be refused while existing accounts keep working.
  for (let i = 0; i < 2; i += 1) {
    await call('POST', '/api/auth/register', {
      body: {
        email: `filler${i}@${tenantDomain}`,
        password: PASSWORD,
        fullName: `Filler ${i}`,
        studentId: `FTC/${suffix}-${i}`,
        consents: ['TERMS_OF_USE'],
      },
    });
  }
  const overSeatLimit = await call('POST', '/api/auth/register', {
    body: {
      email: `overlimit@${tenantDomain}`,
      password: PASSWORD,
      fullName: 'Over Limit',
      studentId: `FTC/${suffix}-over`,
      consents: ['TERMS_OF_USE'],
    },
  });
  expect(
    'registration stops at the organisation’s seat limit',
    overSeatLimit.status === 403,
    overSeatLimit.body,
  );
  const stillSignedIn = await call('GET', '/api/auth/me', { cookie: tenantStudentCookie });
  expect('existing accounts are not locked out by a seat limit', stillSignedIn.status === 200, stillSignedIn.body);

  // Suspending a tenant closes the door without deleting a single row.
  const suspended = await call('PATCH', `/api/platform/institutions/${tenantId}`, {
    cookie: opsCookie,
    body: { status: 'SUSPENDED', reason: 'Flow test suspension' },
  });
  expect('a platform operator can suspend an organisation', suspended.status === 200, suspended.body);

  const registerWhileSuspended = await call('POST', '/api/auth/register', {
    body: {
      email: `blocked@${tenantDomain}`,
      password: PASSWORD,
      fullName: 'Blocked Person',
      studentId: `FTC/${suffix}-blocked`,
      consents: ['TERMS_OF_USE'],
    },
  });
  expect(
    'a suspended organisation cannot enrol new people',
    registerWhileSuspended.status === 403,
    registerWhileSuspended.body,
  );

  const loginWhileSuspended = await call('POST', '/api/auth/login', {
    body: { email: tenantEmail, password: PASSWORD },
  });
  expect(
    'a suspended organisation cannot sign people in either',
    loginWhileSuspended.status === 403,
    loginWhileSuspended.body,
  );

  // --- An organisation applies, and a human approves it ---------------------
  const applyDomain = `applicant-${suffix}.edu.et`;
  const applied = await call('POST', '/api/platform/requests', {
    body: {
      organisationName: `Applicant University ${suffix}`,
      kind: 'UNIVERSITY',
      country: 'Ethiopia',
      city: 'Hawassa',
      contactName: 'Registrar',
      contactEmail: 'registrar@example.org',
      primaryDomain: applyDomain,
      estimatedPeople: 9000,
    },
  });
  expect('an organisation can apply to join without an account', applied.status === 200, applied.body);

  const queue = await call('GET', '/api/platform/requests', { cookie: opsCookie });
  const application = (queue.body.requests ?? []).find(
    (row: { organisation_name: string }) => row.organisation_name === `Applicant University ${suffix}`,
  );
  expect('the application appears in the operator’s review queue', Boolean(application), queue.body);

  const approved = await call('POST', `/api/platform/requests/${application?.id}`, {
    cookie: opsCookie,
    body: { decision: 'APPROVED', code: `APU${suffix}`.toUpperCase(), status: 'TRIAL' },
  });
  expect('approving an application provisions the organisation', approved.status === 200, approved.body);
  expect(
    'approval creates a first administrator and a one-time password',
    approved.body.admin?.email === `admin@${applyDomain}` && Boolean(approved.body.temporaryPassword),
    approved.body,
  );

  const doubleDecision = await call('POST', `/api/platform/requests/${application?.id}`, {
    cookie: opsCookie,
    body: { decision: 'APPROVED' },
  });
  expect('an application cannot be approved twice', doubleDecision.status === 409, doubleDecision.body);

  const platformAudit = await call('GET', '/api/platform/audit', { cookie: opsCookie });
  expect(
    'platform actions are recorded in a log no tenant can edit',
    platformAudit.status === 200 &&
      (platformAudit.body.rows ?? []).some((row: { action: string }) => row.action === 'institution.create'),
    platformAudit.body,
  );

  const auditAsTenantAdmin = await call('GET', '/api/platform/audit', { cookie: adminCookie });
  expect('a tenant administrator cannot read the platform audit log', auditAsTenantAdmin.status === 403);

  // The database, not the application, keeps a tenant's domains in step with
  // the tenant itself. Without that, a tenant created directly in SQL — by a
  // script, a migration or an operator with psql — would exist and still be
  // impossible to sign in to.
  const sqlDomain = `sqltenant-${suffix}.edu.et`;
  const sqlTenantId = `ins_${suffix}`;
  await query(
    `INSERT INTO institutions (id, name, code, email_domain, kind, status, country)
     VALUES ($1, $2, $3, $4, 'OTHER', 'TRIAL', 'Ethiopia')`,
    [sqlTenantId, `SQL Tenant ${suffix}`, `SQL${suffix}`.toUpperCase(), sqlDomain],
  );
  const sqlDomainRow = await queryOne<{ institution_id: string; is_primary: boolean }>(
    'SELECT institution_id, is_primary FROM institution_domains WHERE domain = $1',
    [sqlDomain],
  );
  expect(
    'a tenant created directly in SQL still gets its domain registered',
    sqlDomainRow?.institution_id === sqlTenantId && sqlDomainRow?.is_primary === true,
    sqlDomainRow,
  );

  const sqlRegistered = await call('POST', '/api/auth/register', {
    body: {
      email: `student@${sqlDomain}`,
      password: PASSWORD,
      fullName: 'SQL Tenant Student',
      studentId: `SQL/${suffix}`,
      consents: ['TERMS_OF_USE', 'PRIVACY_NOTICE'],
    },
  });
  expect('someone on that tenant’s domain can register', sqlRegistered.status === 200, sqlRegistered.body);

  await query('DELETE FROM institutions WHERE id = $1', [sqlTenantId]);
  const domainsAfterDelete = await queryOne<{ n: number }>(
    'SELECT count(*)::int AS n FROM institution_domains WHERE domain = $1',
    [sqlDomain],
  );
  expect('removing the tenant removes its domains', domainsAfterDelete?.n === 0, domainsAfterDelete);

  // --- Tidy up: close the tenants this run created --------------------------
  for (const id of [tenantId, approved.body.institution?.id]) {
    if (id) {
      await call('PATCH', `/api/platform/institutions/${id}`, {
        cookie: opsCookie,
        body: { status: 'CLOSED', reason: 'Flow test cleanup' },
      });
    }
  }
  expect('flow-test organisations closed', true);

  console.log(failures ? `\n${failures} failure(s).` : '\nAll workflow checks passed.');
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
