# ADR-0002: Hand-written SQL behind repository modules (no ORM)

- **Status:** accepted
- **Date:** 2026-01
- **Supersedes:** the original proposal's plan to use Prisma

## Context

The original proposal specified Prisma + PostgreSQL. Two things changed:

1. **Supply-chain fragility.** Prisma's CLI downloads engine binaries (`schema-engine`,
   `query-engine`) from `binaries.prisma.sh` at migrate/generate time. In a restricted or air-gapped
   build environment — a realistic condition for a university data centre, and the actual condition
   in which this prototype was built — the toolchain simply does not run.
2. **Reviewability.** The people who will assess this system include a data protection officer and,
   potentially, an auditor. They read SQL. They do not read a generated client.

Queries here are also genuinely relational: the pilot metrics use window functions, `FILTER`,
`percentile_cont` and lateral-ish lookups that are awkward to express in a query builder.

## Decision

Use `pg` (node-postgres) directly, with:

- **One repository module per aggregate** (`src/lib/repos/*.ts`) exposing named functions that take
  and return typed rows.
- **Parameterised SQL only** — no string interpolation of user input, anywhere.
- **Hand-written migrations** in `db/migrations/`, applied in order by `scripts/migrate.ts` with
  SHA-256 checksums so history cannot be silently rewritten.
- **Row types declared in TypeScript** (`src/lib/types.ts`), mirroring the schema.

## Consequences

**Costs**

- No compiler checking of queries: a typo in a column name is a runtime error.
- More code for ordinary CRUD.
- Refactors require touching SQL by hand.

**Mitigations**

- `npm run typecheck` covers everything *around* the SQL.
- `npm run smoke` (34 checks) and `npm run flow-test` (25 checks) exercise every query path against a
  seeded database, so SQL errors surface in CI rather than in production.
- Queries are centralised in repositories, so a column rename has one place to land.

**Benefits**

- Zero native dependencies, zero binary downloads: `npm install` works anywhere npm works.
- Every query is readable by a DBA, an auditor or the university's ICT staff.
- Explicit control over indexes, retention deletes and the exact data returned to each role — which
  is what makes the data-minimisation claims in `security.md` verifiable rather than aspirational.
- No ORM upgrade cycle imposed on a university that will host this for years.

**Revisit if:** the team grows past a few developers, the query surface doubles, or a customer
requires an ORM for internal policy reasons. The repository boundary makes that migration local.
