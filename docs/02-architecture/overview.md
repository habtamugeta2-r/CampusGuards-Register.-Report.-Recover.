# Architecture overview

## 1. Shape of the system

A **modular monolith**: one Next.js application, one PostgreSQL database, clearly separated internal
modules. Not microservices — a small team should not operate a distributed system to serve a few
hundred students at one checkpoint.

```
Browser (PWA)
  │  HTTPS, TLS only
  ▼
Next.js 15 (App Router, TypeScript, React 19)
  ├── Route handlers   src/app/api/**        JSON API, node runtime
  ├── Server components src/app/**           read models, render HTML
  └── Client components src/components/**    scanner, forms, offline cache
        │
        ├── src/lib/services/scan.ts         verification workflow (shared by live + offline paths)
        ├── src/lib/repos/*.ts               data access, one module per aggregate
        ├── src/lib/verify.ts                PURE rule engine (no I/O) — unit tested
        └── src/lib/{audit,notifications,retention,rate-limit,mailer}.ts
        │
        ▼
PostgreSQL 14+  (in Ethiopia in production — Art. 22)
```

## 2. Request flow — a checkpoint scan

```
Officer scans label
  → Scanner decodes the token in the browser (html5-qrcode, no image leaves the device)
  → POST /api/scan/verify  { token, checkpointId, carrierIdentifier?, carrierIdShown }
       │
       ├─ requireRole('SECURITY','ADMIN')        ← 403 for anyone else
       ├─ normalizeToken()                        ← accepts URL, lower case, Crockford confusions
       ├─ findProductByToken()                    ← one indexed query
       ├─ resolveBorrower() (only when an ID was actually checked)
       ├─ hasActiveAuthorization()
       ├─ resolveVerification()                   ← PURE, unit-tested decision
       ├─ recordScan()                            ← result, source, duration, checkpoint
       ├─ logAudit('scan.verify')
       └─ notify owner + admins when the result is ACTIVE_MISSING_REPORT
  → Response: result, headline, detail, action, device, owner name + student ID only
```

The same `verifyAndRecord()` runs for live scans, manual entry and the offline batch upload, so all
three paths cannot drift apart.

## 3. Offline path

```
No connectivity
  → resolve from the encrypted IndexedDB cache (labelled "cached" on screen)
  → enqueue the scan in an outbox
  → on reconnect: POST /api/scan/sync with the batch
       → server RE-RESOLVES each scan against live data and stores source = OFFLINE_CACHE
```

See [`offline.md`](offline.md).

## 4. Modules

| Module | Responsibility | Notes |
| --- | --- | --- |
| `lib/auth.ts`, `lib/session.ts` | Authentication, RBAC, session lifecycle | Server-side sessions, revocable |
| `lib/repos/*` | SQL for one aggregate each | No ORM; see ADR-0002 |
| `lib/services/scan.ts` | The verification workflow | Shared by live, manual and sync paths |
| `lib/verify.ts` | The decision rule | Pure function, no I/O |
| `lib/audit.ts` | Append-only audit trail | Never throws into a request |
| `lib/notifications.ts`, `lib/mailer.ts` | In-app + email (best-effort) | Email failures never break a workflow |
| `lib/retention.ts` | Deletion and anonymisation | Nightly job |
| `lib/metrics.ts` | Pilot scoreboard | Computed in SQL |
| `lib/rate-limit.ts` | Fixed-window limiter | Process-local; swap to Redis behind >1 instance |
| `lib/tokens.ts` | QR token generation and normalisation | Opaque, unguessable |

## 5. Cross-cutting decisions

- **Every route handler is wrapped in `route()`** (`lib/http.ts`), which turns Zod errors into 400,
  auth errors into 401/403, unique violations into 409, and logs everything else with a short
  reference id instead of leaking a stack trace.
- **Dates are server-authoritative.** `scan_events.scanned_at` is the client clock (may drift);
  `recorded_at` is the server clock and is what retention and reporting use.
- **Tenancy is enforced in SQL.** Every institution-scoped query filters on `institution_id`; there
  is no "current tenant" global.
- **Nothing sensitive is cached in the service worker.** See ADR-0006.

## 6. What is deliberately absent

- No queue, no cache tier, no search cluster, no object store. At pilot scale they are operational
  cost with no benefit.
- No ORM (ADR-0002).
- No client-side state management library — server components already hold the data.
- No telemetry or analytics SDK. A product asking students to trust it with a device registry should
  not be quietly phoning home.

## 7. Capacity

A single 2-vCPU / 4 GB instance with PostgreSQL alongside comfortably serves a pilot of a few
hundred students: the heaviest endpoint (`GET /api/scan/manifest`) returns up to 20,000 short rows
once per officer shift and is the only one worth load-testing (backlog item 2.24).
