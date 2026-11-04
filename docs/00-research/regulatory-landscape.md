# Regulatory landscape: Personal Data Protection Proclamation No. 1321/2024

**Why this matters more than usual here.** CampusGuard is, structurally, a surveillance-capable
system: it records which student carried which device through which checkpoint at what time. The
law is not a box to tick before launch — it shapes the data model, the retention job and the access
controls in this repository.

---

## 1. The Proclamation in brief

Adopted 4 April 2024, in force 24 July 2024, with **no grace period for data already held**
[1](https://digitalpolicyalert.org/event/24922-implemented-personal-data-protection-proclamation-proclamation-no-13212024-including-data-localisation-requirements)
[2](https://www.kiyalaw.com/insights/data-protection-proclamation-1321-2024-legal-update/).

| Requirement | Article | What it means for CampusGuard |
| --- | --- | --- |
| Regulator is the Ethiopian Communications Authority (ECA) | 2(36), 5 | The ECA registers controllers/processors, investigates complaints, audits |
| Controllers **and processors must register before processing** | 33–38 | The **university** registers as controller; CampusGuard as processor. Registration certificate lasts two years and can be cancelled after a 21-day show-cause |
| Data protection officer (DPO) | 40 | Required for public bodies — i.e. **every public university is a data controller that must appoint a DPO**. CampusGuard must be able to name theirs |
| Data localisation | 22 | Locally collected personal data must be stored on a server or data centre **in Ethiopia**; the Authority may designate "critical" data processed only locally; sensitive-data export needs prior approval |
| Cross-border transfer | 18–21 | Only to jurisdictions with adequate protection, unless consented, necessary for listed purposes, or from a public register; the Authority may prohibit or condition transfers |
| Breach notification | 43–44 | Notify the Authority **within 72 hours** and inform affected individuals within 72 hours (unless encryption renders the data unintelligible). A processor must inform the controller without undue delay |
| Lawful basis, consent | — | Consent must be free, informed, specific and active; cannot be bundled with other terms; the controller bears the burden of proof |
| Purpose limitation, minimisation, accuracy, security | — | Collect the minimum; process only for the stated purpose; ensure appropriate security |
| Data-subject rights | — | Access, correction, deletion, objection; enforceable against the controller |

The scope covers automated processing and non-automated processing forming part of a filing system,
and binds federal and regional **public bodies** as well as private ones
[3](https://www.aaclo.com/insight/brief-overview-of-the-new-personal-data-protection-proclamation)
[4](https://www.lolinemag.com/articles/ethiopia-data-protection-law-explained).

## 2. How the implementation maps to each obligation

| Obligation | Implemented as |
| --- | --- |
| Data localisation (Art. 22) | No cloud-specific code. `docs/03-operations/deployment.md` specifies a single VM or managed PostgreSQL **inside Ethiopia**. `.env.example` documents the constraint at the point of configuration |
| Purpose limitation | `scan_events` is used only for verification and incident follow-up. `institutions.allow_aggregate_analytics` (default **false**) is the switch that would have to be deliberately turned on |
| Data minimisation | The officer scan response contains device description, owner name and student ID — never email, phone or serial. The public status page contains no identity at all |
| Storage limitation | Nightly retention job (`src/lib/retention.ts`) deletes scan events after N days, anonymises report narrative fields, deletes expired sessions and old audit rows |
| Access control | Role-based (`STUDENT` / `SECURITY` / `ADMIN`), enforced in every route handler. Individual scan history requires a written justification that is stored permanently |
| Accountability | Append-only `audit_logs` covering every sensitive action, including *viewing* the audit log |
| Breach response | `docs/03-operations/runbook.md` contains a 72-hour procedure with named roles |
| Data-subject rights | In-app JSON export, and ACCESS / CORRECTION / DELETION / OBJECTION requests routed to the university (`/api/me/requests`) |
| Consent | Per-version consent records at registration (`consent_records`), unbundled checkboxes, retention evidence |
| Processor/controller split | The privacy notice names the university as controller; the pilot agreement template in `docs/03-operations/compliance.md` covers the DPA |

## 3. Known gaps — do not launch a pilot without closing these

1. **Legal review by a qualified Ethiopian practitioner.** This repository contains engineering
   work informed by secondary sources, not legal advice.
2. **Controller registration.** The university must be registered with the ECA before processing
   begins, and CampusGuard (as processor) must be registered too.
3. **DPO named.** Public bodies must appoint one. Get the name in the pilot agreement.
4. **DPIA.** A data protection impact assessment is required for large-scale monitoring of a
   publicly accessible area, which a checkpoint deployment plausibly is. A template is in
   `docs/03-operations/compliance.md`.
5. **Hosting evidence.** "Stored in Ethiopia" must be demonstrable — see the deployment doc.

## 4. Note on the state as data collector

Reporting on Fayda notes a structural concern: the state is simultaneously the largest personal-data
collector, the dominant telecoms operator and the enforcer of the data protection law, and the
regulator answers to the executive
[4](https://www.lolinemag.com/articles/ethiopia-data-protection-law-explained). This is not a reason
to abandon the project, but it is a reason to make the governance agreements *specific* and *written*
rather than relying on the regulator to restrain a university. Concretely: the pilot agreement must
state, in writing, which uses of scan data are prohibited.
