// SCRUM-65 (initial slice): admin login through to the dashboard, plus a
// direct regression guard for the admin Tutors panel bug fixed earlier
// this session (a hardcoded fake stats card — "14 students, 4.9★, 98%
// grade lift" — sat outside its panel gate and rendered on every admin
// page load regardless of active tab). Same mocked-network-boundary
// pattern as the student/tutor portal tests — see student-portal.spec.js's
// header for the verification caveat.
const { test, expect } = require('@playwright/test');

const FAKE_USER_ID = '33333333-3333-3333-3333-333333333333';

async function mockSupabaseAuth(page) {
  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      json: {
        access_token: 'fake-access-token', token_type: 'bearer', expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'fake-refresh-token',
        user: {
          id: FAKE_USER_ID, aud: 'authenticated', role: 'authenticated',
          email: 'admin@example.com', app_metadata: {}, user_metadata: {},
          created_at: new Date().toISOString(),
        },
      },
    });
  });
  await page.route('**/rest/v1/profiles*', async (route) => {
    await route.fulfill({ json: { role: 'admin', full_name: 'Admin User', tutor_name: null } });
  });
}

test.describe('Admin portal (mocked Supabase + backend)', () => {
  test('logs in, shows real dashboard data, and never shows the old hardcoded fake tutor stats', async ({ page }) => {
    await mockSupabaseAuth(page);

    await page.route('**/api/analytics?resource=pending-profiles*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/leads?status=new*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/leads*', (route) => route.fulfill({ json: [] }));
    // The main dashboard payload — real, non-zero figures so we can tell
    // real data rendered rather than a stale/default zero.
    await page.route('**/api/analytics', (route) => route.fulfill({
      json: {
        revenue: { total: 120000, thisMonth: 40000, lastMonth: 32000 },
        monthly: {},
        byType: { gcse: 3, alevel: 1, group: 0, trial: 0, consultation: 2 },
        tutors: {},
        studentCount: 7,
        bookingCount: 12,
        recentBookings: [],
        payouts: [],
        failedPayments: [],
        reconciliation: { confirmed: 10, scheduled: 0, paymentFailed: 0, cancelled: 2, completed: 5 },
      },
    }));

    await page.goto('/');
    await page.locator('#portal-launch-btn').click();
    await page.locator('#lg-email').fill('admin@example.com');
    await page.locator('#lg-password').fill('correct-horse-battery');
    await page.locator('#lg-enter').click();

    await expect(page.locator('#ad-overlay')).toHaveClass(/ad-open/);
    const kpis = page.locator('#ad-home .ad-kpi-num');
    await expect(kpis.nth(1)).toHaveText('7');   // studentCount
    await expect(kpis.nth(2)).toHaveText('12');  // bookingCount

    // Regression guard (SCRUM-59): this exact hardcoded copy — the fake
    // admin Tutors panel stats card ("Azeem Omar-Mufti, 14 students, 98%
    // grade lift, 17 / 20 weekly hours booked") — must never appear
    // anywhere on the page, on any panel. It used to sit outside its
    // panel's tab gate and render unconditionally. (Not "98% grade lift"
    // alone — that substring coincidentally also matches real, unrelated
    // marketing copy on the public homepage's own tutor stat cards.)
    await expect(page.getByText('17 / 20 weekly hours booked')).toHaveCount(0);
  });

  test('shows a friendly error on a wrong password, without opening the admin portal', async ({ page }) => {
    await page.route('**/auth/v1/token*', (route) => route.fulfill({
      status: 400,
      json: { error: 'invalid_grant', error_description: 'Invalid login credentials' },
    }));

    await page.goto('/');
    await page.locator('#portal-launch-btn').click();
    await page.locator('#lg-email').fill('admin@example.com');
    await page.locator('#lg-password').fill('wrong-password');
    await page.locator('#lg-enter').click();

    await expect(page.locator('#lg-error')).toBeVisible();
    await expect(page.locator('#ad-overlay')).not.toHaveClass(/ad-open/);
  });
});
