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

### 🆕 SCRUM-XX9 — Unify funnel CTAs
Type: Story · Priority: High
Booking modal = single primary CTA everywhere; journey wizard demoted to secondary ("Not ready to book?"). One gold button, one ghost, per section.
**AC:** No section presents two equal-weight funnels.

### 🆕 SCRUM-XX10 — Standardise the free-offer terminology
Type: Bug (content) · Priority: High
Pick one naming/sequence (e.g. "Free consultation (15-min call) → Free trial lesson (30 min)") and replace all variants (hero "free lesson", "diagnostic lesson", etc.).
**AC:** Identical offer wording site-wide.

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

### 🆕 SCRUM-XX14 — Lead magnet + email capture
Type: Story · Priority: Medium
"Free past-paper pack by exam board" email capture (footer/exit) → nurture sequence. Captures the ~95% who don't book.
**AC:** Email capture stores a lead; welcome email sends.

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

### 🆕 SCRUM-XX17 — Referral programme
Type: Story · Priority: High
"Refer a family — both get a free lesson": unique links in student portal, tracked in backend, surfaced in admin.
**AC:** A parent can copy a referral link; conversions are attributable.

---

## Epic 4 — Portals (P2/P3)

### 🆕 SCRUM-XX18 — Student portal: "consultation booked" state + add-to-calendar
Type: Story · Priority: High
New accounts with only a consultation see it explicitly (date/time/tutor/join link) instead of "No lesson booked yet". Add iCal/Google links on confirmations.
**AC:** Post-approval, the consultation is visible and addable to calendar.

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

### 🆕 SCRUM-XX23 — Admin: payments & finance page parity + "today" dashboard
Type: Story · Priority: High
Rebuild-log open items (SCRUM-74 Cal.com link editor, bulk tools, health modal, finance page) + a daily ops screen: today's lessons, pending approvals, unbilled outcomes, failed payments.
**AC:** Ops runnable from one admin screen.

### 🆕 SCRUM-XX24 — Replace hardcoded tutor roster with roster-driven data
Type: Tech debt · Priority: Medium
Landing tutors, booking modal, prices all hardcoded — drive from backend roster.
**AC:** Adding a tutor requires no code change.

---

## Epic 5 — Quality & Tech Debt

### 🆕 SCRUM-XX25 — Rewrite 23 stale e2e specs against Next.js routes
Type: Task · Priority: High
Old suite targets legacy overlay DOM (`#portal-overlay` etc.); red since before the rebuild. Rewrite against real routes, incl. the new auth pages.
**AC:** `npm run test:e2e` green against production build.

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
