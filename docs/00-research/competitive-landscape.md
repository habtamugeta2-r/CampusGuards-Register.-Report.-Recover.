# Competitive landscape and honest positioning

**Purpose.** The original proposal named Snipe-IT and Cheqroom and moved on. That understates the
field. This document lists what a student or a university can already use today, for free, and says
plainly where CampusGuard does and does not add anything.

---

## 1. The alternatives that already exist

### 1.1 Manufacturer device tracking — free, pre-installed, and better at tracking

Apple Find My, Google Find My Device and Samsung SmartThings give students real-time location,
remote lock and remote wipe for most modern phones and laptops. They cost nothing, they are already
on the device, and they work off campus.

**Consequence:** CampusGuard must never be pitched as tracking. It cannot win that comparison and
should not try.

### 1.2 Messaging groups — free, instant, universally adopted

Ethiopian university students already use Telegram and Facebook groups to post about lost and found
items. A post reaches hundreds of peers in minutes and needs no registration.

**Consequence:** CampusGuard must not compete on *speed of broadcast*. Its claim is narrower: a
Telegram post is informal, unsearchable after the fact, and leaves no institutional record. That
matters to a university (which has to account for what happened) far more than it matters to an
individual student in the first hour.

### 1.3 Institutional asset management — mature, cheap, and aimed at someone else

| Product | Model | Fit for this problem |
| --- | --- | --- |
| Snipe-IT | Free, self-hosted, AGPL; cloud from ~US$39.99/month | Built for **organisation-owned** IT assets: licences, depreciation, checkout/check-in to staff. QR and barcode generation included, REST API, active community [2](https://rankite.com/blog/best-fixed-asset-tracking-software) [4](https://www.openmsp.ai/blog/it-inventory-management-open-source) |
| Cheqroom | Paid, quote-based (US$184/admin/month on one 2026 comparison) | Built for **bookable shared equipment** — AV, film, labs. Reservation-first, not ownership-first [2](https://rankite.com/blog/best-fixed-asset-tracking-software) [3](https://resources.rework.com/tools/best-ezofficeinventory-alternatives) |

Both are real products with real strengths. Neither is designed for "2,000 students each voluntarily
registering their own phone". Snipe-IT *could* be bent to the task — it is free and self-hostable —
which is precisely why CampusGuard's differentiation has to be about the workflow (identity linkage
+ security integration + lost-and-found matching), not about QR codes.

### 1.4 Existing campus practice

Ethiopian universities already check student IDs and bags at gates. The manual process is imperfect
but it exists, it is staffed, and it is understood. Any digital addition has to prove it is
*significantly* better, not merely more digital.

### 1.5 National digital identity

Fayda, Ethiopia's national digital ID, was adopted as the official student ID across educational
institutions, with roughly 640,000 post-secondary students' biometric data migrated into the
programme [1](https://www.biometricupdate.com/202309/ethiopia-rolls-out-student-ids-integrates-biometric-data-to-issue-fayda)
[2](https://mobileidworld.com/ethiopian-authorities-enroll-students-in-biometric-digital-id-program).
Use of Fayda has been made mandatory for financial transactions from 2025–2026
[3](https://mobileidworld.com/ethiopia-launches-fayda-digital-id-system-mandates-usage-for-banking-by-2026).

**Implication for us:** student identity verification should be *pluggable*. Today CampusGuard
verifies identity through the institutional email domain plus the university ID number. The data
model reserves a `fayda_id` column on `student_profiles`, but storing Fayda numbers is **off by
default** — it is unnecessary for the product's purpose and it raises the sensitivity of every
breach. If a university wants Fayda-based onboarding, integrate as an identity provider; do not
start collecting national ID numbers into a property database.

Independent reporting also documents real problems with Fayda — biometric enrolment failures,
server downtime, and students blocked from services when verification failed
[5](https://www.africanewschannel.org/featured/behind-fayda-the-hidden-costs-winners-and-losers-of-ethiopias-digital-id-revolution/).
Designing a hard dependency on it would import those failure modes.

---

## 2. Where CampusGuard actually adds value

The gap it occupies is narrow and specific:

> No existing tool connects a **student's verified university identity** to a **personally-owned
> device registry** that is **readable by campus security at a checkpoint** and **wired into a
> structured lost-and-found workflow**.

| Alternative | What it does well | What it cannot do |
| --- | --- | --- |
| Find My Device | Tells the *owner* where the device is | Cannot tell an *officer* whether the person carrying it is the owner |
| Telegram groups | Reaches hundreds of people in minutes | No record, no matching, no institutional accountability, expires from memory |
| Snipe-IT / Cheqroom | Manages organisation-owned equipment | Not designed for thousands of students self-registering personal property |
| Manual bag checks | Verifies the student has an ID | Verifies nothing about the device in the bag |

## 3. Positioning statement (use this, not "theft prevention")

> CampusGuard is a campus property registry and recovery platform. It gives students a way to
> document their belongings, gives security better information at a checkpoint, and gives the
> institution a structured process for handling property incidents.

The value proposition is **organisational efficiency and institutional accountability** — not theft
elimination.

## 4. What this means for the product

1. **Never claim prevention.** The landing page, officer guidance and terms all state this.
2. **Compete on the record, not the alert.** Matching, auditability and recovery hand-off are the
   features Telegram cannot provide.
3. **Measure displacement, not activity.** The `missing_reports.channel` field records whether an
   incident came through CampusGuard or through the security desk / Telegram — otherwise we cannot
   tell whether the platform is displacing existing behaviour or merely adding to it.
4. **Keep the identity layer pluggable** so that Fayda or a university SSO can be adopted later
   without a data migration.
