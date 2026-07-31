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
- [ ] Deployed to production (www.seedsinstitute.co.uk)

## Open items / deferred (hand to next session)

- Admin: Cal.com scheduling-links editor (SCRUM-74 UI), bulk tools, health modal, payments & finance page parity
- Student: gamification widgets, group-sessions recordings panel, welcome modals
- Tutor: lesson-prep modal, post-lesson log modal, resources sharing, tax statement download
- Replace hardcoded tutor roster with roster-driven data
- Legal overlays (FAQ/Terms/Privacy) as routes
