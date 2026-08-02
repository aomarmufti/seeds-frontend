# Seeds Frontend — Next.js Rebuild Log

**Date:** 2026-07-31
**Goal:** Restore the legacy site's design and feature set (landing page, free-consultation booking workflow, portal calendar/Cal.com/Stripe surfaces) inside the new Next.js app (`app/`), without losing the Next.js architecture or the backend integrations already built.

**Source spec:** extracted from `legacy/` (old single-page app) — full design tokens, exact landing copy, booking workflow, and portal feature inventory. Backend (`seeds-backend-six.vercel.app`) is fully intact and unchanged; all work is frontend-only.

---

## Gap analysis (what the Next.js app was missing)

| Area | Legacy (old site) | Next.js app before this rebuild |
|---|---|---|
| Landing page | 15 sections: hero w/ proof strip, stats band, subject marquee, Seeds Promise, subjects, tutors w/ photos, how we teach, methodology/faith tabs, how it works, parent Q&A, testimonials, journey wizard, CTA, footer | Bare hero + 4 subject cards + checklist |
| "Book a free consultation" | 4-step modal: tutor → Cal.com date/time embed → details → confirm (POST /api/bookings?action=confirm) | Plain link to /login |
| Journey wizard | 5-step form → POST /api/leads | Missing |
| Student portal | Month calendar, book-lesson modal w/ Cal.com embed, Stripe add-card (Elements), billing cycle picker | List views only; no calendar, no Cal.com, no add-card |
| Tutor portal | Month calendar, add-lesson modal w/ Cal.com embed, lesson-prep modal | List views only; no calendar, no Cal.com |
| Admin portal | Stripe Connect badges, Cal.com scheduling-links editor | Stripe badges present; Cal.com link editor missing (deferred, see Open items) |

## Build plan (slices)

1. **Landing page** — all 15 sections with exact legacy copy and design tokens; tutors section with photos from `public/images/`; server components where possible.
2. **Public flows** — 4-step consultation booking modal (sandboxed Cal.com iframe, no `allow-top-navigation`, auto-advance on `bookingSuccessful` postMessage) + 5-step journey wizard → `/api/leads`.
3. **Student portal** — month calendar component (shared), book-lesson modal with Cal.com embed, Stripe Elements add-card, billing-cycle picker.
4. **Tutor portal** — month calendar on schedule page, add-lesson modal with tutor's Cal.com embed.

## Known inconsistencies carried over from legacy (flagged, not silently "fixed")

- Marketing says Zoom; actual meeting links are Google Meet.
- Contact email appears as both hello@seedstuition.co.uk and hello@seedsinstitute.co.uk.
- Tutor roster hardcoded (Azeem Omar-Mufti / Abdul-Moez / Suleiman), as in legacy.
- Stripe is in TEST mode.
- Terms/Privacy are drafts pending solicitor review (per legacy disclaimers).

---

## Completion log

