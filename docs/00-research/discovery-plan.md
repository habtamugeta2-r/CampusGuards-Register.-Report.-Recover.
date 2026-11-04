# Phase 1 discovery plan: what to find out before building anything else

The rewritten proposal's central instruction is *do not build before validating the problem*. This
repository contains a working prototype because a prototype is the cheapest way to make the
questions concrete — but it is not evidence that the problem is real. The instruments below are what
produce that evidence.

**Duration:** 3–5 weeks at one institution (target: AASTU).
**Output:** a documented, evidence-based answer to the question in
[`assumptions-to-test.md`](assumptions-to-test.md).

---

## 1. Stakeholder map — who to talk to, in what order

| # | Stakeholder | Why | Ask for |
| --- | --- | --- | --- |
| 1 | Security directorate | Owns the checkpoint workflow | Incident logbooks; 30 minutes on current practice |
| 2 | Student affairs office | Can recruit students; owns welfare framing | Permission to survey; a channel to students |
| 3 | Library administration | Runs the most likely pilot location | Desk procedure for found items; footfall |
| 4 | ICT directorate | Assesses integration and hosting | Identity options (email/Fayda/SSO), hosting capacity |
| 5 | Two to four security officers | The actual users of the scan screen | Their friction, their workarounds, their fears |
| 6 | 15–25 students | The people whose behaviour decides adoption | What they did the last time something went missing |
| 7 | Procurement / finance | Decides whether a purchase is even possible | Budget line, procurement route, timeline |
| 8 | Legal / DPO | Compliance | DPA terms, DPIA requirement, retention policy |

Talk to officers and students **before** talking to procurement. If the frontline answer is "this
would not help", the procurement conversation is wasted.

## 2. Interview guide — students (20–25 minutes, individual or pairs)

Open neutrally. Do not describe the product before you have heard the story.

1. "Tell me about the last time you lost something on campus, or had something taken. What did you
   actually do, in order?"
2. "Who did you tell? In what order?"
3. "How long did it take before you gave up?"
4. "Did you get it back? How?"
5. "If it was found by another student, how would they have known it was yours?"
6. "Have you ever *found* something and not known what to do with it? What did you do?"
7. "Do you use Telegram/WhatsApp groups for this? What worked and what did not?"
8. "Would you put a sticker on your laptop? Why not?" ← **the adoption question, asked directly**
9. "What would make you take it off again?"
10. "If a guard asked to scan your laptop on the way out of the library, how would you feel?"
11. "Would you lend a registered device to a friend? Would you record that?"
12. "What would worry you about a university system that knows which devices you own?"

*Record verbatim answers to 8 and 10. They decide the product's fate.*

## 3. Interview guide — security officers (30 minutes, at their post)

1. "Walk me through what happens when a student reports a stolen laptop."
2. "Show me the logbook / system. How do you record it?"
3. "When someone hands in a found device, what do you do with it? Where does it sit?"
4. "How often does anyone come back to ask about it?"
5. "At the gate, what do you check now, and how long does it take?"
6. "How would you decide that a device is *not* someone's?"
7. "What happened the last time you got that call wrong?"
8. "If a screen told you 'this device is reported missing', what would you do next — and what would
   you need it to say to make that safe?"
9. "How many students pass this point between 5 and 6pm?" ← **the queue arithmetic**
10. "What would make you stop using a tool like this?"

## 4. Survey (target n = 200–400)

Keep to one screen. Every question maps to a metric in the pilot plan.

- In the last 12 months, have you lost or had something stolen on campus? (never / once / 2–3 / 4+)
- What was it? (phone / laptop / tablet / other)
- Did you report it? To whom? (security desk / department / Telegram group / nobody / other)
- Did you get it back? (yes / no / still open)
- How long did it take? (hours / days / weeks / never)
- Do you currently have Find My / equivalent enabled? (yes / no / don't know)
- Would you register your devices in a university system? (definitely / probably / probably not /
  definitely not)
- What would stop you? (sticker on my device / don't trust the university with the data / too much
  hassle / no benefit to me / other)
- Would you accept a 15-second scan at one checkpoint? (yes / only if voluntary / no)
- Year, department, and whether you live on campus.

**Analysis:** cross-tabulate "would you register" against "have you lost something". If students
who have *not* been affected say no and affected students say yes, adoption is self-limiting and the
product must be sold on the recovery story, not on universal coverage.

## 5. Baseline data — collect before a single label is printed

This is non-negotiable: without it the pilot can show activity but not improvement.

From the security directorate's logbooks, for the equivalent academic period one semester earlier:

| Field | Why |
| --- | --- |
| Incidents reported | Denominator for the recovery rate |
| Incidents recovered | Numerator |
| Date reported and date recovered | Median recovery time |
| Category (lost / stolen / misplaced) | Mix, and whether the platform changes reporting behaviour |
| Where the incident happened | Whether the checkpoint location is the right one |
| How it was reported | Establishes the Telegram/security-desk split |

Store it as a `baseline_metrics` row (the schema and admin UI already support this) **before** the
first student registers. Also record: student population, number of gates, opening hours, and the
existing found-property procedure.

## 6. Queue arithmetic — do this on day one

At the candidate checkpoint, count how many students pass during the busiest hour. Then:

```
throughput = students per hour
scan_budget = 15 seconds (measured, not assumed)
officers_needed = ceil(throughput × 15s / 3600s)
```

If a 200-student hour needs more officers than the university can staff, **scanning cannot be
universal** — it must be spot-check only, and the pilot should test whether spot checks change
anything at all. That is a finding, not a failure.

## 7. Decision gate at the end of Phase 1

Write one page, signed off with the institution, answering:

1. How frequent is the problem, with numbers?
2. What is the baseline recovery rate and time?
3. What does the university do today, and what specifically is broken?
4. Will students register? At what rate, and what would stop them?
5. Can a scan be done in 15 seconds without a queue? At which checkpoint?
6. Who signs the pilot agreement, and is there a budget?

If the answer to (1) is "rare", (4) is "no", or (5) is "no", stop or redesign. Do not proceed to a
pilot on momentum.
