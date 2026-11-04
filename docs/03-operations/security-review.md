# Security and privacy self-assessment

**Status: self-assessment, not an independent review.** This document was written by the people who
built the code, by reading it. That is the cheapest possible assurance and it is not enough on its
own: before any real student data is loaded, an independent reviewer who did not write CampusGuard
must go through `src/lib/auth.ts`, `src/lib/session.ts`, `src/app/api/scan/*`,
`src/app/api/admin/*` and the SQL in `db/migrations/`. Nothing here should be read as clearing
that requirement (implementation to-do 2.23).

Written 2026-11-04, against the code in this repository at that date.

---

## 1. What was actually done

| Activity | Coverage |
| --- | --- |
| Manual read of every route handler, the auth/session layer, the verification engine and the SQL migrations | All of `src/app/api/**`, `src/lib/**`, `db/migrations/**` |
| Automated tests | 21 unit tests, 45 smoke checks, 55 end-to-end workflow checks, 33-page accessibility audit, load test at 20k devices |
| Probing the running application through its HTTP API | Role separation, erasure behaviour, justification gating, error handling |
| Dependency vulnerability scan (`npm audit`) | Findings below |
| Multi-tenant isolation | Cross-tenant lookup, seat limits, tenant status, platform API reachability — covered by 17 checks in `npm run flow-test` |
| **Not** done | Penetration test, fuzzing, infrastructure/network hardening review, formal review of the cryptography in `src/lib/offline/cache.ts`, dependency licence review |

---

## 2. What has to be protected, and from whom

The data is not financial and not health data, but it is more sensitive than it looks: a student's
full name, university email, student ID, device serials, which devices they own, when they were
reported missing, and **a timestamped record of every time they passed a campus checkpoint with a
device**. That last one is a partial movement history. It is collected by an institution with the
power to discipline students, in a country where students have been surveilled before. The
anti-surveillance rules in the product are not decoration.

| Actor | Wants | Primary controls | Residual risk |
| --- | --- | --- | --- |
| Outsider / thief | Learn who owns a device, or which devices are worth stealing | QR contains only an opaque token (ADR-0005); public status page reveals no identity; rate-limited (30/min/IP); no owner data in the public response | A stolen phone showing the app is a session-theft risk — mitigated by 10–12 h session TTL and server-side revocation (ADR-0003), **not** eliminated |
| Curious officer | Look up people they know | Officer sees only the scanned device's owner, never a directory; no search by name; scan history requires ADMIN + a ≥10-char justification that is stored and audited | An officer can still see the owner of any device they physically scan. This is the product's purpose and cannot be removed without removing the feature |
| Compromised officer phone | Read the offline registry | Encrypted IndexedDB with a non-extractable key (ADR-0006); service worker never caches `/api/*`; 12 h manifest TTL | A compromised phone while the app is unlocked can read what the officer can read. Session TTL limits the window |
| Administrator abusing access | Quietly build a movement profile | Justification-gated history; every access audited with actor, justification, IP; `allow_aggregate_analytics` defaults to false | An admin can still approve their own justifications. Detected after the fact by audit review, not prevented — the runbook says review `scan.history.access` rows weekly |
| Institution / state request for data | Bulk surveillance | No aggregate analytics by default; retention windows delete scan events (90 d default); export is per-data-subject | A university with database credentials can read everything. This is why the compliance pack needs a written prohibited-uses clause, not just technical controls |
| External attacker on the app | Take over accounts, exfiltrate the registry | bcrypt(12), 8-attempt lockout, server-side sessions hashed at rest, RBAC on every route, Zod validation, parameterised SQL everywhere | See findings F-4 and F-5 |
| A platform operator | Read another organisation's data | A separate grant (`platform_role`) with its own guard; the platform API returns counts only; actions logged to `platform_audit_logs`, which no tenant can edit | The console could be extended to leak tenant data by a future change. Isolation inside tenants is enforced in application code, not by the database — see F-13 |
| One tenant reaching another | Read a person or device across tenants | Every repository query filters on `session.institution.id`; no route accepts a tenant id from the request; domain lookups are globally unique | F-13: a single missing `WHERE institution_id = $1` is a cross-tenant leak |

---

## 3. Controls that are in place

