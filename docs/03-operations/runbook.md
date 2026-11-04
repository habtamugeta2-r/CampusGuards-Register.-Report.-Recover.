# Operational runbook

## 1. Service inventory

| Component | Health check | Restart |
| --- | --- | --- |
| Next.js app | `GET /api/health` → 200 | `systemctl restart campusguard` |
| PostgreSQL | `pg_isready` | `systemctl restart postgresql` |
| Retention job | `retention_runs` has a row in the last 48 h | `npm run retention` |
| Email delivery | A sent notification row with `channel = 'EMAIL'` | check SMTP credentials |

## 2. Common incidents

### 2.1 Scans fail with "not a CampusGuard code"

Most likely: the label is faded, torn, or the student is holding a different code (a manufacturer QR,
a sticker from something else). **Fallback:** type the code printed beneath the QR. If the code
resolves but the label is unreadable, issue a replacement label from the device page.

### 2.2 Officers report the camera will not start

Check, in order: HTTPS (getUserMedia needs a secure context), browser camera permission, whether the
app is in an iframe without `allow="camera"`, and whether another app holds the camera. Fallbacks —
image upload and manual entry — produce an identical scan record, so a broken camera is not an outage.

### 2.3 The offline cache will not download

`GET /api/scan/manifest` is authenticated and institution-scoped. Check the officer's session has not
expired (10 h), that the institution has products, and that the browser allows IndexedDB (private
browsing often does not). Every download is audited as `offline.manifest_download`.

### 2.4 Duplicate or missing scan records after a sync

The sync endpoint re-resolves each scan and stores `source = OFFLINE_CACHE`. Duplicates would mean a
batch was replayed after a partial failure — check `sync_batch_id` in `scan_events`. Missing records
mean the outbox was cleared before the server confirmed; the client only removes items after a 2xx
response, so check the officer's device log first.

### 2.5 A student says a scan result was wrong

Take it seriously — this is the false-alert metric. Reconstruct from `scan_events` (result, carrier,
checkpoint, officer), check whether a borrowing authorisation existed, then look at whether the
*rule* or the *data* was wrong. Fix the data with an audited change; fix the rule in
`src/lib/verify.ts` with a test. Tell the student what you found.

### 2.6 An officer's device is lost or stolen

1. Revoke their sessions (`/admin/users` → status, or `revokeAllSessions`).
2. Record the incident in the audit log and the incident log.
3. The offline cache on that device is encrypted with a non-extractable key (ADR-0006), so the key
   material cannot be exported; note this in the breach assessment.
4. Assess whether the device held data beyond the cache (notifications, cached pages).
5. Follow §4 if personal data may have been accessed.

### 2.7 An alert was acted on as if it were a verdict

Treat as a governance incident, not a bug. The scan screen and the officer guidance page both state
that a result is information, not a verdict. Record what happened, retrain, and review whether the
wording needs to be blunter. Log it in the pilot's stop-condition list.

## 3. Data correction and deletion requests

| Request | Action | Evidence |
| --- | --- | --- |
| ACCESS / EXPORT | Point the student to **My data → Download my data**; the file is generated from the live database | `data_subject.export` audit row |
| CORRECTION | Fix the record; note the change in the audit log | `user.update` / `product.update` |
| DELETION | Set the account to `DISABLED` then soft-delete from `/admin/users` (clears phone, revokes sessions, mangles the email so it can be re-used). Scan records are anonymised rather than deleted where an incident is under investigation | `user.delete` + `data_subject.request` rows |
| OBJECTION | Record it, stop the objected-to processing, and escalate to the DPO | `data_subject.request` row |

Respond in writing. The university is the controller; CampusGuard operates the software.

## 4. Breach response — 72 hours

Proclamation 1321/2024 requires the controller to notify the ECA **within 72 hours** of becoming
aware, and to inform affected individuals within 72 hours unless encryption renders the data
unintelligible; a processor must inform the controller without undue delay
[2](https://www.kiyalaw.com/insights/data-protection-proclamation-1321-2024-legal-update/).

| Hour | Action | Owner |
| --- | --- | --- |
| 0 | Detect and declare an incident. Start the log with times in UTC and Africa/Addis_Ababa | On-call engineer |
| 0–1 | Contain: rotate credentials, revoke sessions, block the source, take a forensic copy | Engineer |
| 0–1 | **Notify the university DPO** (the controller). They own the regulatory notification | Engineer → DPO |
| 1–4 | Assess: which tables, which people, how many, was it encrypted, is it intelligible | Engineer + DPO |
| 4–24 | Draft the notification: nature, categories and approximate number of data subjects and records, likely consequences, measures taken, contact point | DPO |
| 24–72 | Notify the ECA; notify affected individuals unless the data is unintelligible | DPO |
| 72+ | Remediate, write the post-incident review, publish the fix | Team |

**Preparedness:** keep the DPO's name and out-of-hours number in this file. Every deployment should
rehearse this table once before going live (backlog 4.8).

## 5. Change management

- Migrations: new file in `db/migrations/`, never edit an applied one.
- Any change to what is stored about a person: update `data-model.md`, the privacy notice version, and
  the consent version, and re-consent affected users if the purpose has changed.
- Any new staff capability: audit it, and gate it if it touches an individual's records.
- Release: `npm run typecheck && npm test && npm run build`, then `npm run db:migrate`, then
  `npm run smoke` against the deployed instance.
