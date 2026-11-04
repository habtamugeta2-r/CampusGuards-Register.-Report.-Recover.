# Product requirements

**Status:** implemented as a pilot-grade prototype. This document states what the product does, what
it refuses to do, and which requirements the current build meets.

---

## 1. Problem

People carry devices worth tens of thousands of birr through shared spaces — university libraries,
college labs, company offices, government buildings. When something goes missing, the failure is
rarely technical: nobody holds a record connecting the owner, the device, the incident report, and
the person who eventually finds it.

CampusGuard addresses one specific gap:

> The absence of a structured, accessible system for registering belongings, reporting property
> incidents, matching found items with their owners, and giving whoever staffs a checkpoint better
> information when they need to verify a device.

It is most useful *after* something goes wrong.

### 1.1 Scope: many organisations, not one university

The registry was prototyped for one Ethiopian university because that is where the evidence and the
relationships are. It is built as a **multi-tenant platform**, not a single-tenant app, because the
gap is not specific to higher education or to one country:

| Organisation | The same four capabilities, applied |
| --- | --- |
| University / college / TVET | Students register laptops and instruments; gates verify them |
| Company | Employees register issued laptops; reception verifies equipment leaving the building |
| Government office | Departments register shared equipment; registry staff verify what moves between sites |
| NGO / institute | Field staff register kit; country offices verify what returns from the field |

Each organisation is a tenant with its own email domains, retention windows, administrators, seat
limit, licence and data region. A platform operator provisions them and cannot read their data —
see [`docs/02-architecture/multi-tenancy.md`](../02-architecture/multi-tenancy.md).

## 2. Personas

| Persona | Context | Job to be done |
| --- | --- | --- |
| **Abel**, 3rd-year student | Owns a laptop and a phone; works in the library | "If my laptop is taken, I want one place to report it — and a real chance of getting it back." |
| **Hana**, 2nd-year student | Finds a laptop on a study desk | "I want to hand it in without hunting for the owner and without getting pulled into a dispute." |
| **Tigist**, security officer | Stations a checkpoint for a 6-hour shift | "When I stop someone, I want to know what I am looking at — and I want to be protected from getting it wrong." |
| **Getachew**, administrator | Accounts for property incidents across campus | "I want to know how often this happens, how often we recover things, and that we handled it properly." |
| **Selam**, platform operator | Runs the platform for several organisations | "I need to provision a tenant, set its licence, and never be able to read who owns what inside it." |

## 3. Functional requirements

### 3.1 Registration (student)

| ID | Requirement | Status |
| --- | --- | --- |
| R1 | Sign up with a university email; other domains rejected | ✅ |
| R2 | Register a device: type, brand, model, optional serial, colour, distinguishing marks | ✅ |
| R3 | Receive an opaque QR token and a printable label | ✅ |
| R4 | Replace a damaged or removed label; the old code stops resolving immediately | ✅ |
| R5 | Remove a device from the registry (soft delete, audit trail preserved) | ✅ |
| R6 | Record consent per version, unbundled | ✅ |

### 3.2 Reporting

| ID | Requirement | Status |
| --- | --- | --- |
| R7 | File a missing report with category, location, time and narrative | ✅ |
| R8 | Filing a report flags the device and notifies security and the lost-property desk | ✅ |
| R9 | Anyone — including an anonymous finder — can file a found report | ✅ |
| R10 | A found report for a labelled device auto-matches the open missing report | ✅ |
| R11 | The desk records the return, which closes the missing report as recovered | ✅ |
| R12 | Record the channel the incident came through, to measure displacement | ✅ |

### 3.3 Checkpoint verification

| ID | Requirement | Status |
| --- | --- | --- |
| R13 | Scan by camera, by uploading a photo of the label, or by typing the code | ✅ |
| R14 | Show result, device, owner name and the action to take — never email, phone or serial | ✅ |
| R15 | Record duration, checkpoint, source (live / offline / manual) and, only when an ID was checked, the carrier | ✅ |
| R16 | Escalate a missing-report hit to a named supervisor workflow, in words, on screen | ✅ |
| R17 | Borrowing authorisation so a loaned device does not become a false alert | ✅ |
| R18 | Work offline from an encrypted device cache, and upload the queue on reconnect | ✅ |

### 3.4 Administration and governance

| ID | Requirement | Status |
| --- | --- | --- |
| R19 | Dashboard with the pilot scoreboard against a recorded baseline | ✅ |
| R20 | Manage reports, found items, registry, people, checkpoints | ✅ |
| R21 | Append-only audit log covering every sensitive action | ✅ |
| R22 | Individual scan history gated behind a written, audited justification | ✅ |
| R23 | Configurable retention windows, enforced by a nightly job | ✅ |
| R24 | CSV export for the evaluation pack, without student identifiers | ✅ |
| R25 | Data-subject export and ACCESS/CORRECTION/DELETION/OBJECTION requests | ✅ |

## 4. Non-goals

Stated in the product, not just in this document — see `/legal/terms` and `/security/guidance`.

- **Theft prevention.** Nothing here stops someone taking an unattended laptop.
- **Location tracking.** No GPS, no agent, no MDM. Manufacturer tools do this better.
- **Legal proof of ownership.** Registration is evidence, not a verdict.
- **Real-time gate control.** No turnstiles, no automatic locks, no RFID in v1.
- **Replacement of physical security.** Guards, gates, cameras and policy remain primary.
- **Disciplinary or academic monitoring.** Explicitly out of scope and prohibited by design.
- **Movement analytics.** Off by default; an individual's pattern-of-life is never computed.

## 5. Verification outcomes and what the officer is told

| Result | Meaning | Officer instruction |
| --- | --- | --- |
| Registered — owner confirmed | Carrier is the registered owner | Allow through |
| Registered — authorised borrower | Owner authorised this carrier for the period | Confirm ID, allow through |
| Reported missing | An open report exists | **Do not accuse, detain or confiscate.** Record the encounter, refer to a supervisor |
| Not in the registry | No matching code | Absence of registration is not evidence of wrongdoing — note it, allow through |
| Carrier is not the owner | Registered to someone else, no authorisation | Ask for clarification; escalate only per procedure |

This logic lives in one pure function (`src/lib/verify.ts`) and is covered by unit tests.

## 6. Acceptance criteria for the pilot build

1. A student can register, label, report, lend and recover a device without assistance.
2. A member of the public can hand in a device without an account and without learning who owns it.
3. An officer can verify a device in under 15 seconds with the camera, a photo, or a typed code.
4. An officer can keep scanning with no connectivity and lose nothing.
5. An administrator can produce the full pilot metric set and the audit trail that backs it.
6. No endpoint returns personal data that its caller does not need.

All six are exercised by `npm run flow-test` (25 checks) and `npm run smoke` (34 checks).

## 7. Open product questions

- Should registration be pushed to enrolment time? (Best lever for A1, but requires a university
  decision and changes the自愿 framing.)
- Should officers see the device photo, if the student uploaded one? (Helps verification, raises the
  sensitivity of the scan record.)
- Does the found-item workflow need a statutory holding period before disposal? (University policy
  question, not a software one, but the schema has `custody_location` and `DISPOSED` ready.)
