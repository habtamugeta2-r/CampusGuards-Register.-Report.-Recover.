# API reference

All endpoints are JSON, live under `/api`, and require the session cookie unless marked **public**.
Mutations return `200` with a small JSON body, or `4xx` with `{ "error": "…" }` (validation errors
add `issues: [{ path, message }]`).

---

## Authentication

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | public | University email domain must be registered. Records consent versions, creates a session |
| POST | `/api/auth/login` | public | Throttled per IP+email; locks after 8 failures; identical error for unknown accounts |
| POST | `/api/auth/logout` | any | Revokes the session server-side |
| GET | `/api/auth/me` | any | User, institution, profile, unread count |

## Devices

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/products` | STUDENT (own) · ADMIN (all, with `status`, `search`, `limit`, `offset`) | |
| POST | `/api/products` | STUDENT | Creates the product, a QR token, a serial identifier and an ownership row |
| GET | `/api/products/:id` | STUDENT (own) · ADMIN | Product, identifier history, ownership history |
| PATCH | `/api/products/:id` | STUDENT (own) · ADMIN | Editable: brand, model, serial, colour, marks, notes, type |
| DELETE | `/api/products/:id?reason=` | STUDENT (own) · ADMIN | Soft retire; the QR code stops resolving |
| POST | `/api/products/:id/qr` | STUDENT (own) · ADMIN | Issues a replacement label; old token revoked immediately |

## Reports

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/reports/missing` | STUDENT (own) · ADMIN/SECURITY (all) | Filters: `status`, `category`, `search` |
| POST | `/api/reports/missing` | STUDENT · ADMIN | Flags the device, notifies security and admins |
| PATCH | `/api/reports/missing/:id` | ADMIN · SECURITY | `{ status, notes }` — audited; owner notified |
| GET | `/api/reports/found` | ADMIN · SECURITY | Filter: `status` |
| POST | `/api/reports/found` | **public** (rate-limited when anonymous) | Auto-matches an open missing report |
| PATCH | `/api/reports/found/:id` | ADMIN · SECURITY | `{ action: 'match' \| 'return', missingReportId?, custodyLocation?, notes? }` |

## Borrowing

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/authorizations` | STUDENT | `{ granted, received }` |
| POST | `/api/authorizations` | STUDENT | `{ productId, borrowerIdentifier, endsAt, reason? }` — resolves the borrower by university ID or email |
| DELETE | `/api/authorizations/:id` | STUDENT (grantor) · ADMIN | Revokes immediately |

## Checkpoint verification

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/scan/verify` | SECURITY · ADMIN | `{ token, checkpointId?, carrierIdentifier?, carrierIdShown?, note?, durationMs?, offline?, scannedAt? }` |
| GET | `/api/scan/manifest` | SECURITY · ADMIN | Registry snapshot for the offline cache; audited |
| POST | `/api/scan/sync` | SECURITY · ADMIN | `{ batchId, checkpointId?, scans: [...] }` — re-resolves each scan live, stores `source = OFFLINE_CACHE` |

The scan response contains the result, headline, detail, action, device description, owner **name and
student ID**, masked serial (last 4) and the checkpoint. It never contains email, phone or full
serial.

## Administration

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/metrics` | Pilot scoreboard + last retention run |
| GET | `/api/admin/audit` | Filters: `action`, `actorId`, `entityType`, `entityId`, `from`, `to`. Viewing is itself audited |
| GET | `/api/admin/scan-history?identifier=&justification=` | ADMIN only. Requires ≥10 characters of justification when the institution requires it |
| GET | `/api/admin/export?type=summary\|reports\|scans` | CSV, no student identifiers; audited |
| PATCH | `/api/admin/users/:id` | `{ role? }` and/or `{ status?, reason? }`; revokes sessions on change; self-demotion blocked |
| DELETE | `/api/admin/users/:id?reason=` | Soft delete, clears phone, revokes sessions |
| GET/POST | `/api/checkpoints` | ADMIN creates; SECURITY can list |
| PATCH | `/api/checkpoints/:id` | ADMIN |
| PATCH | `/api/admin/settings` | Retention windows and governance flags; audited |

## Self-service / data-subject rights

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/me` | Profile, consents, requests, retention windows |
| GET | `/api/me/export` | Full JSON export of everything held about the user; audited |
| POST | `/api/me/requests` | `{ kind: ACCESS \| EXPORT \| CORRECTION \| DELETION \| OBJECTION, details? }`; notifies admins |
| POST | `/api/me/password` | Requires the current password; signs out other sessions |
| GET | `/api/notifications` | In-app inbox |
| POST | `/api/notifications/read` | `{ id? }` — one, or all when omitted |

## Public

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/public/verify/:token` | Rate-limited. Returns device type, registered/reported-missing status and a message. **No personal data** |
| GET | `/api/health` | Liveness and database reachability |

## Conventions

- **Errors:** `{ "error": "message" }`, with `issues` for validation failures.
- **Pagination:** `limit` (default 50, max 200) and `offset`.
- **Dates:** ISO 8601 UTC in JSON. `scan_events` carries both `scannedAt` (client clock) and the
  authoritative server time.
- **Ids:** prefixed, e.g. `usr_…`, `prd_…`, `scn_…`, `aud_…`.
- **Idempotency:** the offline sync endpoint accepts a `batchId` and removes successfully synced
  items from the device queue, so a retry cannot duplicate records.
