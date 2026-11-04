import './env';

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
    console.log(`FAIL ${label}`, detail ?? '');
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

  console.log(failures ? `\n${failures} failure(s).` : '\nAll workflow checks passed.');
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
