# ADR index

| ADR | Decision |
| --- | --- |
| [0001](0001-record-of-decisions.md) | Record architecture decisions, briefly and reversibly |
| [0002](0002-sql-access-layer.md) | Hand-written SQL behind repository modules; no ORM |
| [0003](0003-server-side-sessions.md) | Server-side sessions instead of JWTs |
| [0004](0004-pure-verification-engine.md) | The verification rule engine is a pure function |
| [0005](0005-opaque-qr-tokens.md) | QR codes carry an opaque token, never identity |
| [0006](0006-encrypted-offline-cache.md) | The officer's offline cache is encrypted with a non-extractable key |
| [0007](0007-multi-tenant-platform.md) | One multi-tenant platform; tenants are a column, not a database |

## ADR-0001: Record architecture decisions

- **Status:** accepted
- **Date:** 2026-01

**Decision.** Decisions that shape the data model, the security posture or the operational cost are
recorded as short ADRs in this folder. Each states the context, the decision, and the consequences —
including what we give up.

**Why.** This product will be read by university administrators, a data protection officer and
possibly a procurement committee. "Because the library did it that way" is not an answer a
university can accept for a system that records student movements. ADRs are also cheap insurance
against the team forgetting *why* an awkward-looking constraint exists.

**Consequences.** A small documentation tax on every significant change. Worth it.
