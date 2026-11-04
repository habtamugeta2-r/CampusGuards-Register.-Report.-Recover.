# ADR-0007 · One multi-tenant platform, not one app per organisation

**Date:** 2026-11-04
**Status:** Accepted
**Decides:** how CampusGuard holds more than one organisation

---

## Context

The original proposal describes a single university: one registry, one set of officers, one
administrator. That is the right shape for a pilot and the wrong shape for a product, because:

1. **The problem is not specific to one university.** Any organisation that issues equipment and has
   a door — colleges, TVET institutes, companies, government offices, NGOs — needs the same four
   capabilities: register, report, verify at a checkpoint, authorise a borrower.
2. **A registry's value scales with coverage.** If adoption is the hardest problem (assumption A1),
   then a design that can only ever serve one institution caps the answer to "how many devices can
   we reunite with their owners?"
3. **The business model is institutional.** Universities pay; students never do. Selling to a second
   university must not mean deploying a second copy of the application.

At the same time, this is a pilot-stage product with one developer-shaped team. Splitting it now
would be premature; building it so a split is possible later is cheap.

## Decision

**One deployment, one database schema, many tenants.** Every table of tenant data carries
`institution_id`; the tenant boundary is a column, not a database, a schema, or a deployment.

Alongside it:

- **Tenants are typed** (`kind`) — university, college, TVET, school, company, government, NGO,
  other — because the capability set is identical and only the language differs.
- **Tenants have a lifecycle** (`status`: trial → active → suspended/closed) and commercial
  attributes (`licence_expires_at`, `seat_limit`), because operating the platform is a job someone
  has to do.
- **Tenants claim email domains** (`institution_domains`, globally unique, many per tenant) because
  real organisations have several.
- **Platform operators are a separate grant** (`users.platform_role`), not a super-role inside a
  tenant, with their own console (`/platform`), their own guard (`requirePlatformAdmin()`), and
  their own audit log (`platform_audit_logs`).
- **Operators see counts, never people.** The platform API returns how many, not who.
- **`data_region` is per tenant**, because data-residency obligations are per country (Ethiopia's
  Proclamation 1321/2024, Art. 22 is the first one, not the last).

## Alternatives considered

| Option | Why not |
| --- | --- |
| One database per tenant | Correct isolation by construction, but at pilot scale it means N backup jobs, N migration runs, N connection pools and one operations engineer having a bad year. Revisit at tens of large tenants |
| One schema per tenant, one database | Cheaper than the above and still strong isolation, but every migration becomes a loop over tenants with per-tenant failure modes, and `search_path` mistakes are silent and catastrophic |
| Row-level security (RLS) now | Strictly better *if* we had it: isolation would be a property of the database rather than of every query being right. It needs a per-request non-superuser role and session variable plumbing that the current connection-pool setup does not have. Deferred, not rejected — see Consequences |
| Separate deployments per organisation | Honest isolation and honest operations cost. It is the answer for a country that demands its data never leave, which is exactly why `data_region` exists as a per-tenant field rather than a platform setting |

## Consequences

**Good**

- Adding the second and third tenant was a migration plus a console, not a rewrite. The demo
  database now holds a university, a second university on a trial, a company, and the operating
  company's own tenant.
- Cost per tenant is near zero until it has real data in it.
- Cross-tenant reporting (how many devices has the platform reunited with owners, in total) is one
  aggregate query, which is exactly the number a national ministry would ask for.
- Growth outside higher education is a vocabulary change.

**Bad**

- Isolation rests on application code. One forgotten `WHERE institution_id = $1` is a cross-tenant
  data leak. Mitigations: repository functions take the tenant id as a required argument, routes
  never read a tenant id from the request, and the flow test asserts cross-tenant lookups return
  404.
- A single bug or outage affects every tenant at once. That is the trade for low operating cost, and
  it is why the incident runbook treats a platform-level failure as a severity-one event.
- One noisy tenant can degrade others (a 40,000-device manifest download is 3 MB and ~130 ms p95 —
  measured, but it is shared capacity).
- Deleting a tenant properly (as opposed to closing it) is a multi-table delete that must be written
  deliberately.

**Follow-ups, in priority order**

1. PostgreSQL row-level security keyed on a per-request tenant setting, so a missing filter fails
   closed instead of leaking.
2. Per-tenant rate limiting and a fair-share queue for manifest downloads.
3. A tenant export/delete job, for when an organisation leaves and actually wants its data out or
   gone.
4. Per-tenant branding (logo, colour) — superficial, but it is what makes an organisation feel the
   platform is theirs rather than rented.