- [x] Gap analysis + spec extraction from `legacy/` (2026-07-31, Kimi)
- [x] Slice 1 — Landing page (15 sections) (2026-07-31, Kimi: app/page.js + app/landing.css + components/landing/*; exact legacy copy & tokens; tutors via next/image)
- [x] Slice 2 — Consultation booking modal + journey wizard (2026-07-31, Kimi: components/booking/BookingModal.jsx, components/landing/JourneyWizard.jsx; sandboxed Cal.com iframe without allow-top-navigation; journey POST failures now surface an error instead of being swallowed)
- [x] Slice 3 — Student portal: calendar, book-lesson, Stripe add-card, billing cycle
- [x] Slice 4 — Tutor portal: calendar, add-lesson (2026-07-31, Kimi: app/tutor/schedule/page.js MonthCal + day list; components/tutor/AddLessonModal.jsx with tutor Cal.com embed + recurring weeks)
- [x] Production build green (19/19 static pages, 2026-07-31)
- [x] Deployed to production (www.seedsinstitute.co.uk) — commit 49b5b75, Vercel build succeeded, landing verified live (2026-07-31)
- [x] Auth restoration — Google sign-in on /login (signInWithOAuth → redirect back to /login, `?next=` preserved; legacy lg-google-btn look), signup page ported from lgSignup (role:'pending' metadata + profiles upsert + /api/leads goal 'Student signup'), forgot-password + set-password pages (resetPasswordForEmail → PASSWORD_RECOVERY → updateUser with hasPassword flag; Google sessions excluded from forced set-password). 2026-07-31, Kimi: app/login/page.js, app/signup/page.js, app/forgot-password/page.js, app/set-password/page.js, auth CSS in app/globals.css
- [x] Booking → signup → portal journey — BookingModal "View in Student Portal" now routes to /signup?email=…&name=… (prefilled with the booking email, which is what the backend matches on to link the consultation), and the signup success screen tells the parent their consultation appears after approval. 2026-07-31, Kimi: components/booking/BookingModal.jsx
- [x] Production build green after auth work (22/22 static pages, 2026-07-31)
- [x] Live-site UAT (2026-07-31, Kimi: docs/UAT-REPORT.md) — 6/7 consumer journeys pass; confirmed the two auth dead ends live (fixed locally); journey wizard lead POST returns 201. Left one test lead "UAT TEST (delete me)" / uat-test@example.com in /admin/leads — DELETE IT.
- [x] UAT defect fixes — mobile header clipped at 375px (compact nav ≤600px in app/landing.css; ghost portal button hidden, redundant with floating Sign-in pill) + missing favicon (app/icon.svg, Seed mark on navy). Both verified in headless Chromium at 375px; build green. 2026-07-31, Kimi
- [x] Docs delivered (2026-07-31, Kimi): docs/UX-REVIEW.md (holistic design review + feature ideas + P0–P3 priorities), docs/MARKETING-STRATEGY.md (3-tier acquisition plan + 30-day sequence), docs/JIRA-TICKETS.md (32-ticket backlog, SCRUM-XX placeholders)
- [x] MANUAL (Supabase dashboard): Google provider enabled with Client ID/Secret from Google Cloud Console (OAuth client redirect URI = Supabase callback URL `…/auth/v1/callback`); `/login` and `/set-password` added to Redirect URLs. Google sign-in verified working live by the site owner (2026-08-01).
- [x] Deployed to production — commit ba6364c pushed to main, Vercel auto-deploy verified live (2026-07-31): /signup, /forgot-password, /set-password all 200; Google button + Forgot/Create-account links confirmed rendered on /login via headless Chromium; favicon served; mobile header fix confirmed live at 375px (btnRight 359 < vw 375).

- [x] SCRUM-XX11/XX12/XX13 — P0 legal & trust baseline (2026-08-01): `/terms`, `/privacy`, `/faqs` and `/tutors/[slug]` as real routes seeded from the legacy overlays; nav + footer extracted to `components/site/` (SiteHeader/SiteFooter/SeedLogo/SiteFonts/ContentPage) so content pages keep the brand chrome; every dead `<span>` in the footer and on the subject/tutor cards now navigates; all Zoom copy corrected to Google Meet (incl. pill colours); one contact domain (`hello@seedsinstitute.co.uk`) sourced from the new `lib/site.js`. Build green, 29/29 static pages; routes smoke-tested 200 and no horizontal overflow at 375px.

- [x] SCRUM-XX8 — Pricing section on the landing page (2026-08-01): three cards driven by `lib/site.js` (GCSE £40 / A-Level £45 featured / group £20), what's-included lists, pay-per-lesson + sibling-discount + cancellation notes, MyTutor price anchor; nav and footer entry points. Build green (29/29); no horizontal overflow at 375px.

- [x] SCRUM-XX23 (today dashboard) — `/admin/today` as the admin landing screen (2026-08-01): today's lessons, awaiting approval, unrecorded outcomes, amount not yet charged, new enquiries — all from endpoints the portal already calls. Finance-page parity and SCRUM-74 remain open.
- [x] SCRUM-XX14 (capture half) — Lead-magnet email capture in the footer (2026-08-01): exam board + email → /api/leads as an ordinary lead, so it appears in /admin/leads with no backend change. The nurture email sequence itself is still outstanding.
- [x] SCRUM-XX18 — Student portal consultation state + add-to-calendar (2026-08-01): consultations named as consultations rather than shown as a generic "Lesson"; Google Calendar + .ics links on the lead card (`lib/calendar.js`, generated in the browser, no backend change); empty state now explains the approval gap instead of implying nothing is booked.
- [x] SCRUM-XX25 — Stale e2e specs rewritten against the Next.js routes (2026-08-01): student/tutor/admin portal + routing specs on a shared mocked-auth harness; suite green end to end (43 passed). Coverage for the un-ported Cal.com scheduling-links editor deliberately not faked — it returns with the screen (SCRUM-74).
- [x] SCRUM-XX9/XX10 — Funnel CTAs unified and the free offer named once (2026-08-01): booking modal is the single primary CTA (nav button now opens it instead of jumping to the wizard); journey wizard demoted to "Not ready to book?" throughout, including its own section heading. Offer standardised to "free consultation (15-min call) → free trial lesson (30 min)" across hero, how-it-works, journey steps, CTA section and the booking modal. Build green; homepage/consultation-wizard/routes specs green (22 passed) after updating two label assertions.

- [x] SCRUM-XX43 — Tutor add-lesson sent no `studentId` (2026-08-02): the roster mapping threw the id away, so the backend's tutor path ("studentId required" — it resolves a student by id or not at all) rejected every roster student. Ids now carried through from both sources and sent on submit; the student modal is correct as-is and documented as such. Pinned by an e2e test asserting the POST body.

- [x] SCRUM-XX39/XX40 — Student and tutor profile pages (2026-08-02): `/student/profile` and `/tutor/profile`, plus a Profile item in both sidebars. Saving is real, not stubbed — `profiles` carries RLS policies for select/update on `id = auth.uid()`, so a person editing their own row needed no backend endpoint. `lib/profile.js` holds the writable-field whitelist per role and the reasons for every omission; `components/profile/fields.jsx` makes an editable field and a read-only one look different, so nobody types into something that was never going to persist. Commercial fields (subject, level, assigned tutor) and the tutor's display name stay read-only with the reason on the page — the display name is the string the backend matches to authorise a tutor against their own bookings.

- [x] SCRUM-XX41/XX42 — investigated against the backend schema; both are backend, and the second has a prerequisite nobody had logged (2026-08-02). XX41: the *cancelled* half already worked, by accident — the calendar page's display filter was carrying a commercial rule — so the rule moved into `lib/lessons.js`; the reported half (a no-show burns the trial) is enforced by a unique index the frontend cannot reach. XX42: a group session cannot have a second attendee at all (gist exclusion constraint on tutor+time), so "N refunds" has no N; logged as SCRUM-XX42a. Neither has an honest frontend slice; nothing was built to look like progress.

- [x] SCRUM-XX42a — group-session booking option withdrawn (2026-08-02): removed from `components/student/BookLessonModal.jsx` and `components/tutor/AddLessonModal.jsx` at the site owner's direction, because the schema cannot produce a group session with a second attendee. Rendering of existing group bookings is deliberately untouched. The landing pricing tier, `/faqs#group-sessions` and `/terms` still advertise it — flagged in the ticket as a commercial decision rather than changed unilaterally.

## e2e suite status (2026-08-01)

**60 passed / 0 failed** (50, plus the XX43 regression test, four profile specs, three free-lesson eligibility specs and two pinning the withdrawn group option). The 23 stale specs that targeted the legacy overlay DOM (`#portal-overlay`, `#tp-overlay`, `#ad-overlay`, `#lg-error`) have been rewritten against the Next.js routes (SCRUM-XX25). They now share `tests-e2e/support/portal.js`, which stubs Supabase's token endpoint and signs in through the real login form rather than hand-writing a session into localStorage, and installs a catch-all backend stub so no spec can reach the live deployment.

## Open items / deferred (hand to next session)

- Magic-link sign-in tab from the legacy overlay was deliberately NOT ported (out of scope for the auth restoration)
- New from UX review + UAT (2026-07-31; full detail in docs/UX-REVIEW.md, tickets in docs/JIRA-TICKETS.md): pricing page (SCRUM-XX8), unify funnel CTAs (XX9), standardise free-offer terminology (XX10), Zoom-vs-Meet copy fix (XX12), single email domain (XX13), booking-modal availability cold-start (XX31), seeded test accounts for portal UAT (XX32), Stripe live-mode cutover (XX21)
- Admin: Cal.com scheduling-links editor (SCRUM-74 UI), bulk tools, health modal, payments & finance page parity (the finance page needs backend endpoints that don't exist yet)
- SCRUM-XX17 referral programme — blocked on backend (referral codes, attribution, reward ledger); a frontend-only version would look instrumented while counting nothing
- SCRUM-XX14 nurture email sequence (the capture form is live; the pack and the Resend sequence are not)
- Student: gamification widgets, group-sessions recordings panel, welcome modals
- Tutor: lesson-prep modal, post-lesson log modal, resources sharing, tax statement download
- Replace hardcoded tutor roster with roster-driven data
