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
| PostgreSQL base backup + WAL | Daily full, continuous WAL | 30 days | Encrypt with a key held outside the VM |
| Restore drill | Quarterly | — | An untested backup is not a backup |
| `retention_runs` table | — | Permanent | Evidence that deletion actually ran |

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

## 7. Monitoring (minimum)

- `GET /api/health` — liveness and database reachability; poll every 60 s.
- Alert on: 5xx rate, health-check failures, retention job not having run in 48 h, failed login
  spikes (credential stuffing), and any `scan.history.access` audit row you did not expect.
- Ship application logs off the VM, but strip or avoid logging tokens, emails and serial numbers.

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
