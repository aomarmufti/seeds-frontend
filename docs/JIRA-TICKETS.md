# Seeds — Jira Ticket Backlog

**Date:** 2026-07-31 · **Format:** ready to paste into Jira (or import). Existing project key appears to be `SCRUM` (SCRUM-33/34/74 referenced) — numbering below is suggested; assign real keys on import.

**Status key:** ✅ = already built this session (import as Done, or skip), 🆕 = new ticket.

---

## Epic 1 — Auth & Onboarding (P0)

### ✅ SCRUM-XX1 — Restore Google sign-in on /login
Type: Story · Priority: Highest · Status: **Done (2026-07-31), pending deploy**
Ported legacy Supabase OAuth: "Continue with Google" button, legacy styling + 4-colour Google SVG, redirectTo preserves `?next=`, OAuth errors surfaced.
**AC:** Google button initiates OAuth and lands the user in the correct role portal. — *Requires manual Supabase config (see SCRUM-XX5).*

### ✅ SCRUM-XX2 — Public signup page (/signup)
Type: Story · Priority: Highest · Status: **Done, pending deploy**
Port of legacy `lgSignup`: name/email/password/subject/level, `role:'pending'`, profiles upsert, lead POST (`goal: 'Student signup'`), `?email=`/`?name=` prefill, approval-expectation success copy.
**AC:** A new parent can request an account; admin sees the pending profile + lead.

### ✅ SCRUM-XX3 — Password reset flow (/forgot-password + /set-password)
Type: Story · Priority: High · Status: **Done, pending deploy**
`resetPasswordForEmail` → `PASSWORD_RECOVERY` → `updateUser`; expired-link state; Google sessions excluded from forced set-password.
**AC:** User can reset password end-to-end via email link.

### ✅ SCRUM-XX4 — Link consultation booking → signup → portal
Type: Bug · Priority: Highest · Status: **Done, pending deploy**
Booking success "View in Student Portal" now routes to `/signup?email=…&name=…` prefilled, so the backend's email-match linkage works after approval.
**AC:** Book consultation → sign up with same email → approved → consultation visible under My lessons.

