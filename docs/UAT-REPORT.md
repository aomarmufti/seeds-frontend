# UAT Report — Consumer Journeys

**Date:** 2026-07-31 · **Target:** https://www.seedsinstitute.co.uk (production) · **Method:** headless Chromium (Playwright 1.48), desktop 1440px + mobile 375px, live network

**Summary:** 6 of 7 journeys PASS. The two FAILs are the known post-booking dead end (fixed locally, not yet deployed). Two new defects found and **fixed this session** (mobile header, favicon).

| # | Journey | Result |
|---|---|---|
| 1 | Landing page (desktop + mobile) | PASS (mobile header defect found → fixed) |
| 2 | Book-a-consultation modal | PASS (final booking untested by design) |
| 3 | Journey wizard | PASS (test lead submitted — **delete from /admin/leads**) |
| 4 | /login | PASS — known bug confirmed: no Google/signup/reset links |
| 5 | Post-booking "View in Student Portal" | **FAIL** — known bug confirmed live |
| 6 | Portal routes while logged out | PASS (correct redirects with `?next=`) |
| 7 | Performance / accessibility smoke | PASS (favicon missing → fixed) |

---

## Journey 1 — Landing page — PASS
- HTTP 200, TTFB 133 ms, full load 738 ms. All 15 sections render (hero, stats, marquee, promise, subjects, tutors with photos, methodology/faith tabs, how-it-works, parent Q&A, testimonials, journey wizard, CTA, footer).
- **Zero JS console errors, zero page errors, zero failed asset requests** on desktop and mobile.
- Mobile 375px: no horizontal overflow; all sections stack correctly.
- ~~Defect: header clipped at 375px — "Get started" CTA cut off at the viewport edge, no hamburger.~~ **FIXED (2026-07-31):** compact nav ≤600px (ghost "Student Portal" hidden — redundant with the floating Sign-in pill — smaller brand and CTA); verified `btnRight=359 < vw=375`, no overflow.

## Journey 2 — Consultation booking modal — PASS
- Opens from hero CTA; tutor selection works (3 tutors + "No preference").
- Scheduling link fetched from backend (200); Cal.com embed (`cal.eu/…/15min`) fully loads — real calendar, real available slots (Mon–Fri, 9:00–16:45).
- Day + slot selection → attendee form; empty-submit validation works ("This field is required"), no stray booking POST.
- Untested by design: completing a real booking (would create a calendar event + emails). Note: a Cal.com temporary slot hold was created while probing; auto-expires, no event/emails.
- Minor: backend cold-start can hold "Loading availability…" for several seconds on first open (ticket SCRUM-XX31).

## Journey 3 — Journey wizard — PASS
- 5 steps gate correctly (Continue disabled until selection); Back works; email validation works.
- Valid submission → `POST /api/leads` → **201 Created** → success screen.
- **ACTION REQUIRED: test lead "UAT TEST (delete me)" / uat-test@example.com is in the leads DB — delete it from /admin/leads.**

## Journey 4 — /login — PASS, known bug CONFIRMED
- Renders; invalid credentials show a proper error.
- **Confirmed: no Google button, no signup link, no forgot-password link — zero hyperlinks on the page, not even back home.** Fixed locally (Google sign-in, signup, forgot-password, and links all added) — pending deploy.

## Journey 5 — Post-booking "View in Student Portal" — FAIL (fix pending deploy)
- Production bundle literally contains `onClick:()=>{…,push("/login")}` — no state carried. Confirmed in the deployed JS.
- Local fix routes to `/signup?email=…&name=…`, but `/signup` is currently 404 in production. **Deploy the signup page and the BookingModal fix together.**

## Journey 6 — Portal auth redirects — PASS
`/student/lessons`, `/tutor/schedule`, `/admin/leads` all redirect to `/login?next=<original>` while logged out.

## Journey 7 — Performance & accessibility smoke — PASS
- ~1.18 MB / 27 requests; FCP 1049 ms — fast.
- `lang="en-GB"` ✔, meta description ✔, single `<h1>` ✔, tutor photo `alt`s ✔.
- ~~Defect: `/favicon.ico` 404, no icon link.~~ **FIXED (2026-07-31):** `app/icon.svg` added (Seed mark on navy); verified `<link rel="icon">` is served.

---

## Confirmed defects (severity-ranked for a prospective paying parent)

1. **HIGH — Post-booking dead end** — fixed locally, **blocked on deploy** (Journey 5).
2. **HIGH — No account-creation/recovery path on /login** — fixed locally, **blocked on deploy** (Journey 4).
3. ~~MEDIUM — Mobile header clipped at 375px~~ — **FIXED, verified.**
4. ~~LOW — Missing favicon~~ — **FIXED, verified.**
5. **LOW — Availability cold-start delay** on first modal open — open (SCRUM-XX31).

**Not covered (needs seeded test accounts):** logged-in student/tutor/admin portal journeys end-to-end, real Cal.com booking completion, Stripe payment, Google OAuth round-trip (needs Supabase dashboard config first). Recommended next: SCRUM-XX26 auth e2e regression with seeded accounts.
