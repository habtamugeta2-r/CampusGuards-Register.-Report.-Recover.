# Security, privacy and threat model

## 1. What we are protecting, and from whom

| Asset | Sensitivity | Why |
| --- | --- | --- |
| Scan events | **Highest** | Reveals who carried what, where and when — a movement log if abused |
| Account data (email, phone, name) | High | Enables phishing and social engineering |
| Device serial numbers | High | Useful for resale fraud and for impersonating an owner |
| Audit logs | High (integrity) | Their value depends on them being untamperable |
| Product descriptions | Moderate | A shopping list of valuable devices by owner |
| Checkpoint configuration | Low | — |

**Adversaries we actually plan for:**

1. **A curious insider** — an officer or administrator browsing records out of interest.
   *Controls:* RBAC, minimum-necessary API responses, justification-gated scan history, audit log,
   and audit-log access itself being audited.
2. **A thief with a found phone** — an officer's device is lost.
   *Controls:* short officer sessions (10 h), revocable sessions, encrypted offline cache with a
   non-extractable key, no serial numbers or emails in the scan response.
3. **A social engineer** — someone convincing the desk to hand over a device.
   *Controls:* finders never see owner contact details; returns are recorded with a note and an
   actor; the owner is notified.
4. **An external attacker** — SQL injection, XSS, credential stuffing.
   *Controls:* parameterised SQL everywhere (no string interpolation of user input), React escaping
   by default, CSP, bcrypt (cost 12), login throttling and lockout, httpOnly + SameSite cookies.
5. **The institution itself, over time** — mission creep from "recover devices" to "monitor
   students". *Controls:* short retention, aggregate analytics off by default, a written prohibited-
   uses clause in the pilot agreement, and a public privacy notice that would make reversal visible.

## 2. Access matrix

| Data | Student | Security officer | Administrator |
| --- | --- | --- | --- |
| Own devices, reports, notifications | ✅ | — | — |
| Own scan records | ✅ | — | — |
| Device description + owner name at scan time | — | ✅ (only what the scan response contains) | ✅ |
| Owner email or phone | — | ❌ | ✅ (only when handling a specific case) |
| Full serial number | ✅ (own) | ❌ (last 4 only) | ✅ |
| Found reporter's contact details | ❌ | ✅ (desk role) | ✅ |
| Another student's full scan history | ❌ | ❌ | ✅ **with a recorded justification** |
| Audit log | ❌ | ❌ | ✅ (each view is itself audited) |
| Institution-wide metrics | ❌ | ❌ | ✅ |
| Retention and governance settings | ❌ | ❌ | ✅ |

## 3. Controls implemented

| Control | Where |
| --- | --- |
| Authentication: server-side sessions, opaque random tokens, hashed at rest | `lib/session.ts` |
| Passwords: bcrypt cost 12, minimum 10 characters, lockout after 8 failures | `lib/password.ts`, `repos/users.ts` |
| Authorisation on every route and page | `lib/auth.ts`, `requireRole()` |
| Parameterised SQL only | all `lib/repos/*` |
| Rate limiting: login, public scan, anonymous found reports | `lib/rate-limit.ts` |
| CSRF: `SameSite=Lax` cookies plus JSON-only mutation endpoints | global |
| Security headers: CSP, nosniff, referrer policy, permissions policy | `next.config.mjs` |
| Framing: `frame-ancestors 'none'` + `X-Frame-Options: DENY` in production (relaxed only when `ALLOW_PREVIEW_EMBED=1` for a hosted preview) | `next.config.mjs` |
| Audit trail: every sensitive action, including reads of individual history | `lib/audit.ts` |
| Retention: nightly deletion and anonymisation | `lib/retention.ts` |
| Offline cache: AES-GCM with a non-extractable key | `lib/offline/cache.ts` |
| Data minimisation in API responses | `services/scan.ts`, `/api/public/verify/[token]` |
| Service worker never caches API responses | `public/sw.js` |

## 4. Known gaps — close these before real student data

1. **Independent security review / penetration test** (backlog 2.23). Not yet done.
2. **Encryption at rest for serial numbers.** The schema and code treat `products.serial_number` as
   sensitive but store it in plaintext; production should use column-level encryption (pgcrypto or
   an application-level envelope key held outside the database).
3. **MFA for administrators.** Not implemented. Administrator accounts can change roles and export
   data; they should require a second factor.
4. **Backup encryption and restore drills** (backlog 4.3).
5. **Audit log tamper-evidence.** Rows are append-only by application convention, not by database
   permission. A separate, restricted database role for the retention job, and a hash chain, would
   make this a real control.
6. **Session device binding.** An officer's session is not bound to the device it started on.
7. **Rate limiting is process-local.** Behind more than one instance, move it to Redis.
8. **No anomaly detection** on bulk reads (e.g. an administrator exporting the registry repeatedly).

## 5. Breach response (72 hours)

Proclamation 1321/2024 requires notification to the ECA and to affected individuals within 72 hours
of becoming aware, unless encryption renders the data unintelligible
[2](https://www.kiyalaw.com/insights/data-protection-proclamation-1321-2024-legal-update/). The
step-by-step procedure, with roles and timings, is in
[`../03-operations/runbook.md`](../03-operations/runbook.md).

## 6. Design principle

When a control and a convenience conflict in this codebase, the control wins if the data is about a
person. Concretely: the officer's scan screen deliberately omits the serial number and contact
details that would make verification marginally easier, because the scan record outlives the
encounter and a stolen phone should not unlock a registry.
