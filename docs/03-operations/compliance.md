# Compliance pack

Templates and checklists. **Not legal advice** — every document here needs review by a qualified
Ethiopian practitioner before a university signs it.

---

## 1. Roles

| Party | Role under Proclamation 1321/2024 | Obligations |
| --- | --- | --- |
| The university | **Data controller** | Register with the ECA (Arts. 33–38), appoint a DPO (Art. 40 — required for public bodies), define retention, notify breaches (Arts. 43–44), handle data-subject requests |
| CampusGuard team | **Data processor** | Register as a processor, process only on instruction, assist with breach notification "without undue delay" (Art. 43(3)), assist with data-subject requests, delete or return data at the end of the contract |

The privacy notice shipped in the app states this split in plain language (`/legal/privacy`).

## 2. Registration checklist (before processing begins)

- [ ] University registered with the ECA as a controller (certificate valid two years)
- [ ] CampusGuard registered as a processor
- [ ] DPO appointed by the university and named in the pilot agreement
- [ ] DPIA completed and signed (see §3)
- [ ] Written data-processing agreement in place (see §4)
- [ ] Retention windows agreed and configured per institution
- [ ] Hosting location confirmed in writing (Ethiopia)
- [ ] Consent text versioned and shown unbundled at registration

## 3. DPIA template (condensed)

**1. Description.** What processing occurs, for what purpose, on whom, with which systems.
*For CampusGuard:* registration of student-owned devices, missing/found reporting, and checkpoint
scan records — for the purpose of property recovery.

**2. Necessity and proportionality.** Is each field needed? Show the minimisation argument:
the public QR page reveals nothing; the officer scan response omits email, phone and serial; carrier
identity is recorded only when an ID is checked.

**3. Risks to data subjects.**

| Risk | Likelihood | Severity | Mitigation |
| --- | --- | --- | --- |
| Scan records used to infer movement patterns | Medium | High | Short retention (90 d default); justification-gated access; aggregate analytics off by default; prohibited-use clause |
| Data breach exposing a device registry | Medium | High | Encryption in transit; minimised payloads; encrypted offline cache; lockout; audit trail |
| False alerts leading to unfair treatment of a student | Medium | High | Rules state that a result is not a verdict; officer guidance; false-alert metric; human escalation |
| Function creep into discipline or academic monitoring | Medium | High | Purpose limitation in the DPA; audit log; published privacy notice |
| Exclusion of students who cannot or will not register | High | Low–Medium | Registration is voluntary; unregistered is explicitly not suspicious |
| Unlawful transfer outside Ethiopia | Low | High | Local hosting; no third-party analytics or SDKs |

**4. Consultation.** Student representatives, the DPO, the security directorate, ICT.

**5. Sign-off.** Controller DPO, security director, and the product owner — with a review date.

## 4. Procurement routes

Ethiopian public universities follow public procurement rules, and campus security budgets are
mostly guard salaries and infrastructure. Do not assume an annual SaaS line exists. Work all four
routes in parallel and let the institution choose.

| Route | Structure | When it fits | Watch out for |
| --- | --- | --- | --- |
| **A. Annual institutional licence** | Recurring fee by institution size | The university has a software budget line | Recurring payments unfamiliar to public procurement |
| **B. Implementation + support** | One-off deployment fee, annual support contract | Matches existing capital-procurement habits | Support renewal must be budgeted every year |
| **C. Subsidised pilot** | Free/reduced pilot in exchange for data (anonymised) and a reference case | Always the first move | Be explicit about what data you get and what you publish |
| **D. Donor / innovation funding** | Ministry programme, development agency, institutional innovation grant | No budget line exists | Reporting obligations and timelines that outlast the pilot |

**Structuring the pilot so it is not itself a procurement:** frame it as a research or innovation
collaboration with a defined end date and no exclusivity, so it can proceed without a full tender —
while the deployment agreement, if any, follows the applicable procurement procedure. Get local legal
guidance on where that line sits.

## 5. Pilot agreement — clauses that must be present

1. **Parties and roles** — controller, processor, named DPO with contact details.
2. **Purpose limitation** — permitted purposes enumerated; everything else prohibited in writing.
3. **Prohibited uses**, specifically: no movement or pattern-of-life analysis of individuals; no use
   in disciplinary or academic proceedings; no law-enforcement disclosure without a documented legal
   basis and, where possible, notice to the student; no secondary commercial use of the data.
4. **Retention** — the agreed windows, and who enforces them technically.
5. **Access rules** — who may view what, and the justification requirement for individual history.
6. **Data-subject requests** — who responds, within what time.
7. **Breach notification** — processor informs the controller without undue delay; controller notifies
   the ECA and data subjects within 72 hours.
8. **Security measures** — the controls listed in `../02-architecture/security.md`, with a right to
   audit or to an independent report.
9. **Research and publication** — what may be published, anonymised, and with whose permission.
   Reserve the right to publish *negative* findings.
10. **Exit** — data return or deletion, certificate of deletion, and what happens to the audit log.
11. **Voluntariness** — student participation is voluntary and withdrawable, stated explicitly.
12. **End date and review** — the pilot stops unless renewed, and the renewal decision is written.

## 6. Consent

Registration shows four unbundled checkboxes (terms, privacy notice, voluntary participation,
checkpoint visibility) and each acceptance is stored with the consent version, timestamp, IP and user
agent (`consent_records`). Consent cannot be bundled with other terms under the Proclamation, and the
controller bears the burden of proof — hence the per-version records.

If the *purpose* changes materially, publish a new version and re-consent.

## 7. Records we keep to demonstrate compliance

- `consent_records` — what each user agreed to and when
- `audit_logs` — every sensitive action, who did it, and why
- `retention_runs` — proof that deletion ran, with counts
- `data_subject_requests` — requests, handling and outcomes
- `baseline_metrics` — the pre-pilot comparison, with its source named
