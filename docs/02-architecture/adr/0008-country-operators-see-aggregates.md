# ADR-0008 · Country-level operators see aggregates, never people

**Date:** 2026-11-04
**Status:** Accepted
**Decides:** what a ministry or a federation is allowed to see across tenants
**Builds on:** [ADR-0007](0007-multi-tenant-platform.md)

---

## Context

Once the platform holds more than one organisation, the next question is asked by somebody other
than the operator: a ministry of education, a regulator, or a university federation wants to know
whether the platform is working across a country. How many organisations joined. How many devices
are registered. Are checkpoints actually being used. What share of reported losses end in a
recovery.

There are three ways to answer that, and two of them are wrong:

1. **Give the ministry an account in every tenant.** It works right up until someone asks who has
   access to what, and the answer is "a government official, in every university". It also gives
   them far more than they asked for: they wanted a number, and they got a registry.
2. **Let the platform operator answer on their behalf.** The operator cannot read tenant data
   either (ADR-0007), so this means building the one capability the whole design exists to prevent:
   a cross-tenant read.
3. **Give them a third grant that can only aggregate.** The ministry gets the number it is
   accountable for, and nobody gets a key to a registry.

## Decision

`users.platform_role` gains **`COUNTRY_ADMIN`**, scoped by `users.platform_scope_country` — one
country per person, enforced by a check constraint so a half-configured grant cannot exist.

A country operator may:

- read `/platform/country` for their own country;
- see totals (organisations, people, devices, scans, open and recovered reports, recovery rate);
- see one row per organisation — **name, type, status, city and counts**;
- see a 30-day scan trend.

A country operator may **not**:

- provision, licence, suspend or close an organisation;
- read the deployment overview or the platform audit log;
- open a tenant, list its people, or resolve a device to an owner.

Their navigation is one link long, on purpose.

**Organisation names are included deliberately.** A national view that could not compare
institutions would be useless to a ministry, and an organisation's name is not a person's data. The
line is drawn at people: no name, no email, no student ID, no device, no serial, no scan event. The
flow test asserts the payload contains organisation names and contains no `@aastu.edu.et`, no
`UGR/` student ID and no person's name.

**A requested country is ignored, not rejected.** `?country=Kenya` returns Ethiopia. Rejecting it
would let a country operator probe for the existence of other scopes by watching which requests
fail; there is nothing about Kenya they are entitled to learn.

**Everything they do is logged** to `platform_audit_logs`, alongside the operator's actions, in a
log no tenant can edit.

## Alternatives considered

| Option | Why not |
| --- | --- |
| A tenant per ministry, with reporting pushed into it | Turns every new measure into a data pipeline, and copies tenant data somewhere a tenant's administrator cannot reach or correct |
| Let the platform operator run the report and send a PDF | Slow, unauditable, and it means the operator's own console has to be able to read tenants — the one capability the design refuses |
| Country-scoped *rows* in a grants table | More general, and the right shape if a person ever needs two countries. Not needed for one-country-per-person, and generality here is a liability: every future query has to reason about a set rather than a value. The guard is one function (`requireCountryRead`), so splitting later is contained |
| Anonymised per-person exports for research | Legitimate, and a different thing with a different ethics review. The question here is "is the platform working", which aggregates answer |

## Consequences

**Good**

- The question a ministry actually asks is answerable without giving anyone access to a registry.
- The recovery-rate number — the one the whole product is for — becomes visible at national scale.
- Country scope is a column and a check constraint, not a policy engine.

**Bad**

- Country is **free text** on both the tenant (`institutions.country`) and the grant. A spelling
  difference yields an empty scoreboard, not an error. The page tells the operator how many
  organisations their scope matched, which is the diagnostic, but a controlled country list would be
  better.
- One more grant to reason about in every guard. It is why `requirePlatformAdmin()` and
  `requireCountryRead()` are separate functions rather than one role check with an argument.
- Per-organisation rows mean a country operator learns *which* organisations use the platform and
  roughly how big each deployment is. That is the point of the role, but it is information, and the
  tenancy agreement should say it is shared with the country operator.

**Follow-ups**

1. A controlled country list (ISO 3166) shared by tenants and grants.
2. Rate-limit and cache the country scoreboard: it scans `scan_events` per request.
3. If a person ever needs two countries, split `platform_scope_country` into a grants table; the
   guard is already centralised.
