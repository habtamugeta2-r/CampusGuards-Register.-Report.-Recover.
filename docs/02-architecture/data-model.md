# Data model

Schema: [`db/migrations/0001_init.sql`](../../db/migrations/0001_init.sql) and
[`0002_identifier_uniqueness.sql`](../../db/migrations/0002_identifier_uniqueness.sql).

## 1. Entities

| Table | Purpose | Retention |
| --- | --- | --- |
| `institutions` | Tenant; also holds the governance knobs | Life of the contract |
| `users` | Accounts, roles, status; soft-deleted | Until account deletion |
| `student_profiles` | University ID, department, year, optional Fayda ID | Until account deletion |
| `sessions` | Server-side sessions, revocable | Deleted ~1 day after expiry |
| `products` | Registered devices | Until retired |
| `product_identifiers` | QR tokens and serial numbers | Tokens revoked, never deleted (they are history) |
| `ownerships` | Ownership history — transfers, recovery, revocation | Permanent record |
| `borrow_authorizations` | Temporary permission to carry someone else's device | Until expiry |
| `missing_reports` | Filed by the owner; the incident record | Narrative fields anonymised after N days |
| `found_reports` | Filed by anyone; matched to a missing report | Finder contact cleared after N days |
| `checkpoints` | Where verification happens | Life of the deployment |
| `scan_events` | **Most sensitive table** | Deleted after N days (default 90) |
| `notifications` | In-app inbox | 180 days |
| `audit_logs` | Append-only accountability trail | N days (default 1095) |
| `consent_records` | Per-version consent | Permanent evidence |
| `data_subject_requests` | Access / correction / deletion / objection | Life of the contract |
| `baseline_metrics` | Pre-pilot baseline, from the university's logbooks | Permanent |
| `retention_runs` | Evidence that deletion actually ran | Permanent |
| `schema_migrations` | Applied migrations with checksums | Permanent |

## 2. Four decisions worth explaining

### 2.1 Ownership is a table, not a column

`products.owner_id` is the current owner; `ownerships` is the history. Transfers, recoveries and
revocations append a row with an `event` label. Without this, "who had this device in March?" is
unanswerable — and that question is exactly what a dispute needs.

### 2.2 QR tokens are opaque

`product_identifiers.value` for a QR row is `CG-` + 20 Crockford base32 characters (≈100 bits of
randomness). It encodes **nothing** about the student, the device or the university. Consequences:

- Anyone scanning with a stranger's camera app sees a random string and a URL.
- A leaked database dump does not map codes to people without the database.
- Revocation is instant: set `revoked_at`, and the code stops resolving everywhere.

### 2.3 Missing and found reports are separate

They have different authors, different workflows and different data. They meet through
`found_reports.matched_missing_report_id`. Keeping them apart means a found item that never matches
anything (an unlabelled power bank) is still a first-class record.

### 2.4 Carrier identity is optional

`scan_events.carrier_id` is populated **only** when an officer ticks "I checked a university ID
card". A checkpoint scan with no ID check records the device, the place and the time — not the
person. This is the single most important privacy decision in the schema, because it is the
difference between a property log and a movement log.

## 3. The scan record

```
scan_events
  id, institution_id, checkpoint_id, product_id, token_scanned
  scanned_by_id, result, source          -- LIVE | OFFLINE_CACHE | MANUAL_ENTRY
  carrier_id?, carrier_name?, carrier_id_shown
  note?, duration_ms?
  scanned_at   -- client clock, may drift
  recorded_at  -- server clock, authoritative
  sync_batch_id?
```

`source` matters for honesty: a result produced from a cached registry is labelled as such in every
report and export, so nobody mistakes it for a live lookup.

## 4. Indexes

B-tree indexes serve every filter the UI offers: by institution and time, by product and time, by
carrier and time, by officer and time, and by result and time. `product_identifiers` carries a
partial unique index on QR token values and a plain index on `(kind, value)` for serial lookup.

The full-text needs of the admin search are served by `ILIKE` against indexed columns; at pilot
scale this is fine. If a deployment grows past a few hundred thousand rows, add a trigram index or a
search service — not before.

## 5. Identifier uniqueness (migration 0002)

The first schema put a global UNIQUE on `product_identifiers.value`. That was wrong: it broke
registration whenever two students reported the same serial number — which happens with grey-market
phones, generic accessories, and students who type the model number instead of the serial. QR tokens
must stay globally unique; serials do not. The fix keeps uniqueness where it matters (partial unique
index on QR tokens) and makes a repeated serial a *signal* rather than an error.

## 6. Migration discipline

`scripts/migrate.ts` applies files in lexicographic order, records each with a SHA-256 checksum, and
**refuses to run if an already-applied file has changed**. Editing history is how teams end up with
databases that disagree with each other. Write a new migration.
