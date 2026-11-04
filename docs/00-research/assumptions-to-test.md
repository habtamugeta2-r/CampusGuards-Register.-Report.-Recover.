# The six assumptions that decide whether this product exists

Each assumption below is written as a **falsifiable statement** with the test that would kill it and
where the evidence will be recorded. These are the "kill criteria". They are ordered by how quickly
they can be tested.

---

## A1. Adoption — students will register their devices

**Assumption:** at least 40% of invited students register at least one device within the pilot
period, and the coverage of *all* devices on campus exceeds the point at which security officers
trust the registry.

**Why it is the hardest one.** The registry's value is proportional to its coverage. A registry
holding 5% of campus devices is nearly useless; one holding 80% is genuinely useful. There is a
tipping point below which neither students nor officers believe in it, and nobody knows where it
sits until measured.

**How to test it:** the pilot's registration rate, measured as (students with ≥1 device) ÷ (active
invited students), plus devices per registered student. Already computed in `/admin` →
**Registration rate**.

**What would kill it:** below ~20% registration among invited students, with no credible lever
(enrolment-time registration, departmental mandate, an incentive) available.

**Second-order risk:** even enthusiastic students under-register — the phone gets registered, the
laptop does not. Track *devices per registered student*, not just the headcount.

---

## A2. Frequency — the problem happens often enough to matter

**Assumption:** property loss and theft are frequent enough that a dedicated platform is justified
rather than a better Telegram group.

**How to test it:** the student survey (incidents per student per year) against the security
directorate's logbook counts.

**What would kill it:** fewer than roughly 5 reported incidents per 1,000 students per semester, or
a student body that genuinely does not experience this as a problem.

**Watch out for:** availability bias. Students who have lost something care intensely; the median
student may never have. Both are real findings.

---

## A3. Superiority — the platform beats what students already do

**Assumption:** CampusGuard produces a materially better recovery rate than Telegram groups plus the
security desk.

**How to test it:** compare the platform's recovery rate against the **recorded pre-pilot baseline**
— not against a number invented afterwards. `missing_reports.channel` records how each incident
reached the university, so we can also see whether the platform is displacing existing channels or
merely adding to them.

**What would kill it:** recovery rate within a few points of baseline, or evidence that nearly every
successful recovery would have happened anyway through a group chat.

**Method warning:** correlation is not causation. If incidents drop during the pilot, that may be
seasonality, extra staffing, or the Hawthorne effect from increased awareness. The pilot plan
addresses this with a comparison location and a pre-registered evaluation method —
see [`../01-product/pilot-plan.md`](../01-product/pilot-plan.md#6-evaluation-method).

---

## A4. Operability — a scan fits in the flow of a real checkpoint

**Assumption:** an officer can complete a scan in 15 seconds or less, and universal or
high-frequency scanning does not create an unacceptable queue.

**How to test it:** `scan_events.duration_ms` (median and 90th percentile) and direct observation of
queue length during the busiest hour.

**What would kill it:** a median above 20 seconds, or queues that persist after two weeks of
practice. In that case: **scanning must remain a spot check**, and the product's value proposition
shrinks to the lost-and-found workflow alone. That is an acceptable outcome, but it must be stated
out loud rather than quietly absorbed.

---

## A5. Institutional willingness — someone will pay, and someone will sign

**Assumption:** an identifiable person can authorise a pilot, and there is a route to funding a
deployment.

**How to test it:** get a named decision-maker, a written pilot agreement, and a documented
procurement path (annual licence vs. one-off implementation vs. donor/innovation funding) — see
[`../03-operations/compliance.md`](../03-operations/compliance.md#4-procurement-routes).

**What would kill it:** no named decision-maker after eight weeks, or a procurement process that
cannot legally conclude inside 18 months.

**Ethiopian public-university reality check:** public institutions run on government budgets and
familiar procurement paths. A pure SaaS subscription may be structurally unacceptable. Have the
"implementation + support" and "donor/innovation grant" routes ready before the first commercial
conversation.

---

## A6. Trust — students accept a system that knows what they own

**Assumption:** students will not read the platform as surveillance, provided participation is
voluntary, retention is short, and the rules are written down.

**How to test it:** survey answers to "what would stop you", the withdrawal rate during the pilot,
and any complaints raised with student affairs.

**What would kill it:** a withdrawal rate above ~15% of registered students, or organised student
opposition. Either would mean the governance story failed, regardless of what the metrics say.

**Design commitments that support A6** (already implemented, and worth repeating to students):
- Registration is voluntary; an unregistered device is explicitly *not* suspicious.
- Carrier identity is recorded only when an officer actually checks an ID card.
- Scan records are deleted after a short, configurable window (90 days by default).
- An individual's scan history requires a written justification, permanently audited.
- Aggregate movement analytics are off by default and require a deliberate act to enable.
- The public QR page reveals no personal data to whoever finds the device.

---

## Summary table

| # | Assumption | Kill criterion | Measured by |
| --- | --- | --- | --- |
| A1 | Students register | < 20% of invited students | `Registration rate` on the admin dashboard |
| A2 | Problem is frequent | < ~5 incidents/1,000 students/semester | Survey + security logbooks |
| A3 | Better than the alternatives | Recovery rate ≈ baseline | Recovery rate vs. `baseline_metrics` |
| A4 | A scan fits the checkpoint | Median > 20 s or persistent queues | `scan_events.duration_ms` + observation |
| A5 | Someone will sign and pay | No decision-maker in 8 weeks; no viable route | Pilot agreement + procurement mapping |
| A6 | Students trust it | > 15% withdrawal or organised opposition | Withdrawal rate + complaints log |

**If A1 fails, nothing else matters.** Sequence the work accordingly.
