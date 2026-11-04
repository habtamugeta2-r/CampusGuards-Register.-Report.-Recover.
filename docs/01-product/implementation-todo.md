# Implementation to-do

The complete work plan for CampusGuard: **Phase 0 (discovery)** → **Phase 1 (prototype)** →
**Phase 2 (pilot build)** → **Phase 3 (pilot)** → **Phase 4 (deployment)**, then the standing
backlog.

Legend: ✅ done in this repo · 🟡 partially done · ⬜ not started.

---

## Phase 0 — Discovery (3–5 weeks) · ⬜ not started

**This phase gates everything else.** No code should be written for a paying customer until these
questions have real answers.

| # | Task | Output | Owner |
| --- | --- | --- | --- |
| 0.1 | Map stakeholders and book the first five meetings | Stakeholder table with names | Business lead |
| 0.2 | Interview 15–25 students | Verbatim notes, especially on stickers and scanning | Business lead |
| 0.3 | Interview 2–4 security officers at their post | Current workflow, friction, workarounds | Business lead |
| 0.4 | Survey 200–400 students | Tabulated results, crosstabs by prior incident | Business lead |
| 0.5 | Collect the pre-pilot baseline from logbooks | `baseline_metrics` row + source note | Business lead + security |
| 0.6 | Count checkpoint throughput at peak hour | Queue arithmetic, officers needed | Business lead |
| 0.7 | Map the competitive alternatives actually in use locally | Which Telegram groups, which tools | Business lead |
| 0.8 | Identify the decision-maker and the budget route | Named person, documented route | Business lead |
| 0.9 | Legal/compliance scoping with the university DPO | DPIA requirement, DPA draft | Legal + business lead |
| 0.10 | Write the one-page decision memo against A1–A6 | Go / redesign / stop | Whole team |

**Exit gate:** six assumptions answered in writing. If A1 or A2 fails, stop here.

---

## Phase 1 — Prototype (2–3 weeks) · ✅ complete

| # | Task | Status |
| --- | --- | --- |
| 1.1 | Working registration + QR label + printable label sheet | ✅ |
| 1.2 | Missing-report flow with notifications to security | ✅ |
| 1.3 | Found-report flow with auto-matching | ✅ |
| 1.4 | Officer scanning (camera + manual fallback) with the five outcomes | ✅ |
| 1.5 | Public QR status page revealing no personal data | ✅ |
| 1.6 | Borrowing authorisation | ✅ |
| 1.7 | Test with 5–10 students and revise | ⬜ **needs doing with real students** |
| 1.8 | Demonstrate to university stakeholders | ⬜ blocked on 0.1 |

---

## Phase 2 — Pilot build (6–8 weeks) · ✅ complete unless noted

### Foundation
| # | Task | Status |
| --- | --- | --- |
| 2.1 | PostgreSQL schema with tenancy, ownership history, separate missing/found workflows | ✅ `db/migrations/0001_init.sql` |
| 2.2 | Migration runner with checksums | ✅ `scripts/migrate.ts` |
| 2.3 | Authentication: server-side sessions, RBAC, lockout, password policy | ✅ |
| 2.4 | Audit logging on every sensitive action | ✅ |
| 2.5 | Rate limiting on auth and public endpoints | ✅ |
| 2.6 | Seed data for demos and tests | ✅ `scripts/seed.ts` |

### Product
| # | Task | Status |
| --- | --- | --- |
| 2.7 | Student portal: dashboard, devices, reports, borrowing, notifications, privacy | ✅ |
| 2.8 | Device detail with QR label, label history, rotation, retirement | ✅ |
| 2.9 | Officer console with checkpoint selection, camera, image, manual entry | ✅ |
| 2.10 | Offline cache (encrypted) + outbox + batch sync | ✅ |
| 2.11 | Officer guidance page stating the rules | ✅ |
| 2.12 | Admin: dashboard, reports, found desk, registry, people, scans, checkpoints, audit, settings | ✅ |
| 2.13 | Justification-gated individual scan history | ✅ |
| 2.14 | Retention job + per-institution windows | ✅ |
| 2.15 | Data-subject export and request workflow | ✅ |
| 2.16 | PWA: manifest, service worker, offline page, icons | ✅ |
| 2.17 | CSV export for the evaluation pack | ✅ |

