const { test, expect } = require('@playwright/test');

// Known console noise this assertion must not flag as a regression:
//
// 1. Network-isolated dev sandbox artifacts — outbound calls to the real
//    Supabase CDN/backend genuinely can't succeed in a sandbox with no
//    internet access (this sandbox's HTTPS proxy returns some blocked
//    cross-origin requests as a connection failure, others as a bare
//    404). Not present in CI or production, both of which have real
//    internet access; confirmed via a full response-status audit against
//    the local static server that no *local* asset ever 404s.
//    "supabase is not defined" is the downstream symptom of the Supabase
//    JS client's own CDN script failing to load for the same reason.
// 2. Calendly's widget.js itself — confirmed via a real CI run's full
//    stack trace (assets.calendly.com/assets/external/widget.js
//    parseOptions) that it throws internally during its own auto-init on
//    a page load where no Calendly embed is actively open yet (the
//    wizard's #bk-calendly-embed only gets used once step 2 is reached).
//    This is inside Calendly's own script, not ours — it fires in
//    production too, just unnoticed since no one has devtools open.
const KNOWN_THIRD_PARTY_NOISE = [
  /net::ERR_/,
  /the server responded with a status of 404/,
  /supabase is not defined/,
  /assets\.calendly\.com/,
];

test.describe('Public homepage', () => {
  test('loads with no console errors and key marketing sections present', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const loc = msg.location();
      consoleErrors.push(`${msg.text()} (at ${loc.url}:${loc.lineNumber}:${loc.columnNumber})`);
    });
    page.on('pageerror', (err) => consoleErrors.push(`${err.message}\n${err.stack || ''}`));

    await page.goto('/');
    await expect(page).toHaveTitle(/Seeds/i);

    // Tutor cards from the marketing page — real content, not lorem.
    await expect(page.getByText('Azeem Omar-Mufti').first()).toBeVisible();
    await expect(page.getByText('Suleiman').first()).toBeVisible();
    await expect(page.getByText('Abdul-Moez').first()).toBeVisible();

    // The wizard's entry point — this is the one and only booking CTA on
    // the public site (SCRUM-52 follow-up: no paid lesson type is offered
    // here any more).
    await expect(page.getByRole('link', { name: /Book a Free Consultation/i }).first()).toBeVisible();

    const realErrors = consoleErrors.filter((e) => !KNOWN_THIRD_PARTY_NOISE.some((re) => re.test(e)));
    expect(realErrors, `Unexpected console errors:\n${realErrors.join('\n')}`).toEqual([]);
  });

  test('opens the booking wizard with only the free Initial Consultation offered', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Book a Free Consultation/i }).first().click();
    await expect(page.locator('#bk-step-1')).toBeVisible();

    // Regression guard for SCRUM-52/55: the public wizard must never offer
    // a paid lesson type, only the free consultation.
    await expect(page.locator('.bk-type-card')).toHaveCount(1);
    await expect(page.locator('.bk-type-card')).toContainText('Initial Consultation');
    await expect(page.locator('.bk-type-card')).toContainText('Free');
  });

  test('SCRUM-70: tutor cards stack vertically on a mobile viewport, no page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/#tutors');
    await page.locator('#tutors').scrollIntoViewIfNeeded();

    // Regression guard: this grid used to be a bare inline
    // grid-template-columns:repeat(3,1fr) with no mobile override, so
    // tutor photos got squeezed three-across even at phone widths.
    const columns = await page.locator('.tutors-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(1);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('SCRUM-71: the single login modal offers Google as well as email', async ({ page }) => {
    await page.goto('/');
    await page.locator('#portal-launch-btn').click();

    // One button covers student/tutor/admin alike — routing is role-driven
    // post-session, not per-button. Deliberately not asserting on the
    // actual OAuth redirect here: this sandbox has no outbound network, so
    // the real Supabase SDK (loaded from a CDN) never initializes and
    // sbClient stays undefined regardless of mocks — same limitation as
    // every other SDK-dependent test in this suite. What IS verifiable
    // without the SDK: the button exists, is visible, and is wired to the
    // right handler.
    const googleBtn = page.locator('#lg-google-btn');
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toContainText('Continue with Google');
    await expect(googleBtn).toHaveAttribute('onclick', 'lgGoogleSignIn()');
  });
});
