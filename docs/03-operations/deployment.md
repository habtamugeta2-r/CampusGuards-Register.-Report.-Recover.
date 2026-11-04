# Deployment

## 1. Hard requirement: host the database in Ethiopia

Personal Data Protection Proclamation No. 1321/2024, Article 22, requires locally collected personal
data to be stored on a server or data centre in Ethiopia
[1](https://digitalpolicyalert.org/event/24922-implemented-personal-data-protection-proclamation-proclamation-no-13212024-including-data-localisation-requirements)
[2](https://www.kiyalaw.com/insights/data-protection-proclamation-1321-2024-legal-update/).

Practical consequences:

- **Do not** point `DATABASE_URL` at a foreign managed-Postgres region, even temporarily.
- **Do not** send backups, logs containing personal data, or error traces with user identifiers to
  services hosted outside the country without a legal basis and, where required, Authority approval.
- Options that satisfy it: a VM at a local data centre or with Ethio Telecom / a local cloud
  provider; the university's own server room (with a written availability commitment); or a managed
  PostgreSQL service that operates a region inside Ethiopia (verify in writing, not from a marketing
  page).
- Implementers' commentary on the localisation rule notes that implementing directives are still
  clarifying its scope — which is a reason to plan hosting early rather than a reason to wait
  [5](https://www.wingu.africa/blogs/data-needs-a-home-what-ethiopias-new-draft-data-law-means-for-infrastructure).

## 2. Reference deployment: one VM, two containers

```
        HTTPS (443)
            │
     Caddy / nginx  ── TLS termination, HSTS, rate limiting at the edge
            │
     Next.js app (port 3000, bound to 127.0.0.1)
            │
     PostgreSQL 16 (local socket or 127.0.0.1:5432)
            │
     encrypted backups → separate disk / off-site, still in Ethiopia
```

For a pilot (a few hundred students) a single 2 vCPU / 4 GB VM is ample.

### Environment

```bash
DATABASE_URL="postgresql://campusguard:<strong-password>@127.0.0.1:5432/campusguard?schema=public"
NEXT_PUBLIC_APP_URL="https://campusguard.aastu.edu.et"
BCRYPT_ROUNDS=12
SMTP_HOST=...            # optional; without it the app runs log-only
MAIL_FROM="CampusGuard <no-reply@aastu.edu.et>"
NODE_ENV=production
ALLOW_PREVIEW_EMBED=0    # never 1 in production — it relaxes framing
```

### Steps

```bash
npm ci
npm run build
npm run db:migrate           # applies migrations without prompting
npm run start               # or: docker compose up -d
```

Run the app behind a reverse proxy as a systemd unit. Do **not** expose port 3000 directly.

## 3. Headers and framing

`next.config.mjs` sets a CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and
— in production — `X-Frame-Options: DENY` plus `frame-ancestors 'none'`.

`ALLOW_PREVIEW_EMBED=1` exists **only** so the app can be displayed inside a hosted development
preview iframe. Setting it in production would let any permitted origin frame the app and enables
UI-redress attacks. Keep it `0` and check it during deployment review.

## 4. Camera access

The scanning console needs `getUserMedia`, which requires a secure context. Serve over HTTPS with a
valid certificate. If the app is ever embedded in another page, that page's iframe needs
`allow="camera"` — the app itself has fallbacks (image upload, manual entry) when it does not get it.

## 5. Backups

| Item | Cadence | Retention | Notes |
| --- | --- | --- | --- |
| `scripts/backup.sh backup` | Nightly | 30 days (`KEEP_DAYS`) | `pg_dump` custom format, encrypted before it touches disk |
| PostgreSQL base backup + WAL | Daily full, continuous WAL | 30 days | Encrypt with a key held outside the VM |
| Restore drill | Every backup, plus quarterly end-to-end | — | An untested backup is not a backup |
| `retention_runs` table | — | Permanent | Evidence that deletion actually ran |

```bash
export DATABASE_URL="postgresql://…"        # as used by the app
export BACKUP_PASSPHRASE="$(openssl rand -base64 32)"   # store in the password manager, not on the VM
export BACKUP_DIR=/srv/backups/campusguard

./scripts/backup.sh backup      # dump → encrypt → immediately restore and row-count it
./scripts/backup.sh list
./scripts/backup.sh verify <file>   # restores into campusguard_shadow and compares row counts
./scripts/backup.sh restore <file>  # interactive; asks you to type the database name
```

Details that matter:

- **The dump is never written to disk unencrypted.** `pg_dump` is piped straight into the encryptor.
  A dump contains names, university emails, student ID numbers, device serials and a movement
  history — it is the same personal data the application protects.
- **Encryption** is `age` when installed, GPG when a recipient is configured, and otherwise
  `scripts/backup-crypto.mjs` (AES-256-GCM with a scrypt-derived key, using only Node). All three
  are authenticated, so a tampered or truncated backup fails loudly instead of restoring quietly
  corrupted data.
- **Every backup is verified as it is written**: restored into `campusguard_shadow` (`--clean
  --if-exists`, i.e. rebuilt from scratch) and compared row-by-row with the live database. The
  script exits non-zero on any difference, so a cron job that fails will be noticed.
- **Keep the passphrase off the VM.** If the VM is compromised, an attacker with both the backup
  and the passphrase has the data. A passphrase only the DPO holds is the point.
- **Backups stay in Ethiopia** (Proclamation 1321/2024, Art. 22). A second off-site copy is fine
  provided the second site is also in Ethiopia.

Schedule it:

```
# /etc/systemd/system/campusguard-backup.timer  (or crontab -e)
15 2 * * *  cd /srv/campusguard && DATABASE_URL=… BACKUP_PASSPHRASE=… BACKUP_DIR=/srv/backups/campusguard \
              ./scripts/backup.sh backup >> /var/log/campusguard-backup.log 2>&1
```

Test the restore on a scratch VM, not in production.

## 6. Retention job

```bash
npm run retention           # applies each institution's windows
```

Schedule nightly:

```
# /etc/systemd/system/campusguard-retention.timer  (or crontab -e)
0 3 * * *  cd /srv/campusguard && /usr/bin/npm run retention >> /var/log/campusguard-retention.log 2>&1
```

It deletes expired scan events, old notifications and expired sessions; strips narrative fields from
closed reports and finder contact details from old found reports; deletes audit rows past the audit
window; and records a `retention_runs` row with the counts.

## 7. Monitoring

Two levels, because they have different audiences:

| Endpoint | Who calls it | What it is for |
| --- | --- | --- |
| `GET /api/health` | Uptime check, load balancer, service worker | Liveness + database reachability. Unauthenticated, cheap, poll every 60 s. |
| `GET /api/health?deep=1` | Monitoring system, on-call administrator | The things the runbook tells you to alert on (below). Requires an ADMIN session or `x-monitor-token` matching `MONITOR_TOKEN`. |

The deep check returns counts only — no names, emails, student IDs or tokens:

```json
{ "status": "ok",
  "migrationsApplied": 2,
  "counts": { "users": 512, "products": 940, "scanEvents": 18233,
              "openReports": 7, "pendingDataSubjectRequests": 0, "failedLoginsLastHour": 0 },
  "retention": { "lastRunAt": "2026-11-04T03:00:00Z", "stale": false },
  "checks": { "database": "up", "retentionStale": false } }
```

A signed-in administrator sees their own institution's numbers only; a token-authenticated monitor
sees the whole deployment.

Alert on:

| Signal | Threshold | Why |
| --- | --- | --- |
| `checks.database` | anything but `up` | Nothing works without it |
| `retention.stale` | `true` (> 48 h since the retention job ran) | Retention is a legal promise, not a chore. Silence means it is broken |
| `counts.pendingDataSubjectRequests` | > 0 for more than 72 h | Proclamation 1321/2024 response expectations; unanswered requests are a complaint waiting to happen |
| `counts.failedLoginsLastHour` | sudden spike | Credential stuffing, or a student locked out of their own account |
| `openReports` | sharp drop with no matching recoveries | Usually means reporting has silently broken, not that theft stopped |
| 5xx rate, `/api/health` failures | any sustained | Basic liveness |
| Any `scan.history.access` audit row | every one | The most surveillance-sensitive action in the product; an unexpected row is a question to ask, not a log line to file |

Also:

- Poll `/api/health` every 60 s from outside the VM — an in-VM check cannot tell you the VM is
  unreachable.
- Ship application logs off the VM, but strip or avoid logging tokens, emails and serial numbers.
- `retention_runs` doubles as the retention job's heartbeat; alert if the newest row is older than
  48 h rather than trusting cron.
- Review the audit log weekly by hand, specifically `scan.history.access` and `user.delete`.
  Nothing catches an administrator misusing access except another human reading what they did.

## 8. Pre-launch checklist

- [ ] Database hosted in Ethiopia, evidenced in writing
- [ ] `ALLOW_PREVIEW_EMBED=0`, HTTPS with HSTS
- [ ] Database password generated, not defaulted
- [ ] `npm run db:migrate` applied; migrations checksummed
- [ ] Retention windows agreed with the university DPO and set per institution
- [ ] Backups configured **and** a restore rehearsed
- [ ] Retention job scheduled and observed to run
- [ ] `npm run smoke` and `npm run flow-test` green against the deployed instance
- [ ] Breach runbook printed and on the wall (see `runbook.md`)
- [ ] ECA controller/processor registration under way (see `compliance.md`)
