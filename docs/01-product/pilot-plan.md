# Pilot plan

**Purpose.** A pilot is not a demo. It exists to produce evidence that either supports or kills the
decision to deploy — including evidence that is inconvenient.

**Target:** one institution (AASTU), one primary checkpoint (main library exit), 100–200 invited
students, 2–4 trained officers, 8–12 weeks.

---

## 1. Design

| Element | Decision | Rationale |
| --- | --- | --- |
| Scope | One institution, one primary checkpoint | Controlled enough to support, real enough to measure |
| Participants | 100–200 students, recruited by cohort | Large enough for meaningful rates, small enough to support |
| Comparison | A second location with no scanning, or the recorded pre-pilot baseline | Without a counterfactual, no causal claim is possible |
| Procedure change | **Supplement** existing security practice, never replace it | Reduces institutional risk and student resentment |
| Duration | 8–12 weeks | Long enough for adoption to settle and for a few incidents to occur |
| Participation | Voluntary, withdrawable, with written consent | Both an ethical requirement and a trust requirement (A6) |

## 2. Sequence

| Week | Activity | Exit criterion |
| --- | --- | --- |
| −4 to 0 | Baseline collection, agreements signed, checkpoints agreed, baseline row entered | `baseline_metrics` row exists and is sourced |
| 1 | Officer training (2 sessions), student recruitment opens | Officers can complete a scan unaided in < 20 s |
| 1–2 | Registration drive; labels printed and distributed | Registration rate recorded weekly |
| 2–3 | Scanning begins at the checkpoint; queue observation | Median scan time < 15 s; no queue > 5 min |
| 4 | Mid-pilot review: registration rate, scan time, complaints | Go / adjust / pause decision, written |
| 5–10 | Steady operation; weekly metric snapshot | — |
| 11 | Participant survey + exit interviews | Response rate > 40% |
| 12 | Evaluation pack, shared with the university **including the failures** | Decision gate |

## 3. Metrics

Every metric below is computed from live data in `/admin` and exportable as CSV.

| Metric | Definition | Source | Decision value |
| --- | --- | --- | --- |
| Registration rate | Students with ≥1 device ÷ invited active students | `products` | A1 |
| Devices per registered student | Registered devices ÷ registered students | `products` | Depth of coverage, not just breadth |
| Median scan time | Median `duration_ms` | `scan_events` | A4 |
| Queue impact | Observed added wait at the checkpoint (manual, weekly) | Observation sheet | A4 |
| Scan volume per officer-hour | Scans ÷ officer hours | `scan_events` | Operating cost |
| Reports filed via CampusGuard | Count by `channel = CAMPUSGUARD` | `missing_reports` | A3 — displacement |
| Recovery rate | Recovered ÷ (recovered + closed unfound) | `missing_reports` | A3 — the headline |
| Baseline recovery rate | From `baseline_metrics` | `baseline_metrics` | The comparison |
| Median time to recovery | Median hours from report to resolution | `missing_reports` | A3 |
| Found-item turnaround | Found report → returned | `found_reports` | Desk efficiency |
| Follow-up rate | (MISMATCH + ACTIVE_MISSING_REPORT) ÷ all scans | `scan_events` | False-alert load |
| Offline share | Offline scans ÷ all scans | `scan_events` | Connectivity reality |
| Withdrawal rate | Withdrawn accounts + devices ÷ registered | `users`, `products` | A6 |
| Complaints | Logged by the university, not by us | Manual | A6 |

## 4. Baseline — mandatory, and captured before the first label

From the security directorate's logbooks for the equivalent period one semester earlier:
incidents reported, incidents recovered, median recovery time, category mix, locations, and how each
was reported. Enter it in **Admin → Settings → Pre-pilot baseline** before week 1.

If the university cannot produce logbooks, say so in the evaluation pack and treat the pilot as
exploratory rather than confirmatory.

## 5. Stop conditions

Pause and review if any of these occur:

- Median scan time above 20 seconds after week 3.
- A queue exceeding five minutes on more than two days in a week.
- Withdrawal rate above 15%.
- A formal complaint about misuse of scan data.
- Evidence that an alert was acted on as if it were a verdict.

## 6. Evaluation method

Pre-register the analysis before the pilot starts. Specifically:

1. **Primary comparison:** platform recovery rate vs. baseline recovery rate, both computed on
   reports that reached an outcome. Report the difference with a confidence interval, not a
   percentage point alone.
2. **Secondary comparison:** recovery time.
3. **Displacement check:** the share of reports arriving through CampusGuard vs. other channels,
   and whether total reported incidents rose (awareness effect) or fell.
4. **Named confounders:** seasonality (exam periods), staffing changes, publicity during the pilot.
   Record them with dates so they can be discussed honestly.
5. **Qualitative:** officer and student interviews, including direct questions about what annoyed
   them.

**Correlation warning.** A drop in incidents during the pilot is not automatically the platform's
achievement. Write this sentence into the evaluation pack before the data arrives.

## 7. Deliverable

A pilot report of no more than 10 pages containing: the baseline, every metric above, the
stop-condition log, verbatim criticisms, a named recommendation (adopt / extend the pilot / stop),
and the cost of deployment. Share it with the university whether or not it is flattering — a vendor
who only publishes good pilots is not a partner an institution should trust.
