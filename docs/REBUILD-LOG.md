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

## e2e suite status (2026-07-31)

22 passed / 23 failed — all 23 failures are **stale pre-rebuild tests** that target the legacy overlay DOM (`#portal-overlay`, `#tp-overlay`, `#ad-overlay`, `#lg-error`) which the Next.js app never had. They were red before this rebuild and need rewriting against the real routes (see Open items). Homepage + consultation-wizard specs were updated in Slice 1/2 and pass (7/7).

## Open items / deferred (hand to next session)

- Magic-link sign-in tab from the legacy overlay was deliberately NOT ported (out of scope for the auth restoration)
- New from UX review + UAT (2026-07-31; full detail in docs/UX-REVIEW.md, tickets in docs/JIRA-TICKETS.md): pricing page (SCRUM-XX8), unify funnel CTAs (XX9), standardise free-offer terminology (XX10), Zoom-vs-Meet copy fix (XX12), single email domain (XX13), booking-modal availability cold-start (XX31), seeded test accounts for portal UAT (XX32), Stripe live-mode cutover (XX21)
- Admin: Cal.com scheduling-links editor (SCRUM-74 UI), bulk tools, health modal, payments & finance page parity
- Student: gamification widgets, group-sessions recordings panel, welcome modals
- Tutor: lesson-prep modal, post-lesson log modal, resources sharing, tax statement download
- Replace hardcoded tutor roster with roster-driven data
- Legal overlays (FAQ/Terms/Privacy) as routes
- Rewrite the 23 stale e2e specs (targeting legacy overlay DOM) against the Next.js routes
