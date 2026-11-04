import './env';

/**
 * End-to-end smoke test against a running server.
 *
 *   npm run dev          # in another terminal
 *   npm run smoke
 *
 * Signs in as each role and walks the pages a real user would open, failing on
 * any 5xx (and reporting unexpected redirects).
 */
const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const PASSWORD = 'Demo#2026';

const ROUTES: Record<string, string[]> = {
  'abel@aastu.edu.et': [
    '/student',
    '/student/products',
    '/student/products/new',
    '/student/reports',
    '/student/reports/new',
    '/student/authorizations',
    '/student/notifications',
    '/student/privacy',
  ],
  'officer@aastu.edu.et': ['/security', '/security/history', '/security/guidance', '/student/notifications'],
  'ops@campusguard.et': [
    '/platform',
    '/platform/country',
    '/platform/organisations',
    '/platform/requests',
    '/platform/audit',
  ],
  'ministry@campusguard.et': ['/platform/country'],
  'admin@bdu.edu.et': ['/admin', '/admin/products', '/admin/users', '/admin/settings'],
  'guard@hitechplc.et': ['/security', '/security/guidance'],
  'admin@aastu.edu.et': [
    '/admin',
    '/admin/reports',
    '/admin/found',
    '/admin/products',
    '/admin/users',
    '/admin/scans',
    '/admin/checkpoints',
    '/admin/audit',
    '/admin/settings',
  ],
};

const PUBLIC_ROUTES = ['/', '/login', '/register', '/join', '/found', '/legal/privacy', '/legal/terms', '/legal/data-rights', '/offline'];

let failures = 0;
let checks = 0;

function cookieFrom(response: Response): string {
  const raw = response.headers.getSetCookie?.() ?? [];
  return raw.map((c) => c.split(';')[0]).join('; ');
}

async function get(path: string, cookie?: string): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: 'manual',
  });
}

async function check(path: string, cookie?: string, expect: number[] = [200, 307, 302]) {
  const response = await get(path, cookie);
  const status = response.status;
  checks += 1;
  const ok = expect.includes(status);
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${status} ${path}`);
  return response;
}

async function main() {
  console.log(`Smoke testing ${BASE}\n`);

  console.log('— public routes —');
  for (const route of PUBLIC_ROUTES) await check(route);

  for (const [email, routes] of Object.entries(ROUTES)) {
    console.log(`\n— ${email} —`);
    const login = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    if (!login.ok) {
      failures += 1;
      checks += 1;
      console.log(`FAIL ${login.status} login ${email}`);
      continue;
    }
    const cookie = cookieFrom(login);
    console.log(`ok   login ${email}`);

    for (const route of routes) await check(route, cookie);
  }

  // API surface
  console.log('\n— api —');
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@aastu.edu.et', password: PASSWORD }),
  });
  const cookie = cookieFrom(login);
  for (const route of ['/api/health', '/api/auth/me', '/api/admin/metrics', '/api/admin/audit', '/api/notifications']) {
    const response = await get(route, cookie);
    checks += 1;
    const ok = response.status === 200;
    if (!ok) failures += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${response.status} ${route}`);
  }

  console.log(`\n${checks - failures}/${checks} checks passed.`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
