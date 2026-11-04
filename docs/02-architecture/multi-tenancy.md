# Multi-tenancy

CampusGuard is one deployment holding many organisations. This document states the boundary, what
enforces it, what a platform operator can and cannot do, and what would have to change to grow it
further.

Related: [ADR-0007](adr/0007-multi-tenant-platform.md) records *why* it is built this way;
[ADR-0008](adr/0008-country-operators-see-aggregates.md) records why a country-level operator sees
aggregates and nothing else.

---

## 1. The tenant

A tenant is a row in `institutions`. It is deliberately called an institution and not a university,
and since migration `0003_multi_tenancy.sql` it carries:

| Column | What it decides |
| --- | --- |
| `kind` | UNIVERSITY, COLLEGE, TVET, SCHOOL, COMPANY, GOVERNMENT, NGO, OTHER — the same capabilities, different language in the UI |
| `status` | TRIAL → ACTIVE → SUSPENDED / CLOSED. A lifecycle, so an organisation can be turned off without deleting a row |
| `licence_expires_at` | End of the agreed term; blocks new registrations when past |
| `seat_limit` | How many people may hold accounts; enforced at registration only |
| `data_region` | Where this tenant's data must physically live |
| `logo_url`, `brand_primary` | How the tenant appears on its own labels, emails and public pages |
| `country`, `city`, `timezone` | Location and local time |
| retention windows, justification rules | Governance, set per tenant (see `security.md`) |

**Every table of tenant data carries `institution_id`.** There is no tenant-optional table. That is
the whole isolation model, and it is why adding a second tenant was a schema-and-UI change rather
than a rewrite.

---

## 2. Identity: which tenant are you in?

1. A person registers or signs in with an email address.
2. The domain is looked up **only** in `institution_domains` (globally unique, several per tenant).
3. The account belongs to that tenant. There is no cross-tenant login and no global user table: the
   same human with two addresses at two organisations is two people, who cannot see each other.

Consequences worth stating plainly:

- A suspended or closed tenant cannot register **or sign in**. Data is untouched; the door is shut.
- A tenant over its seat limit can still sign in. Losing access to devices you already registered
  because of a billing conversation is worse than the billing conversation.
- An expired licence blocks new registrations, not existing ones, for the same reason.

---

## 3. Platform operators are a separate axis

`users.platform_role` is `NONE` for everybody except operators, who are `PLATFORM_ADMIN`. It is a
separate axis from the institution role on purpose:

| | Institution ADMIN | Platform operator |
| --- | --- | --- |
| Manages their own organisation's registry, reports, people | ✅ | — |
| Changes their own retention windows and justification rules | ✅ | ✅ |
| Changes their own name, city, country, timezone | ✅ | ✅ |
| Adds an email domain, changes type/status/licence/seats | ❌ | ✅ |
| Provisions or closes another organisation | ❌ | ✅ |
| Reads people, devices, scans or reports inside a tenant | ✅ (own tenant) | ❌ |

The operator's console is `/platform`, guarded by `requirePlatformAdmin()`, structurally outside the
tenant app shell. It shows counts — organisations, people, devices, scans — and never a name, email,
student ID or serial. The flow test asserts this by checking the overview payload contains no
`@aastu.edu.et` string.

Operators are also ordinary users of the operating company's own tenant, so they get the same
sessions, lockout, password policy and audit behaviour as everyone else, and `institution_id` stays
`NOT NULL` on every user. Cross-tenant power is an explicit, audited escalation — never a side
effect of a missing tenant.

**Their actions are logged outside every tenant**, in `platform_audit_logs`. A tenant's own audit log
belongs to that tenant and is visible to its administrators; the operator's log must be reviewable
by someone who is not them.

---

## 3a. Country-level operators

A ministry, a regulator or a university federation has a legitimate question — *is this working,
across the country?* — that no single tenant can answer and that no platform operator should answer
by reading tenants. So there is a third grant: `COUNTRY_ADMIN`, scoped to one country
(`users.platform_scope_country`).

| | Institution ADMIN | Platform operator | Country operator |
| --- | --- | --- | --- |
| Own tenant's registry, reports, people | ✅ | — | — |
| Every tenant in their country — **counts only** | ❌ | ✅ | ✅ |
| Organisation names in their country | ❌ | ✅ | ✅ |
| Provision, licence, suspend, close | ❌ | ✅ | ❌ |
| Deployment-wide overview and platform audit | ❌ | ✅ | ❌ |

`/platform/country` shows: organisations, people, devices, checkpoint scans, open reports, recovered
reports and a recovery rate for the country; one row per organisation (name, type, status, city,
counts); and a 30-day scan trend. It does not show a person, a device, a serial or a scan event, and
there is no link from it into a tenant. The flow test asserts the payload contains organisation
names and no `@aastu.edu.et`, no student ID and no person's name.

