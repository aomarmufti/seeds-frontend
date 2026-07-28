// SCRUM-64 (initial slice): tutor login through to the portal's schedule
// view, with real booking data. Same mocked-network-boundary pattern as
// student-portal.spec.js (see that file's header for the verification
// caveat — the real Supabase SDK can't load in this sandbox at all, only
// verified locally against a temporary shim; CI's e2e-local is the real
// run against the genuine SDK).
const { test, expect } = require('@playwright/test');

const FAKE_USER_ID = '22222222-2222-2222-2222-222222222222';

async function mockSupabaseAuth(page, { role, fullName, tutorName }) {
  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      json: {
        access_token: 'fake-access-token', token_type: 'bearer', expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'fake-refresh-token',
        user: {
          id: FAKE_USER_ID, aud: 'authenticated', role: 'authenticated',
          email: 'tutor@example.com', app_metadata: {}, user_metadata: {},
          created_at: new Date().toISOString(),
        },
      },
    });
  });
  await page.route('**/rest/v1/profiles*', async (route) => {
    await route.fulfill({ json: { role, full_name: fullName, tutor_name: tutorName } });
  });
}

test.describe('Tutor portal (mocked Supabase + backend)', () => {
  test('logs in and shows the real schedule on the home view', async ({ page }) => {
    // Suleiman is one of the 3 tutors with hardcoded switcher/avatar
    // branding (lgTutorMap) — using a real one here so that cosmetic path
    // is also exercised, not just the data-driven KPIs.
    await mockSupabaseAuth(page, { role: 'tutor', fullName: 'Suleiman', tutorName: 'Suleiman' });

    const now = new Date();
    const thisWeek = new Date(now.getTime() + 2 * 86400000); // still within the current week in most cases
    await page.route('**/api/analytics?resource=my-tutor-bookings*', (route) => route.fulfill({
      json: {
        recentBookings: [
          { id: 'b1', studentId: 's1', studentName: 'Student One', tutorName: 'Suleiman', subject: 'History', startTime: thisWeek.toISOString(), status: 'confirmed', feePence: 4000, paymentStatus: 'unbilled' },
          { id: 'b2', studentId: 's2', studentName: 'Student Two', tutorName: 'Suleiman', subject: 'Arabic', startTime: new Date(now.getTime() - 7 * 86400000).toISOString(), status: 'completed', feePence: 4000, paymentStatus: 'paid' },
        ],
      },
    }));
    // Secondary calls tpLoadSchedule() cascades into — stubbed empty, not
    // the focus of this test.
    await page.route('**/api/leads*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/analytics?resource=students*', (route) => route.fulfill({ json: [] }));

    await page.goto('/');
    await page.locator('#portal-launch-btn').click();
    await page.locator('#lg-email').fill('tutor@example.com');
    await page.locator('#lg-password').fill('correct-horse-battery');
    await page.locator('#lg-enter').click();

    await expect(page.locator('#tp-overlay')).toHaveClass(/tp-open/);
    // tpUpdateHomeKPIs computes these client-side from the fetched
    // bookings — real regression guard that the fetched data actually
    // reaches the KPI cards, not stale zeros.
    await expect(page.locator('#tp-kpi-lessons')).toHaveText('2');
    await expect(page.locator('#tp-kpi-students')).toHaveText('2');
  });

  // SCRUM-76: self-serve "Request payout" was removed — payouts are now
  // automatic (weekly/monthly, admin-set per tutor), so this panel is
  // read-only status rather than an amount-and-submit form.
  test('Earnings panel shows automatic payout schedule, no Request payout button', async ({ page }) => {
    await mockSupabaseAuth(page, { role: 'tutor', fullName: 'Suleiman', tutorName: 'Suleiman' });
    await page.route('**/api/analytics?resource=my-tutor-bookings*', (route) => route.fulfill({ json: { recentBookings: [] } }));
    await page.route('**/api/payouts?resource=connect-status*', (route) => route.fulfill({
      json: { connected: true, onboardingComplete: true, payoutCycle: 'monthly' },
    }));
    await page.route('**/api/payouts?tutor=*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/leads*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/analytics?resource=students*', (route) => route.fulfill({ json: [] }));

    await page.goto('/');
    await page.locator('#portal-launch-btn').click();
    await page.locator('#lg-email').fill('tutor@example.com');
    await page.locator('#lg-password').fill('correct-horse-battery');
    await page.locator('#lg-enter').click();
    await expect(page.locator('#tp-overlay')).toHaveClass(/tp-open/);

    await page.locator('.tp-nav-item', { hasText: 'Earnings' }).click();
    await expect(page.locator('#earn-payout-cycle')).toHaveText('Monthly, automatic');
    await expect(page.locator('#earn-connect-status')).toContainText('Payouts enabled');
    await expect(page.getByRole('button', { name: /Request payout/i })).toHaveCount(0);
  });

  // SCRUM-88: a finished lesson is billed to nobody and paid to nobody until
  // the tutor says what happened, so the prompt to say so has to be
  // impossible to miss — it's the tutor's own money waiting on it.
  test('SCRUM-88: finished lessons awaiting an outcome are surfaced, and marking one calls the backend', async ({ page }) => {
    await mockSupabaseAuth(page, { role: 'tutor', fullName: 'Suleiman', tutorName: 'Suleiman' });

    const now = Date.now();
    const finishedStart = new Date(now - 2 * 86400000).toISOString();
    const finishedEnd = new Date(now - 2 * 86400000 + 55 * 60000).toISOString();
    const futureStart = new Date(now + 2 * 86400000).toISOString();
    const futureEnd = new Date(now + 2 * 86400000 + 55 * 60000).toISOString();

    await page.route('**/api/analytics?resource=my-tutor-bookings*', (route) => route.fulfill({
      json: {
        recentBookings: [
          // Finished, nobody has said what happened — this is the one that
          // must be surfaced.
          { id: 'b-await', studentId: 's1', studentName: 'Student One', tutorName: 'Suleiman', subject: 'History',
            startTime: finishedStart, endTime: finishedEnd, status: 'confirmed', feePence: 4000,
            paymentStatus: 'unbilled', deliveryStatus: null },
          // Finished and already attested — settled, must not be asked about again.
          { id: 'b-done', studentId: 's2', studentName: 'Student Two', tutorName: 'Suleiman', subject: 'Arabic',
            startTime: finishedStart, endTime: finishedEnd, status: 'completed', feePence: 4000,
            paymentStatus: 'paid', deliveryStatus: 'delivered' },
          // Hasn't happened yet — must never be markable, or the endpoint
          // would just recreate the bug it exists to fix.
          { id: 'b-future', studentId: 's3', studentName: 'Student Three', tutorName: 'Suleiman', subject: 'Maths',
            startTime: futureStart, endTime: futureEnd, status: 'confirmed', feePence: 4000,
            paymentStatus: 'unbilled', deliveryStatus: null },
        ],
      },
    }));
    await page.route('**/api/leads*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/analytics?resource=students*', (route) => route.fulfill({ json: [] }));

    let markCall = null;
    await page.route('**/api/lifecycle?resource=mark-delivered*', async (route) => {
      markCall = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({ json: { success: true } });
    });

    await page.goto('/');
    await page.locator('#portal-launch-btn').click();
    await page.locator('#lg-email').fill('tutor@example.com');
    await page.locator('#lg-password').fill('correct-horse-battery');
    await page.locator('#lg-enter').click();
    await expect(page.locator('#tp-overlay')).toHaveClass(/tp-open/);

    const card = page.locator('#tp-delivery-card');
    await expect(card).toBeVisible();
    // Exactly one lesson is awaiting an answer: not the settled one, and
    // not the one that hasn't happened.
    await expect(card).toContainText('Confirm what happened (1)');
    await expect(card).toContainText('Student One');
    await expect(card).not.toContainText('Student Two');
    await expect(card).not.toContainText('Student Three');

    page.on('dialog', (d) => d.accept());
    await card.getByRole('button', { name: /Taught/ }).click();
    await expect.poll(() => markCall).not.toBeNull();
    expect(markCall).toMatchObject({ bookingId: 'b-await', outcome: 'delivered' });
  });

  test('shows a friendly error on a wrong password, without opening the tutor portal', async ({ page }) => {
    await page.route('**/auth/v1/token*', (route) => route.fulfill({
      status: 400,
      json: { error: 'invalid_grant', error_description: 'Invalid login credentials' },
    }));

    await page.goto('/');
    await page.locator('#portal-launch-btn').click();
    await page.locator('#lg-email').fill('tutor@example.com');
    await page.locator('#lg-password').fill('wrong-password');
    await page.locator('#lg-enter').click();

    await expect(page.locator('#lg-error')).toBeVisible();
    await expect(page.locator('#tp-overlay')).not.toHaveClass(/tp-open/);
  });
});
