// Client-side routing, against the Next.js routes (SCRUM-34, rewritten for
// SCRUM-XX25).
//
// The original spec asserted on the legacy overlay's hash routes
// (`/#/tutor/tp-earnings` + `#tp-overlay.tp-open`). The Next.js app has real
// paths, so the same three properties are checked against those instead: a
// portal page has its own URL, the back button moves between pages rather
// than leaving the site, and the URL a signed-out visitor asks for is
// remembered and honoured after they sign in — without ever being what grants
// them access.
const { test, expect } = require('@playwright/test');
const { signIn, stubBackend, expectPortalReady } = require('./support/portal');

const TUTOR_BOOKINGS = { recentBookings: [] };

async function stubTutorBackend(page) {
  await stubBackend(page, {
    'resource=my-tutor-bookings': TUTOR_BOOKINGS,
    '/api/payouts': [],
  });
}

test.describe('Client-side routing', () => {
  test('each portal page gets its own URL', async ({ page }) => {
    await stubTutorBackend(page);
    await signIn(page, { role: 'tutor', fullName: 'Suleiman', tutorName: 'Suleiman', next: '/tutor/schedule' });
    await expectPortalReady(page, 'Schedule');

    const seen = new Set([new URL(page.url()).pathname]);

    for (const item of await page.locator('.sidebar .nav-item').all()) {
      const href = await item.getAttribute('href');
      if (!href || !href.startsWith('/tutor/')) continue;
      await item.click();
      await page.waitForURL(`**${href}`, { timeout: 15000 });
      seen.add(new URL(page.url()).pathname);
    }

    // Moving between sidebar pages has to be visible in the address bar —
    // that is the whole point; these were indistinguishable before SCRUM-34.
    expect(seen.size).toBeGreaterThan(1);
  });

  test('back navigates between portal pages instead of leaving the site', async ({ page }) => {
    await stubTutorBackend(page);
    await signIn(page, { role: 'tutor', fullName: 'Suleiman', tutorName: 'Suleiman', next: '/tutor/schedule' });
    await expectPortalReady(page, 'Schedule');

    await page.goto('/tutor/earnings');
    await expectPortalReady(page, 'Earnings');

    await page.goBack();
    await page.waitForURL('**/tutor/schedule', { timeout: 15000 });
    // Still inside the portal — back moved a page, it did not exit the app.
    await expectPortalReady(page, 'Schedule');
  });

  test('a portal deep link does not open the portal for a signed-out visitor', async ({ page }) => {
    // The security property. The URL names a page; it must never be the thing
    // that grants access to it.
    await stubBackend(page);
    await page.route('**/auth/v1/**', (route) =>
      route.fulfill({ status: 401, json: { message: 'no session' } }));

    await page.goto('/admin/leads');
    await page.waitForURL(/\/login/, { timeout: 15000 });

    await expect(page.locator('.page-hd h1')).toHaveCount(0);
    await expect(page.locator('#lg-email')).toBeVisible();
  });

  test('signing in restores the page named in a deep link', async ({ page }) => {
    await stubTutorBackend(page);

    // Arrive on a tutor URL while signed out, then sign in: the app sends you
    // to /login?next=… and returns you to exactly what you asked for.
    await page.goto('/tutor/earnings');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(decodeURIComponent(page.url())).toContain('next=/tutor/earnings');

    await signIn(page, {
      role: 'tutor', fullName: 'Suleiman', tutorName: 'Suleiman', next: '/tutor/earnings',
    });
    await expectPortalReady(page, 'Earnings');
    expect(page.url()).toContain('/tutor/earnings');
  });
});
