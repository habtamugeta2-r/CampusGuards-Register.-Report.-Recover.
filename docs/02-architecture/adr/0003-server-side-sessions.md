# ADR-0003: Server-side sessions, not JWTs

- **Status:** accepted
- **Date:** 2026-01

## Context

Stateless JWTs are the default in many Next.js applications: no database read per request, no
session table, easy horizontal scaling.

The counter-argument here is operational. A security officer signs in on a **shared, supervised
device** at the start of a shift. When that shift ends — or when the handset goes missing — access
must end *now*, not whenever the token expires. A JWT is valid until it expires; revoking one means
building a denylist, at which point you have a session table anyway, just with worse ergonomics.

The same applies to role changes: promoting or demoting a user should take effect on their next
request, not when a token rolls over.

## Decision

- Opaque 32-byte random token in an `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookie.
- Only the SHA-256 hash is stored in `sessions`.
- Sessions carry an expiry: 12 hours for students, 10 for officers.
- Revocation is a column update; `revokeAllSessions()` handles password changes and role changes.
- Requests that need the user resolve the session once per request, memoised with React `cache()` so
  a page and its shell share one lookup.

## Consequences

- One indexed lookup per authenticated request. At pilot scale this is irrelevant; if it ever
  matters, a short-lived cache in front of it is a contained change.
- No `middleware.ts`: authorisation is enforced in route handlers and server components, which keeps
  the rules next to the code they protect and avoids running database code on the edge runtime.
- Sessions are deleted by the retention job once expired, so the table does not grow without bound.
- Horizontal scaling needs sticky sessions *or* nothing at all — the session store is the database,
  which every instance already shares.