### 🆕 SCRUM-XX5 — Supabase dashboard config for Google OAuth + redirect URLs
Type: Task · Priority: Highest · **Manual, blocks SCRUM-XX1 in production**
1. Authentication → Providers → Google: enable, with Client ID/Secret from Google Cloud Console (add the Supabase callback URL to the OAuth client's authorised redirect URIs).
2. Authentication → URL Configuration: add `https://www.seedsinstitute.co.uk/login` and `…/set-password` (+ localhost for dev).
**AC:** Google sign-in completes in production.

### 🆕 SCRUM-XX6 — Speed up / communicate account approval
Type: Story · Priority: High
Post-signup momentum dies at "awaiting approval" with no timeline. Options: instant student access after email verification (approval only gates paid lessons), or an approval SLA stated on the confirmation screen + admin alert email on new signup.
**AC:** New signup sees a concrete expectation; admin is notified without polling the leads page.

### 🆕 SCRUM-XX7 — Branded Supabase email templates
Type: Task · Priority: Medium
Confirmation/recovery emails currently come from raw Supabase defaults. Customise sender name, logo, copy.
**AC:** Reset/confirmation emails look like Seeds, not Supabase.

---

## Epic 2 — Conversion Funnel (P1)

### ✅ SCRUM-XX8 — Pricing section/page
Type: Story · Priority: Highest · Status: **Done (2026-08-01)**
`#pricing` section on the landing page between "How it works" and the parent Q&A — three cards (GCSE £40 / A-Level £45 featured / group £20) with what's included, plus pay-per-lesson / free-first / 24h-cancellation / sibling-discount notes and a MyTutor price anchor. Rates and notes live in `lib/site.js`. Linked from the nav ("Pricing") and the footer, and from `/faqs#pricing`.
**AC:** A parent can learn the price before booking. ✔

### ✅ SCRUM-XX9 — Unify funnel CTAs
Type: Story · Priority: High · Status: **Done (2026-08-01)**
The booking modal is the single primary CTA: the nav button now opens it (it used to point at the journey wizard, putting the two funnels head-to-head at the top of every page), and the hero, pricing cards and CTA section all lead with it. The wizard is the escape hatch — "Not ready to book?" in the hero and CTA section, and the journey section's own heading now reads "Not ready to book? / Then let us come to you".
**AC:** No section presents two equal-weight funnels. ✔

### ✅ SCRUM-XX10 — Standardise the free-offer terminology
Type: Bug (content) · Priority: High · Status: **Done (2026-08-01)**
One offer, one sequence, everywhere: **free consultation (15-min call) → free trial lesson (30 min)**, defined in `lib/site.js`. Replaced "Free diagnostic lesson", the hero's bare "Free lesson", "Initial Consultation" in the booking modal summary/success rows, and the untimed "Free trial lesson" in the journey steps. How-it-works steps 01/02 are now the two free stages explicitly, with tutor matching folded into 02.
**AC:** Identical offer wording site-wide. ✔ (two e2e specs updated for the modal's new label)

### ✅ SCRUM-XX11 — Route dead links: Terms, Privacy, FAQs, Group Sessions, tutor Profiles, "View all courses"
Type: Bug · Priority: Highest (Terms/Privacy = legal) · Status: **Done (2026-08-01)**
`/terms`, `/privacy`, `/faqs` (accordion via `<details>`, deep-linkable) and `/tutors/[slug]` are real routes seeded from the legacy overlays. Footer FAQs/Terms/Privacy, "Group Sessions" (→ `/faqs#group-sessions`), "View all courses" (→ `/faqs#subjects`, relabelled "View all subjects") and the tutor "Profile" buttons all navigate. Nav + footer extracted to `components/site/` so every page carries the same chrome.
**AC:** Every link-styled element navigates somewhere real. ✔ (no `footer-link-dead` / `footer-copy-dead` spans remain)

### ✅ SCRUM-XX12 — Fix Zoom-vs-Google-Meet copy
Type: Bug (content) · Priority: High · Status: **Done (2026-08-01)**
All marketing copy now says Google Meet (hero card, how-we-teach, how-it-works, booking modal timezone note). Zoom blue swapped for Meet green in the pill/feature card. The hero card's "Join" buttons became non-interactive `<span>`s — it is an illustration, not a control.
**AC:** The platform named on the landing matches the join link in the portal. ✔ (zero "Zoom" strings left in `app/` and `components/`)

### ✅ SCRUM-XX13 — Single email domain (code side)
Type: Task · Priority: High · Status: **Done in code (2026-08-01); mail forwarding still manual**
Standardised on the brand domain: `hello@seedsinstitute.co.uk` and `privacy@seedsinstitute.co.uk`, sourced from `lib/site.js` so there is one definition. Zero `seedstuition.co.uk` references remain in the app.
**AC:** One contact domain everywhere. ✔ in code — **remaining manual step:** forward/redirect `seedstuition.co.uk` mail to the institute domain, and update the Supabase email templates (SCRUM-XX7).

### 🔶 SCRUM-XX14 — Lead magnet + email capture
Type: Story · Priority: Medium · Status: **Capture done (2026-08-01); nurture email outstanding**
Footer capture (`components/landing/LeadMagnet.jsx`): exam board + email → `POST /api/leads` with `goal: 'Past paper pack request'`, so it lands in the existing `/admin/leads` screen with no backend change. A failed POST surfaces an error with the contact address rather than silently losing the lead.
**AC:** Email capture stores a lead ✔ — **welcome/nurture email still to build** (needs the pack itself plus a Resend sequence; the form deliberately promises delivery "by email" rather than an instant download the backend cannot serve).

---

## Epic 3 — Trust & Proof (P1)

### 🆕 SCRUM-XX15 — Google Business Profile + real reviews on landing
Type: Story · Priority: High
"4.9★ · 120+ reviews" must link to a real profile; embed genuine reviews. Add "how did you hear about us?" to the booking form while there.
**AC:** Review claim is clickable and verifiable.

### 🆕 SCRUM-XX16 — Source the outcome statistics
Type: Task · Priority: Medium
"94% / 67%" stats need a stated basis ("students completing 6+ months, 2024–25") or removal.
**AC:** Every stat is sourced or softened.

### 🚧 SCRUM-XX17 — Referral programme — **blocked on backend**
Type: Story · Priority: High · Status: **Not started — needs backend work first**
Unique per-family referral codes, attribution of a signup to a referrer, and the reward ledger all have to live in the backend (`seeds-backend-six.vercel.app`), which is out of scope for the frontend rebuild. A frontend-only version would be a "copy this link" button whose conversions nobody can count — worse than nothing, because it looks instrumented.
**Next step:** backend ticket for `referral_code` on the profile, a `referred_by` field captured at signup, and a `/api/referrals` read for the admin view. The portal UI is a small job once those exist.
**AC:** A parent can copy a referral link; conversions are attributable.

---

## Epic 4 — Portals (P2/P3)

### ✅ SCRUM-XX18 — Student portal: "consultation booked" state + add-to-calendar
Type: Story · Priority: High · Status: **Done (2026-08-01)**
A booking whose `lessonType` is `consultation` is now named as one throughout the lessons page — the lead card reads "Your free consultation / Free consultation call, <when>" with the tutor, a "Join the call" button and a line explaining that the free trial lesson follows. Add-to-calendar (Google + `.ics` data URL, `lib/calendar.js`) sits on the lead card for every booking. The empty state changed from "No lesson booked yet" to "Nothing booked yet", explaining that a just-booked consultation appears once the account is approved.
**AC:** Post-approval, the consultation is visible and addable to calendar. ✔ (two e2e specs added)

### 🆕 SCRUM-XX19 — Student portal: group-session recordings library
Type: Story · Priority: Medium
Marketing already promises recorded group sessions — surface them (open item from rebuild log).
**AC:** Recordings listed and playable in portal.

### 🆕 SCRUM-XX20 — Multi-child (sibling) accounts + discount
Type: Story · Priority: Medium
One parent login, multiple students; sibling pricing rule.
**AC:** Parent can add a second child; billing reflects discount.

### 🆕 SCRUM-XX21 — Stripe live-mode cutover
Type: Task · Priority: Highest before first real payment
Test key is hardcoded in `app/student/payments/page.js`; move keys to env, run a £1 live test, verify webhooks.
**AC:** Real card payment succeeds and reconciles in Stripe.

### 🆕 SCRUM-XX22 — Tutor portal: lesson-prep + post-lesson log modals; outcome nudge
Type: Story · Priority: Medium
Rebuild-log open items; plus a nav badge until past lessons have outcomes recorded (unrecorded = unbilled).
**AC:** No past lesson without an outcome goes unnoticed.

### 🔶 SCRUM-XX23 — Admin: "today" dashboard done; finance page parity outstanding
Type: Story · Priority: High · Status: **Today screen done (2026-08-01); finance parity + SCRUM-74 still open**
`/admin/today` is the new admin landing page (`/admin` redirects there, nav entry added): today's lessons, signups awaiting approval, finished lessons with no recorded outcome (gold-bordered — unbilled and unpayable until answered), amount not yet charged, and new enquiries. Everything is derived from `/api/analytics`, `resource=pending-profiles` and `/api/leads` — endpoints the admin portal already calls, so no backend change.
**AC:** Ops runnable from one admin screen ✔ for the daily sweep. **Still open:** Cal.com scheduling-links editor (SCRUM-74), bulk tools, health modal, and a real payments/finance page — the last needs finance endpoints that don't exist yet, so it is backend work first.

### 🆕 SCRUM-XX24 — Replace hardcoded tutor roster with roster-driven data
Type: Tech debt · Priority: Medium
Landing tutors, booking modal, prices all hardcoded — drive from backend roster.
**AC:** Adding a tutor requires no code change.

---

## Epic 5 — Quality & Tech Debt

### ✅ SCRUM-XX25 — Rewrite the stale e2e specs against Next.js routes
Type: Task · Priority: High · Status: **Done (2026-08-01)**
`student-portal`, `tutor-portal`, `admin-portal` and `routing` rewritten against the real routes, on a shared `tests-e2e/support/portal.js` harness: Supabase's token endpoint is stubbed and the spec signs in through the real login form, so supabase-js owns its own session storage and the test never encodes a session format. The backend gets a catch-all stub so no spec can reach the live deployment. The two specs covering the not-yet-ported Cal.com scheduling-links editor were not faked — that coverage returns with the screen (SCRUM-74).
**AC:** `npm run test:e2e` green against production build. ✔ **43 passed / 0 failed**

### 🆕 SCRUM-XX26 — End-to-end auth regression test
Type: Task · Priority: High
Scripted e2e: signup → approve (admin API) → login → consultation visible; password reset; Google OAuth smoke.
**AC:** Covered in Playwright with seeded test accounts.

### 🆕 SCRUM-XX27 — Accessibility pass
Type: Task · Priority: Medium
Gold-on-white small-text contrast, emoji icons → icon set, modal focus trap/Escape, `lang="ar"`/`dir="rtl"` on Arabic verse, real links not styled spans.
**AC:** WCAG AA on landing + auth pages.

### 🆕 SCRUM-XX28 — Add `.nvmrc` (Node 20)
Type: Chore · Priority: Low
System node is v16; Next 15 needs ≥18.18. Repo has no `.nvmrc`.
**AC:** Fresh clone builds without manual PATH fixes.

---

## Epic 6 — UAT-confirmed defects (live site, 2026-07-31)

### ✅ SCRUM-XX29 — Mobile header clipped at 375px
Type: Bug · Priority: High · Status: **Done (2026-07-31), pending deploy**
UAT: "Get started" CTA clipped off the right viewport edge at 375px; no hamburger. Fixed by compacting the nav ≤600px (ghost portal button hidden — redundant with the floating Sign-in pill). Verified: `btnRight=359 < vw=375`, no overflow.
**AC:** Primary CTA fully visible at 375px; no horizontal scroll.

### ✅ SCRUM-XX30 — Missing favicon
Type: Bug · Priority: Low · Status: **Done (2026-07-31), pending deploy**
`/favicon.ico` 404, no icon link. Added `app/icon.svg` (Seed mark on navy); `<link rel="icon">` verified served.
**AC:** Tab shows the Seeds mark.

### 🆕 SCRUM-XX31 — Booking modal availability cold-start
Type: Bug · Priority: Low
First modal open can hold "Loading availability…" for several seconds (backend `scheduling-link` cold start). Subsequent loads ~1s. Options: keep-alive ping, prefetch on CTA hover, or a friendlier skeleton.
**AC:** Perceived wait on the money-path under ~1s.

### 🆕 SCRUM-XX32 — Seeded test accounts for portal UAT
Type: Task · Priority: High
Logged-in student/tutor/admin journeys can't be UAT'd without credentials. Create disposable test accounts (one per role) in Supabase, document creds privately, wire into Playwright (feeds SCRUM-XX26).
**AC:** Full portal e2e runnable on demand.

---

## Epic 7 — Enrolments, profiles & live-use defects (2026-08-02)

### ✅ SCRUM-XX33 — Newly assigned student not bookable by their tutor
Type: Bug · Priority: Highest · Status: **Fixed (2026-08-02)**
The tutor's add-lesson modal built its student list from the tutor's own bookings, so a family admin had just assigned appeared on "My students" but could never be given a first lesson — the only route onto the list was already having a booking. Now unions the assigned roster with anyone already taught, filtered exactly as the My students page filters it.
**AC:** A student assigned today can be booked today. ✔

### ✅ SCRUM-XX34 — Student portal offered a hardcoded tutor list
Type: Bug · Priority: Highest · Status: **Fixed (2026-08-02)**
Mirror of XX33: the book-a-lesson modal offered three hardcoded names, so an assigned tutor was invisible to the family assigned to them. Now derived from the family's own `assigned_tutor` plus anyone they have had a lesson with.
**AC:** A family can book with the tutor they were assigned. ✔

### ✅ SCRUM-XX35 — "Unauthorized" when recording a lesson outcome
Type: Bug · Priority: High · Status: **Frontend half fixed (2026-08-02)**
`api()` sent the request with no Authorization header at all when the session had expired, so an expired login surfaced as a permissions error. Now fails fast with "your session has expired", and a genuine 401/403 explains the account was not accepted for that record.
**AC:** The message tells the person what to do. ✔ — **if it recurs on a fresh login it is backend-side**: the booking is not considered that tutor's, which is a data problem to fix in the assignment, not the UI.

### ✅ SCRUM-XX36 — Free lessons said "charged in full"
Type: Bug (content) · Priority: High · Status: **Fixed (2026-08-02)**
Every outcome in the tutor's dialog carried money copy written for paid lessons, shown unchanged on free consultations and trials. `lib/lessons.js` now answers "is this free" in one place; the dialog swaps the money line. Outcome keys unchanged, so backend semantics are untouched.
**AC:** A tutor can mark a free consultation complete without being told the family is charged. ✔

### ✅ SCRUM-XX37 — Lesson duration inconsistent (30 / 55 / 60)
Type: Bug (content) · Priority: Medium · Status: **Fixed (2026-08-02)**
Standardised on 60 minutes everywhere, matching the Cal.com event types.
**AC:** One duration site-wide. ✔

### 🚧 SCRUM-XX38 — Enrolments: multi-subject, multi-tutor — **blocked on backend**
Type: Epic · Priority: Highest · **Design: `docs/MULTI-SUBJECT-DESIGN.md`**
`assigned_tutor` and `subject` are single string fields on the student record, so a family holds exactly one tutor and one subject and admin has no control to change the subject at all. Replace both with an *enrolment* (student × subject × level × tutor × rate × status); bookings gain `enrolment_id`; tutors keyed by id not name.
**AC:** A family can study two subjects with two tutors, and admin can change either.

### ✅ SCRUM-XX39 — Student profile page
Type: Story · Priority: High · Status: **Shipped, partial (2026-08-02)**
`/student/profile` now exists. Student name, school year, subjects at school, target grades and WhatsApp preferences **save for real** — those are `profiles` columns, and the table carries RLS policies for select/update scoped to `id = auth.uid()`, so the write already existed and needed no backend change. Subject, level and assigned tutor are shown read-only: RLS would permit the write, but rate hangs off level and capacity hangs off assignment, so they are admin's per `docs/MULTI-SUBJECT-DESIGN.md` §3. Parent phone, school, exam board per subject and safeguarding contact live on `students`, which has no browser-facing policy and no endpoint — named on the page as not-yet-editable rather than shown as inputs that would lose what a parent typed.
**AC:** A parent can correct their own details without emailing. ✔ for the details they own; the rest still needs backend write endpoints.

### ✅ SCRUM-XX40 — Tutor profile page
Type: Story · Priority: High · Status: **Shipped, partial (2026-08-02)**
`/tutor/profile` now exists. Full name, subjects and levels, bio and WhatsApp preferences save for real. Payout state is read from `/api/payouts?resource=connect-status` and shown read-only.

**Display name (`tutor_name`) is deliberately locked**, with the reason on the page. The backend authorises a tutor against a booking by string-matching `profiles.tutor_name` to `bookings.tutor_name`, so a tutor who renamed themselves would be locked out of every lesson they already have — SCRUM-XX35's "Unauthorized", self-inflicted. The legacy tutor modal offered exactly this field; not restoring it is the fix. It stays locked until tutors are keyed by id (XX38 prerequisite 2).

Photo, DBS status and expiry, exam boards and Cal.com links are not editable: they live outside `profiles` and need endpoints. Feeding the public `/tutors/[slug]` pages from here — the part that would close SCRUM-XX24 — needs a public read endpoint, since no other tutor's profile row is readable from the browser by design.
**AC:** A tutor maintains their own profile ✔; the public page reflecting it is still open.

### 🚧 SCRUM-XX41 — Trial/consultation eligibility tracked, not inferred — **backend-blocked**
Type: Bug · Priority: Medium · Status: **Frontend rule made explicit (2026-08-02); the reported bug is backend**

Investigated against the schema. Two halves:

- **Cancelled free lesson.** Already behaves correctly, but by accident: `app/student/calendar/page.js` filters cancelled bookings out for the calendar, and the booking modal inherited that filter. The rule now lives in `lib/lessons.js` (`hasUsedFreeLesson`) so a display filter is no longer what stands between a family and a second £0 lesson. No user-visible change.
- **No-showed free trial — the actual ticket, and not fixable here.** Recording a no-show sets `status = 'completed'` (`api/lifecycle.js`, mark-delivered). The unique index is `bookings_one_trial_per_student ON bookings (student_id) WHERE lesson_type = 'trial' AND status <> 'cancelled'`, so a no-showed trial still occupies it and the family cannot rebook — the database burns the trial regardless of what the UI offers. The student portal cannot even detect the case: `delivery_status` is not in `/api/analytics?resource=my-bookings`'s select list.

**Backend needed:** (1) expose `delivery_status` on `my-bookings`; (2) narrow the trial/consultation unique indexes to exclude free lessons whose outcome was `no_show`, `cancelled_mutual`, `tutor_cancelled` or `waived` — i.e. index on "consumed", per `docs/MULTI-SUBJECT-DESIGN.md` §4 rule 1.
**AC:** A trial is consumed only when it was actually delivered. — still open.

### 🚧 SCRUM-XX42a — A group session cannot have a second attendee — **backend, found while investigating XX42**
Type: Bug · Priority: High
Both booking modals sell "Group session — £20", and a group session with more than one student **cannot be created today**. A booking holds a single `student_id`, so N attendees means N booking rows at the same time with the same tutor, and `bookings_no_tutor_overlap` is an exclusion constraint (`tutor_name WITH =, tstzrange(start_time, end_time) WITH &&`) over every non-cancelled booking. The second attendee is rejected — by `api/lifecycle.js`'s own conflict check first (409, "already has a lesson at that time"), and by the constraint behind it. What the product currently sells as a group session is a 1:1 lesson at £20.

**Backend needed:** a session entity that attendees join, or an attendees join-table, so the exclusion constraint applies per session rather than per attendee.
**AC:** Two students can attend the same group session.

### 🚧 SCRUM-XX42 — Group session cancelled by the tutor refunds every attendee — **backend-blocked, and blocked on XX42a**
Type: Bug · Priority: Medium · Status: **Investigated (2026-08-02), no frontend work possible**
A tutor cancelling a group session is N refunds, not one. Two reasons this cannot start on the frontend:

1. There is no N — see SCRUM-XX42a. A group session with two attendees cannot exist in the data model, so "refund every attendee" presupposes something the schema does not currently permit.
2. The frontend never issues refunds. It renders a `refunded` payment status and nothing else; refunds are Stripe-side, in the backend's `lib/refunds.js`. There is no honest frontend slice here — building a refund control would be a button that promises money it cannot move.

**AC:** All attendees are made whole. — unchanged, and entirely backend.

### ✅ SCRUM-XX43 — "studentId required" when a tutor books a lesson
Type: Bug · Priority: Highest · Status: **Fixed (2026-08-02)**
The add-lesson modal sent `studentName` only. `api/lifecycle.js` requires `studentId` from a tutor caller and refuses to resolve a student by name — only a family booking for themselves may omit it, because there the record comes from their own verified email. The roster mapping discarded the id (`.map((st) => st.student_name)`), so every roster student — exactly the set XX33 made bookable — failed at submit. Ids now flow from both sources (`/api/analytics?resource=students` → `st.id`, bookings → `b.studentId`), and a student whose id is somehow missing gets an actionable message instead of the backend's.
**AC:** A tutor can book a lesson for a student assigned to them today. ✔ — pinned by an e2e test that asserts the POST body carries `studentId` (red before the fix).

**`components/student/BookLessonModal.jsx` has no equivalent bug** and was deliberately left alone: the backend resolves — and creates, for a first-ever lesson — the family's own student record from the caller's verified `parent_email`, never from the name in the body. Sending an id from the client there would add a permission check without adding a fact.

---

## Answered from the backend source (2026-08-02)

Two items previously carried as unverified, now confirmed by reading `seeds_backend` (read-only; no backend change made):

- **A free consultation marked "delivered" charges £0.** `lib/pricing.js` gives `consultation` and `trial` `amount: 0`, so the booking is written with `fee_pence = 0`, and both billing queries in `api/billing.js` filter `fee_pence=gt.0`. A delivered consultation cannot enter a bill. The frontend copy from XX36 is accurate.
- **A recurring "Unauthorized" on recording an outcome is a data problem, as XX35 suspected.** `verifyTutorIdentity` compares `profiles.tutor_name` to `bookings.tutor_name` as exact strings. Any mismatch — a profile with no `tutor_name`, or a booking created under a differently-spelled name — is a 403 for the tutor whose lesson it plainly is. This is the name-as-key flaw in `docs/MULTI-SUBJECT-DESIGN.md` §2 showing up in the permission layer; the fix is tutors keyed by id, not a frontend change.

---

## Epic 8 — Signup incident, 2026-08-02

A parent booked a free consultation at 18:40, tried to create her account at 18:41, and was still locked out at 18:44. Reconstructed from the Supabase auth logs and the database rather than guessed. Everything below is what actually happened, in order.

| Time (UTC) | Event | Result |
|---|---|---|
| 18:40:56 | Consultation booked, Mathematics | ✅ `students` + `bookings` rows created, `parent_email` = her iCloud address |
| 18:41:28 | Password signup, same address | ❌ `POST /auth/v1/signup` → **500** |
| 18:41:42 | Retried | ❌ 500 again |
| 18:42:54 | Signed in with Google, **school address** | ✅ authenticated, `role = 'pending'` |
| — | Landed back on `/login` | ❌ blank form, no message |

### 🔴 SCRUM-XX44 — Signup returns 500: the confirmation email cannot be sent — **CONFIG, blocks every new signup**
Type: Bug · Priority: **Highest** · Owner: **manual, site owner**

The auth log gives the cause verbatim:

> `gomail: could not send email 1: 550 "You can only send testing emails to your own email address (azeemomar-mufti@outlook.com). To send emails to other recipients, please verify a domain at resend.com/domains"`

The project's SMTP is a Resend account with **no verified sending domain**, so Resend accepts mail to the owner's address and refuses every other recipient. Supabase treats the failed send as a failed signup, answers 500, and rolls the user back — which is why neither of her two attempts left an account behind. **No password signup by any member of the public can currently succeed.** Google sign-in is unaffected because it sends no email, which is exactly why that was the only route that worked.

**Fix (either, and the first is the right one):**
1. Verify `seedsinstitute.co.uk` at resend.com/domains (DNS records), then set Supabase → Project Settings → Authentication → SMTP to send from that domain. This is also the prerequisite for SCRUM-XX7's branded templates.
2. Or, as a stopgap: Supabase → Authentication → Providers → Email → turn **Confirm email** off, so signup no longer depends on mail delivery. Faster, but every account is then unverified — acceptable only because admin approves each one by hand anyway.

**AC:** A stranger can create an account with a password.

### ✅ SCRUM-XX45 — The signup error was a dead end, and leaked a personal email address
Type: Bug · Priority: Highest · Status: **Fixed (2026-08-02)**
Two separate faults in how the 500 above reached the screen. `supabase-js` surfaces the upstream text, so the red box on a public page was capable of printing the **site owner's personal email address** at a stranger. And it offered no next step, so the natural move was to retry — which, once the SMTP problem is fixed, fails with "already registered" and locks a family out of an account they did create.

`signupErrorMessage()` now maps each failure to advice: a send failure says it's our fault and points at Google, an existing account points at sign-in and password reset, a rate limit says wait. Every message carries a "Go to sign in →" link. The raw text and the status code never render.

Also: the profile upsert and the `/api/leads` POST are now best-effort. Either failing used to fail the whole signup **after the account already existed** — and `/api/leads` rate-limits at 3/hour per email, so a family who retried once could destroy an otherwise perfect signup.
**AC:** No signup failure ends without a next step, and no upstream text reaches the page. ✔

### ✅ SCRUM-XX46 — Google sign-in "doesn't work": a pending account landed on a blank form
Type: Bug · Priority: Highest · Status: **Fixed (2026-08-02)**
Google sign-in worked perfectly at the auth layer — the log shows the redirect and a 200, and the account exists. But `handle_new_user` gives every OAuth signup `role = 'pending'`, and `app/login/page.js`'s session effect only redirected when the role was *not* pending. A pending user therefore fell off the end of it: signed in, no redirect, no message, back at an empty login form. Indistinguishable from "Google is broken", and it hits **every new Google user**.

Now shows an approval-pending panel naming the address they signed in with, plus "Use a different account". The password path shows the same panel instead of a red error — being unapproved is not the person's mistake.
**AC:** No sign-in that succeeds can look like one that failed. ✔

### 🆕 SCRUM-XX47 — A booking made with one email and an account made with another never meet
Type: Bug · Priority: High
The backend links a booking to an account by matching `students.parent_email` to the login email, and nothing else. She booked with iCloud and signed in with her school Google account, so her consultation will not appear in her portal even after approval — with no message anywhere saying why.

Mitigated in the UI (2026-08-02): the signup form now flags the prefilled address as the one to keep, and the pending panel tells them to contact us if they used a different one. **The real fix is backend**: let an approved account claim a booking by verified email, or let admin re-point a `students` row at another address.
**AC:** A family who signs in with a different address can still reach their booking.

### 🆕 SCRUM-XX48 — Some Google accounts were provisioned straight to `role = 'student'`
Type: Bug · Priority: Medium · Security-adjacent
Three of the accounts in `profiles` hold `role = 'student'` from a Google sign-in with no approval step. They pre-date the `default_new_signups_to_pending` migration, which now defaults new signups to `pending`, so this is historical rather than ongoing. Worth an audit of existing rows, and worth confirming no other path can self-provision `student`.
**AC:** Every account holding a portal role was approved by a human.

---

## Epic 9 — Multi-subject and multi-tutor, across all three portals

Requested 2026-08-02. This is SCRUM-XX38 broken into buildable pieces. The design is `docs/MULTI-SUBJECT-DESIGN.md`; §2 explains why the current fields cannot carry it, and §7 lists the prerequisites. **The database work has to land first** — a "second subject" control built on today's single `subject` / `assigned_tutor` string fields would overwrite the first one, so it would take a family who asked for Maths *and* Arabic and quietly leave them with one.

### 🆕 SCRUM-XX49 — `enrolments` table and migration — **prerequisite for everything below**
Type: Story · Priority: Highest · Backend/database
One row per student × subject × level × tutor × rate × status, per the design §2. Existing students migrate to one enrolment each from their current `subject` + `assigned_tutor`; the old columns stay as read-only mirrors until every screen has moved. Bookings gain `enrolment_id`.
**AC:** One student can hold two enrolments with two tutors, and nothing existing breaks.

### 🆕 SCRUM-XX50 — Tutors keyed by id, not name
Type: Story · Priority: Highest · Backend/database
`bookings.tutor_name`, `students.assigned_tutor` and `profiles.tutor_name` are free-text names compared with `=`. This is already causing live failures — it is the cause behind SCRUM-XX35's "Unauthorized" — and it is why the tutor profile page cannot let a tutor edit their own display name.
**AC:** Renaming a tutor orphans nobody.

### 🆕 SCRUM-XX51 — `/api/enrolments` — list, create, update status, reassign tutor, set rate
Type: Story · Priority: Highest · Backend
Plus booking creation validated against an active enrolment, with the rate derived from it rather than sent by the client.
**AC:** The portals can read and write enrolments without touching `students`.

### 🆕 SCRUM-XX52 — Student portal: enrolment cards and "request another subject"
Type: Story · Priority: High · Frontend · *blocked by XX49/XX51*
Enrolments as cards (subject, level, tutor, status, rate). Lessons, progress and payments filter per subject instead of mixing. A request form creates a `pending` enrolment and notifies admin — the family asks, they do not assign themselves a tutor or a rate. Booking happens *within* an enrolment, which removes the free-text subject box that currently makes "Maths", "maths" and "GCSE Maths" three different subjects.
**AC:** A family can study two subjects and ask for a third.

### 🆕 SCRUM-XX53 — Tutor portal: students grouped by enrolment
Type: Story · Priority: High · Frontend · *blocked by XX49/XX51*
"Ibrahim (GCSE Maths)" and "Ibrahim (A-Level Further Maths)" become two rows, two progress threads and two earnings lines, because they are two different jobs. Add-lesson picks an enrolment rather than a student plus a typed subject. Tutors can flag an enrolment for reassignment; they cannot reassign themselves.
**AC:** A tutor teaching one student two subjects sees two threads.

### 🆕 SCRUM-XX54 — Admin portal: enrolment editor and the pending queue
Type: Story · Priority: Highest · Frontend · *blocked by XX49/XX51*
The control that is entirely missing today: create, edit, reassign and end an enrolment, and change subject or level (changing level changes the rate going forward, never retroactively). A queue of `pending` enrolments with no tutor — families waiting, revenue not moving — and non-standard rates with a required reason.
**AC:** Admin can change a family's subject and tutor without touching the database.
