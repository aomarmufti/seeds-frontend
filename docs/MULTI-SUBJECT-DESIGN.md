# Multi-subject, multi-tutor, and profiles — design

**Date:** 2026-08-02 · **Status:** design, not built. The frontend fixes shipped alongside this doc work around the current model; they do not change it.

---

## 1. The constraint, stated plainly

A student record today holds:

- `assigned_tutor` — **one** tutor name, a string
- `subject` — **one** subject, a string

That is the whole reason for the reported problem. A family that signed up for Arabic is an Arabic family, permanently, to every screen in the product. They cannot add Maths, cannot hold two tutors, and admin has no control to change the subject at all — the Students table exposes a tutor dropdown and nothing else.

This is not a UI omission. Any "add a second subject" control built on the current fields would have to overwrite the first one. **The fix is a backend data-model change**, and everything below assumes it.

A second consequence worth naming: because the tutor is a *name string* rather than an id, renaming a tutor silently orphans every student assigned to them.

---

## 2. Proposed model: the enrolment

Introduce one concept that replaces both fields.

**An enrolment is: this student, studying this subject, at this level, with this tutor, at this rate, in this state.**

| Field | Notes |
|---|---|
| `id` | |
| `student_id` | |
| `subject` | Maths, Arabic, Chemistry… |
| `level` | KS3 / GCSE / A-Level — **this is what sets the rate**, £40 vs £45 |
| `tutor_id` | A real id, not a name. Renaming a tutor must not orphan anyone. |
| `status` | `pending` (no tutor yet) · `active` · `paused` · `ended` |
| `rate_pence` | Snapshot at creation, so a later price change never rewrites history |
| `started_at` / `ended_at` | |

A student has many enrolments. A tutor has many. A booking gains `enrolment_id`, which is what finally makes "which subject was this lesson, and at what rate" a fact rather than a guess — today `subject` is free text typed into the booking form, so "Maths", "maths" and "GCSE Maths" are three different subjects to any report.

**Migration:** each existing student becomes one enrolment from their current `subject` + `assigned_tutor`. Nothing is lost, and the old fields can stay as read-only mirrors of the primary enrolment until every screen has moved.

**Why not just make `subject` and `assigned_tutor` arrays?** Because the pairing matters. Two subjects and two tutors as separate lists cannot say *which* tutor teaches *which* subject, and the rate hangs off the level per subject, not off the student.

---

## 3. What each portal does

The organising rule: **the student asks, the tutor teaches, the admin decides.** Only one role changes commercial facts.

### Student portal

**Sees** — their enrolments as cards: subject, level, tutor, status, rate per lesson. Their own profile. Everything already there (lessons, progress, payments), but filtered per subject rather than mixed into one list.

**Does**
- **Request a new subject.** A form, not a switch: subject + level + "why". It creates an enrolment as `pending` and notifies admin. The family cannot pick their own tutor or their own rate.
- **Book a lesson** — but only *within* an active enrolment, which is what makes the tutor, subject and rate unambiguous at booking time and removes the free-text subject box entirely.
- **Pause or end** an enrolment ("we're stopping Arabic for now"). Ending is theirs to do — nobody should have to email to stop being billed.
- **Edit their own profile**: student name, year group, parent name, phone, exam board, target grades, notification preferences, timezone.

**Cannot** — set a rate, assign a tutor, or move an enrolment to `active`. A parent choosing their own tutor sounds friendly and quietly destroys capacity planning and quality control.

### Tutor portal

**Sees** — their students *by enrolment*, so "Ibrahim (GCSE Maths)" and "Ibrahim (A-Level Further Maths)" are two rows and two progress threads, as they are two different jobs. Their own profile. Their earnings split by enrolment.

**Does**
- Record outcomes, set homework, log progress — per enrolment.
- Add a lesson for any student enrolled *with them* (this is the deadlock just fixed, and the enrolment model makes it structural rather than a filter).
- **Edit their own profile**: display name (the name Cal.com knows them by), subjects and levels they teach, exam boards, bio, photo, availability notes, payout details.
- **Flag** an enrolment: "this student needs a different tutor", "they've outgrown my level". A flag, not an action — the tutor cannot reassign themselves away from a family.

**Cannot** — create an enrolment, change a rate, or see another tutor's students.

### Admin portal

**Sees** — everything, and specifically the queue: enrolments in `pending` with no tutor. That is the state where a family is waiting and revenue is not moving.

