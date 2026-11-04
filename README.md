# CampusGuard — Register. Report. Recover.

A **multi-tenant** property registry and recovery platform: students and staff register their
devices, report them missing, and whoever staffs a checkpoint gets a verification tool that is
honest about what it can and cannot tell them.

One deployment serves many organisations — a university, a college, a company, a government office —
each with its own email domains, retention windows, licence, seat limit and data region. A platform
operator provisions them and cannot read their data.

This repository contains a **working implementation** (Next.js + PostgreSQL) plus the research,
product, architecture and operations documentation needed to run a controlled pilot at one
organisation — and to add the second, third and hundredth afterwards.

> **Read this first:** the product deliberately does not claim to prevent theft. It creates the
> institutional record that makes recovery possible. See
> [`docs/01-product/prd.md`](docs/01-product/prd.md#non-goals) for what it explicitly refuses to
> promise, and [`docs/00-research/assumptions-to-test.md`](docs/00-research/assumptions-to-test.md)
> for the six assumptions that decide whether this product should exist at all.

---

## 1. What is built

| Area | Status | Notes |
| --- | --- | --- |
| Student registration & institutional email verification | ✅ | Sign-up limited to the university's email domain |
| Device registration with opaque QR tokens | ✅ | Token rotation, printable label, label history |
| Missing-item reporting | ✅ | Notifies security + lost-property desk, flags the device |
| Public QR status page | ✅ | No personal data revealed to whoever scans |
| Found-item reporting (including anonymous finders) | ✅ | Auto-matches to the open missing report |
| Checkpoint scanning (camera, image upload, manual entry) | ✅ | Records result, duration, checkpoint, optional carrier ID |
| Borrowing authorisation | ✅ | Prevents a loaned laptop becoming a false alert |
| Officer offline mode | ✅ | Encrypted IndexedDB cache + outbox that syncs on reconnect |
| Administration dashboard | ✅ | Pilot metrics vs. a recorded pre-pilot baseline |
| Reports desk, found desk, registry, people, checkpoints | ✅ | All with audit logging |
| Governance controls | ✅ | Retention windows, justification-gated scan history, audit log |
| Data-subject rights | ✅ | JSON export, correction/deletion/objection requests, consent records |
| PWA (installable, offline shell) | ✅ | Service worker + manifest; authenticated API is never cached |
| Automated tests | ✅ | 21 unit tests, 47 smoke checks, 73 end-to-end workflow checks, 35-page accessibility audit, load test at 20k devices |
| Production deployment tooling | ⚠️ | Documented + Dockerfile/compose; not yet run against a live Ethiopian host |
| Multi-tenant platform | ✅ | Many organisations per deployment: universities, colleges, companies, government offices — each with its own domains, retention, licence and data region |
| Platform operator console | ✅ | `/platform` — provision tenants, review applications, set licences and seat limits. Operators see counts, never people |
| Country-level view | ✅ | `/platform/country` — a ministry or federation sees adoption and recovery across a country, aggregate only, and cannot open a tenant |
| Per-tenant branding | ✅ | One hex and a logo per organisation, on printed labels, emails and the public status page |
| Public onboarding | ✅ | `/join` — an organisation applies; a human approves it |



The full "what is left to do" list, with priorities and acceptance criteria, is
[`docs/01-product/implementation-todo.md`](docs/01-product/implementation-todo.md).

---

## 2. Quick start (development)

Requirements: Node 20.11+, a PostgreSQL 14+ database.

```bash
# 1. Install dependencies
npm install

# 2. Configure the environment
cp .env.example .env          # then edit DATABASE_URL

# 3. Create the schema
npm run db:migrate

# 4. Load demo data (AASTU, 8 students, 12 devices, 155 scans, 1 open report)
npm run db:seed

# 5. Run
npm run dev                   # http://localhost:3000
```

Sign in with password **`Demo#2026`**:

| Role | Email | What to look at |
| --- | --- | --- |
| Student | `abel@aastu.edu.et` | A laptop already reported missing, and a found report waiting at the desk |
| Security officer | `officer@aastu.edu.et` | `/security` — scan console with offline cache |
| Administrator | `admin@aastu.edu.et` | `/admin` — pilot scoreboard, reports, audit log |
| Administrator, other tenant | `admin@bdu.edu.et` | Same console, different university (a trial tenant) |
| Gate guard, company tenant | `guard@hitechplc.et` | A company whose "students" are employees |
| Platform operator | `ops@campusguard.et` | `/platform` — four tenants, one application awaiting review |
| Country operator | `ministry@campusguard.et` | `/platform/country` — Ethiopia's scoreboard: counts, no people |

### No PostgreSQL server? Use the bundled one

The sandbox/CI path uses [`pgserver`](https://pypi.org/project/pgserver/), which ships PostgreSQL
binaries with pip — no system package, no Docker:

```bash
pip install pgserver
python3 -c "import pgserver; pgserver.get_server('/tmp/pgdata')"
# then set DATABASE_URL to postgresql://postgres:@/postgres?host=/tmp/pgdata
```

`scripts/db.sh up` wraps this for the dev database used here.

---

## 3. Verifying it works

```bash
npm run typecheck                       # TypeScript, no emit
npm run build                           # production bundle (also validates Next.js route modules)
npm test                                # unit tests (verification rules, tokens, formatting)
npm run dev                             # in one terminal …
npm run smoke                           # … 47 page/API checks as each role
npm run flow-test                       # 73 end-to-end workflow checks through the HTTP API
npm run retention                       # apply each institution's retention windows (deletes)
npm run load-test                       # 20k-device load test: manifest + verify latency
npm run a11y                            # axe-core over 35 pages as each role
npm run backup                          # encrypted dump, verified by restoring it
```

`npm run load-test` creates a throwaway institution with 20,000 devices, 5,000 students and 20,000
scan events, then measures the two endpoints that decide whether the product works at a gate: the
offline registry manifest (3.1 MB, ~130 ms p95) and a live scan (~57 ms p95). It deletes everything
afterwards.

`npm run a11y` runs axe-core against every page as each role and fails on any violation. It is a
floor, not a certificate: `docs/03-operations/accessibility.md` records what it cannot see (contrast
needs a layout engine) and what has not been tested at all (screen readers, low-end devices).

`npm run flow-test` walks the entire product story through the public API: register → label →
report missing → a member of the public finds and scans it → an officer scans it at a checkpoint →
the desk returns it → the report closes as recovered → governance checks (a student cannot read the
admin dashboard; an administrator cannot pull one person's scan history without a justification).

---

## 4. How it fits together

```
                    CAMPUSGUARD (Next.js 15, App Router, TypeScript)
                                    |
        ---------------------------------------------------------------
        |                           |                                 |
   Student portal             Security console                  Admin dashboard
   /student/*                 /security/*                       /admin/*
   register · report          scan · offline cache · history    metrics · reports · audit
        |                           |                                 |
        --------------------------- API -------------------------------
                                    |
     auth · products · reports/missing · reports/found · authorizations
     scan/verify · scan/manifest · scan/sync · checkpoints · admin · me · public
                                    |
     -----------------------------------------------------------------
     |              |                |                 |              |
  Identity     Property         Reports           Verification     Governance
  sessions     products         missing/found     scan events       audit logs
  RBAC         identifiers      matching          offline cache     retention
               ownerships                                          consents
                                    |
                            PostgreSQL 14+
                   (hosted inside Ethiopia in production — Art. 22)
```

Key design decisions, each with a written rationale, are in
[`docs/02-architecture/adr/`](docs/02-architecture/adr):

1. **No ORM** — hand-written SQL behind small repository modules (ADR-0002).
2. **Server-side sessions, not JWTs** — an officer's session must be revocable the moment their
   shift ends (ADR-0003).
3. **The verification rule engine is a pure function** — the most consequential logic in the product
   is unit-tested in isolation (ADR-0004).
4. **QR codes contain only an opaque token** — scanning a label with a stranger's camera app reveals
   nothing about the owner (ADR-0005).
5. **The offline cache is encrypted with a non-extractable key** — a lost phone must not become a
   data breach (ADR-0006).

Security and privacy are self-assessed in
[`docs/03-operations/security-review.md`](docs/03-operations/security-review.md): what is
protected, from whom, which controls exist, and twelve findings — three fixed, nine still open.
It is explicitly **not** an independent review, and item 2.23 of the implementation to-do keeps
that requirement open.

---

## 5. Many organisations, one deployment

`/platform` is the operator's console; `/join` is how an organisation applies to be on it.

```
        platform operator (/platform)          public application (/join)
                    │                                     │
        provision · licence · suspend            reviewed by a human
                    │                                     │
                    └──────────► tenants ◄────────────────┘
                                  │
        ┌─────────────┬───────────┴──────┬──────────────────┐
     AASTU          BDU             Hi-Tech PLC        CGOPS
   university    university          company        (the operator's
    active         trial              active          own tenant)
        │            │                   │
   own domains · own retention · own administrators · own data region
                                  │
                    country operator (/platform/country)
                aggregates for one country · no tenant opens
```

Neither console sees people. The operator's view is counts: organisations, people, devices, scans,
open reports. The country view is the same numbers for one country, plus one row per organisation
(name, type, status and counts) because a ministry that cannot compare institutions cannot do its
job. Everything either of them does is written to a platform audit log that no tenant can read or
edit, and an organisation's own administrator can change its name, location and branding but not its
domains, licence or seat limit — otherwise the platform would be a suggestion.

The full model, including what isolation does and does not depend on, is in
[`docs/02-architecture/multi-tenancy.md`](docs/02-architecture/multi-tenancy.md).

---

## 6. Repository layout

```
db/migrations/        SQL migrations, applied in order by scripts/migrate.ts
public/               service worker, icons (generated), static assets
scripts/              migrate, seed, reset, retention, smoke tests, icon generation
src/app/              Next.js routes
  (auth: /login, /register, /join)
  /platform           platform operator console (provisioning, applications, audit)
  /student            student portal
  /security           officer console
  /admin              administration
  /s/[token]          public QR status page (no personal data)
  /found              anonymous found-item reporting
  /legal              privacy notice, data rights, terms
  /api/*              JSON API used by the browser
src/components/       UI (server components + a small number of client components)
src/lib/
  repos/              data access, one module per aggregate
  services/           cross-cutting workflows (scan verification)
  __tests__/          unit tests
docs/
  00-research/        competitors, regulation, discovery plan, assumptions to test
  01-product/         PRD, pilot plan, implementation to-do
  02-architecture/    overview, data model, security, offline, API, ADRs
  03-operations/      deployment, runbook, compliance, training
```

---

## 7. Deployment note (Ethiopia)

Ethiopia's Personal Data Protection Proclamation No. 1321/2024 requires locally collected personal
data to be stored on servers in Ethiopia [1](https://digitalpolicyalert.org/event/24922-implemented-personal-data-protection-proclamation-proclamation-no-13212024-including-data-localisation-requirements).
The schema and application make no assumption about the cloud; see
[`docs/03-operations/deployment.md`](docs/03-operations/deployment.md) for a single-VM deployment
that satisfies that requirement, including backups and the nightly retention job.

---

## 8. Honest limitations

- **No theft prevention.** A determined thief ignores the sticker. This is stated in the product,
  the officer guidance page and the terms.
- **No device tracking.** There is no GPS, no agent, no MDM. Manufacturer tools (Find My Device and
  similar) are better at that and this product does not try to compete with them.
- **Value scales with adoption.** A registry covering 5% of campus devices is close to useless.
  Reaching the tipping point is the single hardest operational problem — see
  [`docs/00-research/assumptions-to-test.md`](docs/00-research/assumptions-to-test.md#a1-adoption).
- **The pilot has not run.** Every metric in the dashboard is wired up and computed from real data,
  but no university has yet validated that recovery rates improve. Do not skip
  [`docs/01-product/pilot-plan.md`](docs/01-product/pilot-plan.md).

---

## 9. Licence and provenance

MIT. Built as a business-and-product proposal turned into a working prototype for Ethiopian higher
education. Research sources are cited inline in `docs/00-research/`.
