# ADR-0004: The verification rule engine is a pure function

- **Status:** accepted
- **Date:** 2026-01

## Context

The most consequential thing CampusGuard does is decide what a security officer sees when they scan
a student's device, and what the screen tells them to do about it. Get this wrong and the system
either waves through a stolen laptop or gets an innocent student detained.

The tempting implementation is to scatter this logic across the API handler, the offline cache
lookup and the batch-sync endpoint — three places, three opportunities to disagree.

## Decision

`src/lib/verify.ts` exports:

```ts
resolveVerification(subject: VerificationSubject): VerificationOutcome
```

with **no database access, no request context, no I/O**. It takes the facts (is there a product? is
it retired? is there an open report? is the carrier identified? are they the owner? are they
authorised?) and returns the result, tone, headline, detail and the officer instruction.

The database-backed path (`services/scan.ts`) gathers the facts, calls the pure function, then
records, audits and notifies. The offline path builds the same facts from its cache and calls the
**same** function.

## Rules, in precedence order

1. No product, or retired → **NOT_REGISTERED** (explicitly not suspicious).
2. Open missing report → **ACTIVE_MISSING_REPORT** (danger; "do not accuse, detain or confiscate").
3. Verified carrier is the owner → **REGISTERED_OK**.
4. Active borrowing authorisation → **AUTHORIZED_BORROWER**.
5. Carrier identified and neither owner nor authorised → **MISMATCH** (a conversation, not an
   accusation).
6. Otherwise → **REGISTERED_OK**, with the caveat that no ID was checked.

## Consequences

- The rules are unit-testable in isolation: 17 tests cover every branch
  (`src/lib/__tests__/verify.test.ts`), including the requirement that **every** outcome carries an
  instruction — no result is ever a verdict.
- Changing a rule is a single, reviewable diff that a university administrator can read and argue
  with before signing anything.
- Live, manual and offline paths cannot drift, because they share one implementation.
- The rule engine can be lifted out and shown to a student representative body as evidence of what
  the system will and will not do.
