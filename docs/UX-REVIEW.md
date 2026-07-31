# Seeds — Holistic UX & Design Review

**Date:** 2026-07-31 · **Reviewer:** AI (senior product-design lens) · **Scope:** landing page, public funnels, auth, student/tutor/admin portals

**Verdict in one line:** The brand and visual craft are genuinely strong — better than most tutoring startups — but the *conversion machinery* underneath the beauty is leaking at every joint: dead links, no pricing, two competing funnels, and (until today's auth fixes) no way for a new parent to actually create an account.

---

## 1. What's working (keep doing it)

- **Distinctive brand voice.** "Excellence rooted in understanding", the faith-integrated methodology, the Al-Khwārizmī line — this is a real differentiator vs MyTutor/Tutorful. Nobody else owns this position.
- **Visual design system.** Consistent tokens (navy/gold/serif), disciplined typography (DM Serif + Inter + Cormorant), considered details (scroll progress, marquee, live-dashboard hero card). Reads "premium", which justifies premium pricing.
- **Objection handling.** The parent Q&A section answers the four real questions, including "Is Seeds only for Muslim families?" with a non-Muslim testimonial right after it — smart sequencing.
- **Proof density.** Stats band, grade-before/after rows, tutor stat cards, testimonials — the page is persuasive.
- **Portal information design.** The student lessons page leads with the *next lesson* ("the answer first"), unpaid-balance banner on top, skeleton loading states, human empty states. This is good product instincts.
- **Auth model.** Role-based portals with backend re-checks ("a URL is a request, not a grant") — the right architecture.

---

## 2. Critical conversion problems (fix first)

### 2.1 There is no pricing anywhere — anywhere
A parent can scroll the entire site and never learn what a lesson costs. This is the single biggest funnel leak after the auth bugs. Research is unambiguous: for considered purchases, hiding price doesn't increase leads, it increases *bounce from qualified buyers* and floods you with unqualified ones. The booking modal knows the prices (£40/£45/£20) but the marketing surface never says them.
**Fix:** A "Pricing" section/page: per-lesson rates by level, what's included (homework marking, monthly reports, group sessions), sibling/multi-subject discount, cancel-anytime note. Anchor against MyTutor (£25–£55/hr marketplace lottery) — premium *with a reason*.

### 2.2 Two competing funnels with no explained difference
"Book a Free Consultation" (4-step modal with live Cal.com) and "Start your journey" (5-question wizard → lead) sit side by side in the hero, the CTA section, and the nav. A parent can't tell which to pick, and you split your conversion data across two pipes.
**Fix:** One primary funnel. Recommended: keep the booking modal as the single CTA (it ends in a *scheduled call* — a far stronger commitment than a form), and demote the wizard to "Not ready to book? Answer 5 questions and we'll call you." One gold button, one ghost escape hatch, everywhere.

### 2.3 Terminology chaos in the offer itself
The site variously promises: "Free lesson" (hero), "Free diagnostic lesson, 30 minutes" (How it works step 1), "Free 15-min consultation call" (journey + CTA), "Free trial lesson" (journey step 4). Four different names, two different durations, unclear order. Parents notice fuzziness; fuzziness reads as risk.
**Fix:** One named offer, one duration, one sequence, used verbatim everywhere. E.g. **"Free consultation (15 min call) → Free trial lesson (30 min)"** — say exactly that, every time.

### 2.4 Dead ends everywhere erode the trust the design builds
- Footer: FAQs, Terms & Conditions, Privacy Policy, Group Sessions — all dead `<span>`s.
- Subjects section: "View all courses →" is a dead span.
- Tutor cards: "Profile" button does nothing.
Terms/Privacy being dead is more than UX — taking bookings and card payments without linked Terms/Privacy is a genuine legal/compliance exposure (and Stripe can ask for them).
**Fix:** route them (even a simple page reusing the legacy overlay copy, marked "draft pending solicitor review" internally — the pages themselves must be live).

### 2.5 Claims without receipts
"4.9★ Google · 120+ parent reviews", "94% improve a full grade", outcome rows, testimonials — none of it is verifiable. There's no link to a Google Business profile, no review widget, no named source. For a faith-rooted brand whose currency is *trust*, unverifiable claims cut twice as deep.
**Fix:** link the Google Business Profile; embed real reviews (even screenshots to start); soften stats to sourced statements ("based on students completing 6+ months, 2024–25").

### 2.6 Zoom vs Google Meet
Marketing says "Live 1:1 on Zoom" (hero card, how-we-teach, how-it-works); actual meeting links are Google Meet. A parent joining their first lesson notices immediately.
**Fix:** pick one (Meet is fine — arguably better, no install) and make the copy match reality.

### 2.7 The post-booking dead end (fixed today, verify)
Booking success → "View in Student Portal" → a sign-in page with no account, no signup, and nothing carried over. This was the worst journey in the product: the moment of maximum enthusiasm met a locked door. Fixed in this session (signup page, prefilled email, Google sign-in, password reset) — needs the Supabase dashboard steps done and an end-to-end test with a real email.

---

## 3. Funnel & information architecture

Current: Landing → (modal OR wizard) → ??? → admin manually approves → account → portal.

Problems:
1. **Manual approval is a silent killer for acquisition.** A parent who books a consultation Saturday night wants to log in *now*, look around, feel ownership. "Awaiting approval" with no timeline and no self-serve status page stalls the emotional momentum. Given your goal is *getting students signed up*, consider: instant student access after booking + email verification, with admin approval required only before *paid* lessons. At minimum: approval email/SMS within an SLA stated on the confirmation screen ("we'll approve your account within a few hours — usually minutes").
2. **No nurture loop for the 95% who don't book.** The wizard captures a lead; the modal captures a booking; everyone else leaves with nothing. No email capture, no lead magnet, no remarketing hook. **Fix:** a "Free GCSE/A-Level past-paper pack by exam board" email capture in the footer/exit — feeds a 5-email welcome sequence.
3. **Parent vs student identity is blurred.** The "student portal" is really the parent's portal (billing, bookings keyed to parent email) but nothing says so, and there's no multi-child support story. Siblings are the cheapest revenue you'll ever get — make "Add another child" visible in the portal.
4. **No way back.** The login page has no link home; portal topbar logo goes to `/` but there's no "contact us / help" anywhere in the portals. Add a support channel (even mailto or WhatsApp) in the sidebar footer.

## 4. Page-by-page notes

**Landing**
- Hero dashboard mock shows fake "2 Live Now" lessons. It reads well, but "Join Zoom" buttons on a marketing mock that do nothing are a micro-broken-promise; make the card clearly illustrative or non-interactive.
- Nav has no mobile menu pattern visible — verify on 375px (UAT covers this); if links collapse without a hamburger, mobile users lose Subjects/Tutors/Methodology anchors and the portal entry.
- "Start your journey" wizard is 5 steps; ensure it works fully on mobile — it's your best mobile funnel.
- Footer "Contact" uses `hello@seedstuition.co.uk` while the brand domain is `seedsinstitute.co.uk` — pick one domain and redirect the other; split domains look like a scam signal to careful parents.
- Consider moving one strong testimonial + one outcome row above the tutors section; tutors are your product and deserve the warmest possible lead-in.
- SEO: one page, no content surface. Title/meta exist but there are no indexable pages for "GCSE maths tutor [city]", exam-board pages, or blog content — see marketing doc; organic search is your cheapest channel and it currently has one door.

**Login/Auth (post-fix)**
- Add "Continue with Google" *above* the password form with a divider — parents on phones will overwhelmingly prefer it.
- After signup, show the approval-expectation copy plus "your consultation on [date] will appear here once approved" — closes the loop emotionally.
- Password-reset email branding: configure Supabase email templates so the reset/confirm emails come from Seeds, not a raw Supabase URL — another trust touchpoint.

**Student portal**
- Strong: next-lesson-first, unpaid banner, honest empty states.
- Missing: countdown/Add-to-calendar on the next lesson card; a visible "consultation booked" state for brand-new accounts (today an approved parent with only a consultation sees "No lesson booked yet — your tutor will be in touch", which undersells that *they already have something scheduled*); notification preferences; lesson recordings/library for group sessions; downloadable monthly report PDFs.
- Payments page: Stripe is in TEST mode with a hardcoded test key — fine pre-launch, but gate it behind an env var before real money.

**Tutor portal**
- Calendar + add-lesson + outcome recording is the right core. Missing per open items: lesson-prep modal, post-lesson log, resource sharing. The outcome dialog being billing-relevant is good — make sure a tutor *cannot forget* it (gentle badge/count on the nav until outcomes for past lessons are recorded), because unrecorded outcomes = unbilled revenue.
- Earnings page shows 78% share — add a "how this is calculated" expandable to preempt payout disputes.

**Admin portal**
- This is your operations cockpit as you scale: the missing pieces (Cal.com link editor, bulk tools, payments/finance parity) become urgent at ~20+ students. Prioritise the finance page — you can't run a business on bookings lists alone.
- Add a "today" dashboard: today's lessons, unapproved signups, unbilled outcomes, failed payments. One screen you open with morning coffee.

## 5. Accessibility & polish

- Replace emoji icons in functional UI (🔑 sign-in button, 🛡️ vetting) with the line-icon set used in the portals — emoji render inconsistently and read unserious on a premium brand.
- Dead `<span>` styled as links fail keyboard/screen-reader expectations — when routed, use real links.
- Ensure the booking modal and wizard trap focus and close on Escape (verify in UAT).
- Colour contrast: gold-on-white small text (`.level-pill`, stat suffixes) is likely sub-4.5:1 — darken gold for text sizes under 14px.
- Arabic verse (Quran 41:53) — check it renders RTL correctly and has `lang="ar"` + `dir="rtl"`.

## 6. Feature ideas not yet considered (roughly prioritised)

**Acquisition**
1. Pricing page (see 2.1) — non-negotiable.
2. Referral programme: "Refer a family → both get a free lesson" — tutoring spreads parent-to-parent; instrument it (unique links in the portal).
3. Lead magnet + email nurture (past-paper pack → 5-email sequence).
4. Reviews flywheel: automated post-lesson-10 email asking for a Google review; embed live reviews on the landing.
5. Exam-season landing pages ("/gcse-maths-resit", "/mock-exam-prep") for ads + SEO.
6. WhatsApp Business contact button — UK parents of school kids live on WhatsApp; lower friction than email.

**Product**
7. Multi-child parent accounts (siblings) + sibling discount engine.
8. Add-to-calendar (iCal/Google) links on every booking confirmation and in the portal.
9. Lesson reminder emails/SMS 24h + 1h before (backend has cron; verify consumer-facing reminders are on).
10. Group-session recordings library in the student portal (already promised in marketing — make it real before a parent asks).
11. Progress report PDFs matching the "monthly parent report" promise, downloadable from the portal.
12. Post-consultation diagnostic summary uploaded by tutor → visible in portal (closes the loop the consultation started).
13. In-app messaging parent↔tutor (or deliberately decide WhatsApp is the channel and deep-link it).
14. Gamification for students (streaks, syllabus-coverage map) — already in open items; good for retention, low priority vs revenue leaks.
15. Gift/loyalty: "10th lesson free" or Ramadan revision bootcamps.

**Trust/compliance**
16. Terms, Privacy, Safeguarding policy pages (live, linked).
17. DBS/safeguarding statement page — schools and careful parents look for it.
18. Consistent single email domain + professional email templates.

## 7. Suggested priority order

| Priority | Item | Why |
|---|---|---|
| P0 | Auth fixes (done today) + Supabase Google/redirect config + e2e verify | Nobody can sign up without this |
| P0 | Terms/Privacy live pages + single email domain + Zoom/Meet copy fix | Legal + trust baseline |
| P1 | Pricing section/page | Biggest remaining conversion leak |
| P1 | Unify funnel CTAs + fix offer terminology | Clarity converts |
| P1 | Google Business Profile linked + real reviews embedded | Receipts for the claims |
| P2 | Approval-flow speed/communication, post-booking portal state | Momentum at the moment of intent |
| P2 | Referral programme + lead magnet | Compounding acquisition |
| P3 | Admin finance/dashboard parity; tutor prep/log modals | Ops scale |
| P3 | Gamification, recordings library, messaging | Retention depth |
