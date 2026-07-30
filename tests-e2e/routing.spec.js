// SCRUM-34: real client-side routing.
//
// Covers the two things the ticket is actually for — a portal page has its own
// URL, and the back button moves between pages instead of leaving the site —
// plus the property that matters more than either: a route is a request, not a
// grant. Pasting an admin URL while signed out must not open the admin portal.
const { test, expect } = require('@playwright/test');

const FAKE_USER_ID = '33333333-3333-3333-3333-333333333333';

async function mockAuth(page, { role, fullName, tutorName }) {
  await page.route('**/auth/v1/token*', (route) => route.fulfill({
    json: {
      access_token: 'fake-access-token', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'fake-refresh-token',
      user: {
        id: FAKE_USER_ID, aud: 'authenticated', role: 'authenticated',
        email: 'router@example.com', app_metadata: {}, user_metadata: {},
        created_at: new Date().toISOString(),
      },
    },
  }));
  await page.route('**/rest/v1/profiles*', (route) =>
    route.fulfill({ json: { role, full_name: fullName, tutor_name: tutorName } }));
}

async function stubBackend(page) {
  await page.route('**/api/analytics*', (route) => route.fulfill({ json: { recentBookings: [] } }));
  await page.route('**/api/leads*', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/payouts*', (route) => route.fulfill({ json: [] }));
}

async function signInAsTutor(page) {
  await mockAuth(page, { role: 'tutor', fullName: 'Suleiman', tutorName: 'Suleiman' });
  await stubBackend(page);
  await page.goto('/');
  await page.locator('#portal-launch-btn').click();
  await page.locator('#lg-email').fill('router@example.com');
  await page.locator('#lg-password').fill('correct-horse-battery');
  await page.locator('#lg-enter').click();
  await expect(page.locator('#tp-overlay')).toHaveClass(/tp-open/);
}

test.describe('Client-side routing (SCRUM-34)', () => {
  test('each portal page gets its own URL', async ({ page }) => {
    await signInAsTutor(page);

    // Moving between sidebar pages has to be visible in the address bar —
    // that is the whole point: these were indistinguishable before.
    const seen = new Set();
    for (const nav of await page.locator('.tp-nav-item').all()) {
      if (!(await nav.isVisible())) continue;
      await nav.click();
      await expect.poll(() => page.url()).toMatch(/#\/tutor\//);
      seen.add(new URL(page.url()).hash);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  test('back navigates between portal pages instead of leaving the site', async ({ page }) => {
    await signInAsTutor(page);

    const navs = (await page.locator('.tp-nav-item').all()).slice(0, 2);
    test.skip(navs.length < 2, 'needs at least two sidebar pages');

    await navs[0].click();
    const first = new URL(page.url()).hash;
    await navs[1].click();
    const second = new URL(page.url()).hash;
    expect(second).not.toBe(first);

    await page.goBack();
    await expect.poll(() => new URL(page.url()).hash).toBe(first);
    // Still inside the portal — back moved a page, it didn't exit the app.
    await expect(page.locator('#tp-overlay')).toHaveClass(/tp-open/);
  });

  test('a portal deep link does not open the portal for a signed-out visitor', async ({ page }) => {
    // The security property. The URL names a panel; it must not be what grants
    // access to it. Signed out, this should land on the login screen with every
    // portal shut.
    await stubBackend(page);
    await page.route('**/auth/v1/**', (route) => route.fulfill({ status: 401, json: { message: 'no session' } }));

    await page.goto('/#/admin/ad-leads');
    await page.waitForTimeout(600);

    await expect(page.locator('#ad-overlay')).not.toHaveClass(/ad-open/);
    await expect(page.locator('#tp-overlay')).not.toHaveClass(/tp-open/);
    const studentDisplay = await page.locator('#portal-overlay')
      .evaluate((el) => getComputedStyle(el).display).catch(() => 'none');
    expect(studentDisplay).not.toBe('block');
  });

  test('signing in restores the panel named in a deep link', async ({ page }) => {
    await mockAuth(page, { role: 'tutor', fullName: 'Suleiman', tutorName: 'Suleiman' });
    await stubBackend(page);

    // Arrive on a tutor URL while signed out, then sign in: the portal opens
    // through the normal authenticated path and *then* the panel is applied.
    await page.goto('/#/tutor/tp-earnings');
    await page.locator('#portal-launch-btn').click();
    await page.locator('#lg-email').fill('router@example.com');
    await page.locator('#lg-password').fill('correct-horse-battery');
    await page.locator('#lg-enter').click();

    await expect(page.locator('#tp-overlay')).toHaveClass(/tp-open/);
    await expect(page.locator('#tp-earnings')).toHaveClass(/tp-active/);
  });
});