| Control | Where | Notes |
| --- | --- | --- |
| Authentication | `src/lib/password.ts`, `src/app/api/auth/login` | bcrypt cost 12; ≥10-char policy; identical response for unknown account / wrong password / disabled account (**no account enumeration**); 8 failures → 15-minute lock |
| Sessions | `src/lib/session.ts` | Opaque 32-byte tokens, stored as SHA-256, `httpOnly` + `SameSite=Lax` + `Secure` in production; 12 h for students/admins, 10 h for officers (a shift); revocable server-side |
| Authorisation | `src/lib/auth.ts` → `requireRole()` | Every route declares the roles allowed; tenant scoping is by `session.institution.id` in the query, never from the request body |
| SQL injection | `src/lib/repos/**` | 100 % parameterised; no string interpolation of user input into SQL anywhere |
| Output encoding | React / Next | JSX escapes by default; no `dangerouslySetInnerHTML` in the codebase |
| Request validation | `src/lib/validation.ts` (Zod) | Every mutation parses its body first |
| Body-size limit | `src/lib/http.ts` | 2 MB cap, streamed and aborted — see F-2 |
| Rate limiting | `src/lib/rate-limit.ts` | Login (8 / 10 min per IP+email), public QR lookup (30/min per IP), anonymous found reports (10 / 10 min per IP) |
| Audit logging | `src/lib/audit.ts` | Append-only by application convention; covers login, scan, report, admin actions, data-subject requests |
| Retention | `src/lib/services/retention.ts` | Per-institution windows; strips narrative fields and finder contacts; records a `retention_runs` row as evidence |
| Transport / browser | `next.config.mjs` | `nosniff`, `Referrer-Policy`, `Permissions-Policy` (camera only for self), CSP, `frame-ancestors 'none'` unless `ALLOW_PREVIEW_EMBED=1` |
| Backups | `scripts/backup.sh` | Encrypted before touching disk; every backup verified by restoring it |

---

## 4. Findings

Severity is judgement, not CVSS. "Fixed" means fixed in this repository at the date above.

### F-1 · Deleted students stayed in the officer registry — **fixed** (high)

`softDeleteUser` anonymised the email and disabled the account, but the student's **name and
device rows remained in the offline registry every officer downloads**, and their QR label still
resolved to their name when scanned. A student who had exercised their right to erasure would have
kept circulating on every security phone.

- Fix: `offlineManifest()` and `findProductByToken()` now exclude products whose owner is
  soft-deleted. A deleted student's label resolves to `NOT_REGISTERED` — the de-escalating outcome,
  not an error. Historical reports and scan events are untouched; those are governed by the
  retention windows, not by this filter.
- Regression tests: "a deleted student's label no longer resolves to a person" and "a deleted
  student's device is gone from the officer's offline registry" in `scripts/flow-test.ts`.

### F-2 · Unbounded request bodies — **fixed** (medium)

Every endpoint used `req.json()`, which buffers the entire body. Combined with the zod advisory in
F-7 that is a memory-exhaustion vector on an unauthenticated endpoint.

- Fix: `readJson()` now streams the body and aborts past 2 MB, returning 413. Covered by
  `src/lib/__tests__/http.test.ts`.

### F-3 · Stale checkpoint id discarded an officer's scan — **fixed** (medium)

`POST /api/scan/verify` resolved the checkpoint name but passed the **raw** `checkpointId` through
to the insert. A checkpoint that had been deleted — or any id at all, including one belonging to
another institution — reached the foreign key and failed, so the scan was lost with a confusing
400. The same defect existed in the offline sync path, where it would have discarded an entire
batch captured over a shift.

- Fix: both routes now use the checkpoint they resolved for the officer's own institution, and fall
  back to `null`. The scan is recorded either way.
- Found by the load test, not by reading. Regression test in `scripts/flow-test.ts`.

### F-4 · No rate limit on registration — **open** (medium)

`POST /api/auth/register` is unthrottled. Anyone who can reach the app can (a) enumerate which
university email addresses already have accounts, via the 409 on a duplicate, and (b) create
arbitrary accounts on an enabled domain. Both are privacy and abuse problems at pilot scale.

- Interim mitigation: registration requires an enabled institution domain, and institutions are
  added by hand, so the exposed population is one university.
- Before the pilot: throttle per IP **and** per institution, and stop distinguishing "already
  registered" from "invalid" in the response (send the account-recovery email instead).

### F-5 · Rate-limit state is per-process — **open** (medium, accepted for the pilot)

`src/lib/rate-limit.ts` keeps its buckets in a `Map` inside one Node process. A restart clears
every counter; two instances do not share them. Fine on the single-VM pilot deployment it was
written for, wrong the moment the app scales out or is run behind multiple workers.

- Before scaling out: replace the `Map` with Redis. The call sites already pass a single string
  key, so the change is local to that one file.

### F-6 · `x-forwarded-for` is trusted unconditionally — **open** (medium)

`clientIp()` takes the first entry of `X-Forwarded-For` with no check that the request came from a
trusted proxy. If the app is ever exposed directly (not behind Nginx, as the deployment guide
requires), an attacker sets the header and bypasses the per-IP login throttle, and writes forged
IPs into the audit log.

- Before the pilot: only honour `X-Forwarded-For` when a `TRUSTED_PROXY` env var is set, and
  document the Nginx configuration that makes it safe.

### F-7 · zod 3.x memory-exhaustion advisory — **mitigated, upgrade deferred** (high advisory, low practical exposure)

`npm audit` reports GHSA-mrhx-c7xc-m3w5 (zod < 4.6.6 can be driven to allocate unboundedly while
validating an oversized constrained collection). Upgrading to zod 4 is a breaking change across the
validation module.

- Mitigated by the 2 MB body cap (F-2): the largest input an attacker can feed a schema is now
  bounded, and every schema in `src/lib/validation.ts` validates request bodies.