### Assurance
| # | Task | Status |
| --- | --- | --- |
| 2.18 | Unit tests for the verification rule engine | ✅ 17 tests |
| 2.19 | Page/API smoke test as each role | ✅ 34 checks |
| 2.20 | End-to-end workflow test through the HTTP API | ✅ 25 checks |
| 2.21 | Typecheck in CI | ✅ `npm run typecheck` |
| 2.22 | Security headers and CSP | ✅ (framing relaxed only for the hosted preview) |
| 2.23 | Independent security review | ⬜ **do before any real student data** |
| 2.24 | Load test the manifest endpoint at pilot scale (20k rows) | ⬜ |
| 2.25 | Accessibility audit (WCAG 2.1 AA) | ⬜ |
| 2.26 | Production build (`npm run build`) | ✅ green |

---

## Phase 3 — Pilot (8–12 weeks) · ⬜ not started

| # | Task | Notes |
| --- | --- | --- |
| 3.1 | Signed pilot agreement with prohibited uses spelled out | Template in `docs/03-operations/compliance.md` |
| 3.2 | Officer training (two sessions) + one-page desk card | `docs/03-operations/training.md` |
| 3.3 | Student communications: what is stored, how to withdraw | Honest tone; no security-theatre language |
| 3.4 | Label production and distribution | Tamper-evident stock; a spare label per student |
| 3.5 | Weekly metric snapshot | Automate the CSV export |
| 3.6 | Mid-pilot review at week 4 | Go / adjust / pause |
| 3.7 | Exit survey and interviews | Questions in `docs/00-research/discovery-plan.md` |
| 3.8 | Evaluation pack, including failures | ≤ 10 pages |
| 3.9 | Decision: adopt / extend / stop | Against A1–A6 |

---

## Phase 4 — Deployment · 🟡 partially done

| # | Task | Status |
| --- | --- | --- |
| 4.1 | Deployment documented for an in-Ethiopia host | ✅ `docs/03-operations/deployment.md` |
| 4.2 | Dockerfile + compose for app and PostgreSQL | ✅ `Dockerfile`, `docker-compose.yml` |
| 4.3 | Automated encrypted backups with a restore drill | ⬜ |
| 4.4 | Nightly retention job scheduled (systemd timer / cron) | ✅ job exists; scheduling documented |
| 4.5 | Uptime and error monitoring | ⬜ |
| 4.6 | ECA controller/processor registration | ⬜ legal task |
| 4.7 | DPIA completed and signed | ⬜ |
| 4.8 | Incident response rehearsal (breach within 72 h) | ⬜ |

---

## Standing backlog (not commitments)

Each item needs its own investigation and business case before it is scheduled.

| Item | Why it is tempting | Why it waits |
| --- | --- | --- |
| Institutional asset module (projectors, lab equipment) | Larger, better-funded market | Different workflow; must not dilute the student product |
| NFC / RFID / turnstile integration | Removes the friction of scanning | Hardware cost and gates that arguably make it surveillance-first |
| Cross-institution recovery network | A device lost at one university found at another | Needs data-sharing agreements between controllers |
| Native mobile apps | Better camera performance | A PWA is enough for the pilot and far cheaper |
| Fayda / SSO integration | Stronger identity assurance | Only after the university asks; see the regulatory doc |
| Multi-campus tenancy UI | Data model already supports it | No paying customer needs it yet |
| Duplicate-serial fraud detection | The schema now allows duplicate serials | Needs a matching rule and a human review process |
| Officer-side device photos for verification | Speeds up checks | Raises the sensitivity of every scan record |

---

## Definition of done for any change

1. Behaviour covered by a unit test (logic) or a flow check (API).
2. `npm run typecheck` clean.
3. `npm run smoke` and `npm run flow-test` green against a seeded database.
4. Any new personal data field justified in the data model doc and given a retention rule.
5. Any new staff capability audited, and gated if it touches an individual's records.
6. Any new user-facing claim checked against the non-goals in the PRD.