**Does**
- Create, edit, reassign and end any enrolment. **Reassigning a tutor mid-enrolment must keep the enrolment** (so history stays attached to the subject, not the person) while recording who taught which lesson.
- Change subject or level on an enrolment — the control that is entirely missing today. Changing level changes the rate going forward, never retroactively.
- Set a non-standard rate per enrolment (sibling discount, bursary, a trial extended by goodwill) with a required reason.
- Approve accounts; edit any profile.

---

## 4. Lesson type × outcome — the matrix

The question was: *can a free consultation be marked complete with both people turning up, and charge nobody?* Today the outcome dialog says "charged in full" on every completion option regardless of lesson type, which is wrong on a free lesson and is why a tutor hesitates to record one. The copy is fixed; the underlying rules should be explicit.

| Lesson type | Delivered | Cut short | Student no-show | Cancelled by agreement | Tutor cancelled | Late cancellation (<24h) |
|---|---|---|---|---|---|---|
| **Consultation** (free, 15 min) | No charge. Mark used. | No charge | No charge, flag for follow-up | No charge | No charge | No charge |
| **Trial** (free, 60 min) | No charge. Trial consumed. | No charge. Trial consumed. | No charge. **Trial not consumed** — they never had it | No charge, trial not consumed | No charge, trial not consumed | No charge, trial not consumed |
| **Paid 1:1** | Charge, pay tutor | Charge in full, pay tutor | Charge in full, pay tutor | No charge, no pay | No charge, no pay | Charge, pay tutor |
| **Group** | Charge per attendee | Charge | Charge | No charge | No charge, **refund every attendee** | Charge |

Two rules worth stating because they are easy to get wrong:

1. **"Consumed" is separate from "charged."** A free trial that the student no-showed should not burn their one free trial — they got nothing. Today nothing tracks this, so eligibility is inferred from whether a trial booking exists at all, which quietly punishes a family for a lesson they never received.
2. **A tutor cancelling a group session is not one refund, it is N.** Nothing currently handles that.

---

## 5. Profiles — the missing screens

There is no profile page for a student or a tutor. Both need one; they are also where half the data quality problems get fixed at source.

**Student profile** (`/student/profile`) — student name, year group, school, exam board per subject, target grades, parent name/phone/email, timezone, notification preferences, safeguarding contact. Email changes go through verification.

**Tutor profile** (`/tutor/profile`) — display name, subjects and levels taught, exam boards, bio and photo (these should feed the public `/tutors/[slug]` pages instead of the hardcoded roster in `lib/tutors.jsx`, which closes SCRUM-XX24), DBS status and expiry, Cal.com links, payout details.

**Admin** can view and edit both, and should see an audit trail of who changed what — rates and tutor assignments are commercial facts and "who changed this" will be asked eventually.

---

## 6. Scenarios not raised, which will happen anyway

- **Sibling accounts.** Two children under one parent login. This is the same modelling problem — today "student" and "parent" are the same record — and it is the cheapest revenue on the platform. Worth solving *with* enrolments rather than after, because both need a real student entity distinct from the account holder.
- **A tutor leaves.** Every active enrolment needs reassignment, every future booking rebooking. Without an explicit `ended` state this is a silent mess.
- **Level changes mid-year.** A Year 11 becomes a Year 12; GCSE £40 becomes A-Level £45. Should be a new enrolment, with the old one ended, so history keeps the rate it was actually taught at.
- **Two tutors, one subject.** Cover during illness, or a specialist for one module. The enrolment holds the primary tutor; a booking can name a different one.
- **A subject nobody teaches.** A family requests Physics; no tutor has it. The enrolment sits `pending` and should appear in admin as demand data — that is how you learn who to hire next.
- **Paused enrolments and billing.** Paused must stop reminders and stop counting toward capacity, without ending the relationship or losing progress history.
- **Rate changes.** A price rise must apply to future lessons only. Snapshotting `rate_pence` per enrolment is what makes that automatic rather than a migration each time.

---

## 7. Backend prerequisites

Nothing in sections 2–6 can ship frontend-first. Required, in order:

1. `enrolments` table + migration from `subject` / `assigned_tutor`; `enrolment_id` on bookings.
2. Tutors keyed by id, not name.
3. `/api/enrolments` — list, create, update status, reassign tutor, set rate.
4. Booking creation validated against an active enrolment; rate derived from it rather than sent by the client.
5. Trial/consultation eligibility tracked explicitly (`consumed`), not inferred from the existence of a booking.
6. Profile read/write endpoints for student and tutor.

Once 1–4 exist, the portal work is roughly: enrolment cards on the student portal, per-enrolment grouping on the tutor portal, an enrolment editor plus the pending queue on admin, and two profile pages.