- Still to do: schedule the zod 4 migration as its own change with test coverage, and re-run
  `npm audit`.

### F-8 · postcss / Next advisories — **accepted** (build-time only)

`npm audit` reports three advisories against `postcss` reached through `next`. The fix is Next 16
(a major upgrade). postcss runs at **build** time on our own stylesheets; no attacker-controlled
CSS is processed at runtime, and no `.map` files are built with `from` unset. Accepted until the
Next major upgrade is scheduled; re-check at that point.

### F-9 · The audit log is append-only by convention, not by constraint — **open** (medium)

Application code only ever inserts into `audit_logs`, but nothing in the database prevents a
`UPDATE`/`DELETE` by anyone with SQL access, and the application connects as the owner of the
tables. For a log whose entire purpose is to be evidence, that is weak.

- Before the pilot: add a database rule or trigger rejecting `UPDATE`/`DELETE` on `audit_logs`,
  and give the application role no privilege to drop it. Retention deletes must then go through a
  dedicated, separately-granted path.

### F-10 · No self-service password reset — **open** (medium, operational)

Changing a password is implemented (`POST /api/me/password`, which also revokes every other
session). **Resetting** a forgotten one is not: a student who forgets their password must be reset
by an administrator, which puts the administrator in the position of being socially engineered
into taking over an account, and generates support load proportional to adoption.

- Before the pilot: add a tokenised reset flow (single-use, short TTL, emailed to the university
  address only), or accept the admin-mediated process and write it into the training material and
  the runbook with an audit-review expectation.

### F-11 · No way to end sessions elsewhere — **open** (low)

A user cannot see or end their own sessions. Someone who signs in on a shared library computer
stays signed in for the full 12 hours, and the only remedy is to change their password (which does
revoke every other session) or ask an administrator to suspend the account. Suspension and deletion
by an administrator revoke sessions correctly, so the high-risk case is covered.

- Before the pilot: add a "sign out other devices" action and a session list. Small, and expected
  by the privacy notice the student signs.

### F-13 · Isolation between tenants is enforced in application code — **open** (high if violated, low likelihood today)

Since the platform became multi-tenant (ADR-0007), the boundary between organisations is an
`institution_id` column that every query is expected to filter on. Nothing in the database enforces
it. One forgotten filter in a new repository function is a cross-tenant data leak, and the tests
that would catch it only cover the paths they were written for.

Mitigations in place: repository functions take the tenant id as a required argument; no route reads
a tenant id from a request; `resolveStudent` filters by institution; the flow test asserts that a
cross-tenant lookup returns 404 and that the platform overview contains no person's email.

- Before any second real organisation is onboarded: PostgreSQL row-level security keyed on a
  per-request tenant setting, so a missing filter fails **closed**. Tracked as 5.14.

### F-14 · Platform operators are a new, concentrated risk — **open** (medium)

A `PLATFORM_ADMIN` can provision, suspend and re-license every tenant. That is a lot of power in one
account, and operators are ordinary users, so the accounts are only as safe as their own password
hygiene.

- Mitigations in place: the console is a separate tree with its own guard; the API returns counts
  only (asserted by test); every action is written to `platform_audit_logs`.
- Before the pilot: require two operators for destructive actions such as closing a tenant, alert on
  any new `platform_audit_logs` row, and review that log weekly.

### F-12 · No dependency pinning or lockfile policy in CI — **open** (low)

CI runs `npm ci` from the committed lockfile (good) but nothing fails the build on new advisories.
- Add `npm audit --audit-level=high` as a CI step once F-7 and F-8 are resolved, otherwise it will
  fail permanently and be ignored.

---

## 5. Required before the pilot (2.23 exit criteria)

- [ ] Independent security review by someone who did not write this code
- [ ] F-13 row-level security between tenants, before a second real organisation is onboarded
- [ ] F-14 two-person rule for closing a tenant, plus alerting on platform audit rows
- [ ] F-13 row-level security between tenants, before a second real organisation is onboarded
- [ ] F-14 two-person rule for closing a tenant, and alerting on platform audit rows
- [ ] F-4 registration throttling and non-enumerating response
- [ ] F-6 `TRUSTED_PROXY` handling
- [ ] F-9 database-enforced append-only audit log
- [ ] F-10 password reset (or a documented, audited admin-mediated alternative)
- [ ] F-11 "sign out other devices" and a session list
- [ ] DPIA signed off by the university DPO (see `compliance.md`)
- [ ] Breach runbook walked through once on paper (see `runbook.md`)

## 6. Out of scope for this review

The offline cache's use of WebCrypto (`src/lib/offline/cache.ts`) has not been reviewed by a
cryptographer; the key is non-extractable and the payload is AES-GCM encrypted, but the key
derivation and IV handling deserve a specialist look before the offline mode is used in
production. The same applies to the backup encryption fallback (`scripts/backup-crypto.mjs`),
which is deliberately simple — prefer `age` where it is available.