Two deliberate details:

- **A country operator cannot widen their own scope.** `?country=Kenya` is ignored, not rejected — a
  rejected request would confirm something about Kenya, and there is nothing to confirm.
- **The country is free text on both the tenant and the grant.** A spelling difference produces an
  empty scoreboard rather than an error, so the page says how many organisations the scope actually
  matched.

## 3b. Branding belongs to the tenant

An organisation prints labels, sends email and puts a public status page in front of its own people.
Those surfaces carry the organisation's name, logo and colour:

| Surface | What it shows |
| --- | --- |
| Printed QR label | Organisation name and logo above the code |
| Public status page (`/s/<token>`) | Organisation name, logo and colour; "hand it in to *this* organisation" |
| Email | Organisation name above the message and in the sign-off (plain text — this product sends no HTML email) |
| Signed-in app | Logo in the navigation; the tenant's colour re-points the whole palette |

The setting is **one hex** (`institutions.brand_primary`). Every other shade is derived in
[`src/lib/brand.ts`](../../src/lib/brand.ts) and applied as CSS custom properties, so a tenant that
sets nothing renders exactly as it did before and nobody has to design an eleven-step palette.
`onBrandText()` picks black or white text by luminance, because a university is allowed to choose a
pale yellow and its buttons still have to be readable.

Branding is editable **by the organisation itself** (`/api/admin/organisation` accepts `logoUrl` and
`brandPrimary`), because it is the organisation's own face and grants access to nothing. Domains,
status, licence and seats remain operator-only.

## 4. Onboarding

```
organisation applies at /join  →  application awaits review (institution_requests)
                                        │
                    platform operator approves
                                        │
        create tenant + claim domains + provision first administrator
        (one-time password, shown once and emailed)
                                        │
        people on those domains register themselves at /register
```

Applications are validated (domain shape, uniqueness against existing tenants), rate-limited, and
deduplicated by organisation name while open. Nothing is provisioned automatically: a tenant is a
data-protection commitment, not a sign-up.

---

## 5. What isolation depends on

| Risk | Control |
| --- | --- |
| Reading another tenant's rows | Every repository function takes `institutionId` from the session and filters on it. No route accepts a tenant id from the request body |
| Finding a person in another tenant | `resolveStudent` filters by institution; the flow test asserts a cross-tenant lookup returns 404, not 403, so it does not even confirm existence |
| An operator reading tenant data | The platform API returns counts only; no endpoint returns a person or device |
| A tenant widening its own reach | Domains, type, status, licence and seats are operator-only (`/api/admin/organisation` accepts name, city, country, timezone and nothing else) |
| A domain claimed twice | `institution_domains.domain` is globally unique, enforced in the database |
| Mixing data across borders | `data_region` is per tenant; a national or regional rollout means one deployment per region, not one deployment with a flag |
| A country operator reading people | The country API returns aggregates and organisation names only; the guard (`requireCountryRead`) admits no other platform role, and the scope is pinned |
| Owner identity leaking onto a public page | `findPublicProductByToken` does not select the owner's name, email or student ID at all — a query that cannot return them cannot leak them, even into dev tooling |

**Known weakness, stated honestly:** isolation is enforced in application code, not by the database.
PostgreSQL row-level security would make it a property of the schema rather than a property of every
query being correct. That is the next hardening step if a tenant ever holds data for an organisation
that would ask for it in an audit — see [ADR-0007](adr/0007-multi-tenant-platform.md#consequences).

---

## 6. Growing further

| Step | What it costs |
| --- | --- |
| Second university, same country | Nothing: provision a tenant (this is already demoed — AASTU and BDU) |
| A company or government office | Nothing: `kind` changes the language, not the code |
| Another country | One deployment per data region; `data_region` per tenant records the obligation. Nothing in the app assumes Ethiopia except the default country and the legal copy |
| A ministry asking "is it working?" | The country operator grant — `/platform/country` — without giving anyone a key to a tenant |
| Per-tenant databases | A data migration, not a rewrite: every query already carries `institution_id`, so rows can be split by it |
| Thousands of tenants | The manifest endpoint is the thing that grows. It is measured at 20k devices in `npm run load-test` and is institution-scoped, so per-tenant cost stays flat |

---

## 7. What this design deliberately does not do

- **No self-serve provisioning.** An operator reviews every application.
- **No cross-tenant search.** There is no "find a device anywhere" — that would make the operator
  the most dangerous actor in the system.
- **No tenant-to-tenant transfers.** A device leaving an organisation is retired there and
  registered afresh; ownership history does not follow it across tenants.
- **No shared identity.** No global user, no single sign-on across tenants (yet), no "one account
  for all your campuses" — that is a federated-identity project, not a settings flag.
