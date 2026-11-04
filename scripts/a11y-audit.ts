import './env';

/**
 * Automated accessibility audit (implementation to-do 2.25).
 *
 *   npm run dev          # in another terminal
 *   npm run a11y
 *
 * Runs axe-core over every page as each role, and fails on any violation.
 *
 * HONEST LIMIT: this is axe-core inside jsdom, against the server-rendered
 * HTML. It catches missing labels, missing alt text, broken ARIA, duplicate
 * ids and heading order — the structural failures that account for most real
 * barriers. It cannot see layout, so colour-contrast rules are disabled here
 * (those were checked by hand: see docs/03-operations/accessibility.md), and it
 * cannot exercise the camera scanner, the offline cache or keyboard focus
 * order. An automated pass is a floor, not a certificate: a screen-reader user
 * must still walk the product before the pilot.
 */

import { JSDOM } from 'jsdom';

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
  'officer@aastu.edu.et': ['/security', '/security/history', '/security/guidance'],
  'ops@campusguard.et': [
    '/platform',
    '/platform/country',
    '/platform/organisations',
    '/platform/requests',
    '/platform/audit',
  ],
  'ministry@campusguard.et': ['/platform/country'],
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

type AxeResult = {
  violations: Array<{
    id: string;
    impact?: string;
    help: string;
    helpUrl: string;
    nodes: Array<{ target: string[]; failureSummary?: string }>;
  }>;
  passes: Array<{ id: string }>;
  incomplete: Array<{ id: string }>;
};

let failures = 0;
let checked = 0;

/**
 * React streams dynamic pages: the HTML contains the loading.tsx fallback plus
 * the real content in hidden <div id="S:…"> segments, and inline scripts
 * ($RC/$RS) swap them in the browser. jsdom does not run those scripts, so
 * without this step the audit would grade the skeleton instead of the page.
 * This replays the same swaps statically:
 *   $RS(S:x, P:x) — move the segment's children before the P:x placeholder.
 *   $RC(B:x, S:x) — replace the fallback between <template id="B:x"> and the
 *                   closing <!--/$--> comment with the segment's children.
 * Segments can nest, so repeat until nothing changes.
 */
function completeStreamedBoundaries(document: Document): void {
  for (let pass = 0; pass < 50; pass += 1) {
    let progressed = false;

    for (const placeholder of Array.from(document.querySelectorAll('template[id^="P:"]'))) {
      const segment = document.getElementById(`S:${placeholder.id.slice(2)}`);
      const parent = placeholder.parentNode;
      if (!segment || !parent) continue;
      while (segment.firstChild) parent.insertBefore(segment.firstChild, placeholder);
      parent.removeChild(placeholder);
      segment.parentNode?.removeChild(segment);
      progressed = true;
    }

    for (const boundary of Array.from(document.querySelectorAll('template[id^="B:"]'))) {
      const segment = document.getElementById(`S:${boundary.id.slice(2)}`);
      const parent = boundary.parentNode;
      if (!segment || !parent) continue;
      let node: ChildNode | null = boundary.nextSibling;
      while (node && !(node.nodeType === 8 && (node as Comment).data === '/$')) {
        const next: ChildNode | null = node.nextSibling;
        parent.removeChild(node);
        node = next;
      }
      while (segment.firstChild) parent.insertBefore(segment.firstChild, node);
      parent.removeChild(boundary);
      segment.parentNode?.removeChild(segment);
      progressed = true;
    }

    if (!progressed) break;
  }
}

async function cookieFor(email: string): Promise<string> {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
    redirect: 'manual',
  });
  if (response.status !== 200) throw new Error(`login failed for ${email}: ${response.status}`);
  return (response.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
}

async function audit(path: string, cookie?: string): Promise<void> {
  const response = await fetch(`${BASE}${path}`, { headers: cookie ? { cookie } : {}, redirect: 'manual' });
  const html = await response.text();
  checked += 1;

  if (response.status >= 400) {
    failures += 1;
    console.log(`FAIL ${path} — returned ${response.status}`);
    return;
  }

  const dom = new JSDOM(html, { url: `${BASE}${path}`, pretendToBeVisual: true });
  const { window } = dom;
  completeStreamedBoundaries(window.document);

  // axe-core needs a real-ish global environment.
  const axe = (await import('axe-core')).default;
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = window;
  g.document = window.document;
  g.Node = window.Node;
  g.Element = window.Element;
  g.HTMLElement = window.HTMLElement;
  g.NodeList = window.NodeList;
  g.getComputedStyle = window.getComputedStyle.bind(window);

  const results = (await axe.run(window.document.documentElement, {
    // No layout engine in jsdom, so contrast cannot be computed. It was
    // checked by hand and is documented instead of silently skipped.
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations', 'incomplete'],
  })) as unknown as AxeResult;

  if (results.violations.length === 0) {
    console.log(`ok   ${path}`);
  } else {
    for (const violation of results.violations) {
      failures += 1;
      console.log(`FAIL ${path} — ${violation.id} (${violation.impact ?? 'unknown'}): ${violation.help}`);
      for (const node of violation.nodes.slice(0, 3)) {
        console.log(`       ${node.target.join(' ')} ${(node.failureSummary ?? '').split('\n').join(' | ').slice(0, 160)}`);
      }
      console.log(`       ${violation.helpUrl}`);
    }
  }

  const notable = results.incomplete.filter((i) => i.id !== 'color-contrast');
  if (notable.length) console.log(`     ${path}: needs manual review — ${notable.map((i) => i.id).join(', ')}`);

  window.close();
}

async function main(): Promise<void> {
  console.log(`CampusGuard accessibility audit — ${BASE}\n`);

  console.log('— public —');
  for (const path of PUBLIC_ROUTES) await audit(path);

  for (const [email, paths] of Object.entries(ROUTES)) {
    console.log(`\n— ${email} —`);
    const cookie = await cookieFor(email);
    for (const path of paths) await audit(path, cookie);
  }

  console.log(`\n${failures === 0 ? `No violations across ${checked} pages.` : `${failures} violation(s) across ${checked} pages.`}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
