// SCRUM-63 (initial slice): student login through to the portal home view,
// with real booking data. Everything is mocked at the network boundary —
// both the Supabase Auth/PostgREST calls the SDK itself makes, and the
// backend API calls — the same pattern proven in consultation-wizard.spec.js,
// extended here to cover an authenticated portal. This sidesteps needing a
// real seeded Supabase test project/Stripe test account (flagged as a
// blocker when this ticket was written) for the parts of the flow that are
// pure frontend logic; it does NOT touch real Supabase Auth/RLS behavior,
// which still needs a real (or branched) test project to verify.
//
// Verification note: this sandbox has no outbound network access at all
// (confirmed repeatedly this session), so the real Supabase JS SDK — itself
// loaded from a CDN — never loads here, regardless of these route mocks.
// Verified locally against a temporary local shim standing in for the SDK
// (same auth-token/profiles HTTP calls, not committed) to confirm the mock
// response shapes and every selector are correct; e2e-local in CI (real
// network) is what actually exercises this against the genuine SDK for the
// first time. Watch its first run.
const { test, expect } = require('@playwright/test');

const FAKE_USER_ID = '11111111-1111-1111-1111-111111111111';

async function mockSupabaseAuth(page, { role = 'student', fullName = 'Test Student' } = {}) {
  // The Supabase JS SDK's signInWithPassword() itself, not our own code.
  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      json: {
        access_token: 'fake-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'fake-refresh-token',
        user: {
          id: FAKE_USER_ID, aud: 'authenticated', role: 'authenticated',
          email: 'student@example.com', app_metadata: {}, user_metadata: {},
          created_at: new Date().toISOString(),
        },
      },
    });
  });
  // profiles select(...).eq('id', ...).single() — PostgREST returns a bare
  // object (not an array) for .single().
  await page.route('**/rest/v1/profiles*', async (route) => {
    await route.fulfill({ json: { role, full_name: fullName, tutor_name: null } });
  });
}

test.describe('Student portal (mocked Supabase + backend)', () => {
  test('logs in and shows the real booking data on the home view', async ({ page }) => {
    await mockSupabaseAuth(page);

    await page.route('**/api/analytics?resource=my-bookings*', (route) => route.fulfill({
      json: {
        recentBookings: [
          { id: 'b1', tutorName: 'Suleiman', subject: 'History', startTime: new Date(Date.now() + 2 * 86400000).toISOString(), status: 'confirmed', paymentStatus: 'paid' },
          { id: 'b2', tutorName: 'Azeem Omar-Mufti', subject: 'Maths', startTime: new Date(Date.now() - 7 * 86400000).toISOString(), status: 'completed', paymentStatus: 'paid' },
        ],
      },
    }));
    // Secondary calls spLoadData() also fires — not the focus of this
    // test, stubbed to empty so they don't error the page out.
    await page.route('**/api/billing?resource=billing-history*', (route) => route.fulfill({ json: { batches: [] } }));
    await page.route('**/api/leads?email=*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/lifecycle?resource=progress*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/lifecycle?resource=homework*', (route) => route.fulfill({ json: [] }));

    await page.goto('/');
    await page.locator('#portal-launch-btn').click();
    await page.locator('#lg-email').fill('student@example.com');
    await page.locator('#lg-password').fill('correct-horse-battery');
    await page.locator('#lg-enter').click();

    // The portal should open (student role) and show real data, not stale
    // defaults — 1 completed lesson, 1 upcoming, real name in the greeting.
    await expect(page.locator('#portal-overlay')).toBeVisible();
    await expect(page.locator('#p-greeting-name')).toHaveText('Test Student');
    await expect(page.locator('#sp-stat-lessons')).toHaveText('1');
    await expect(page.locator('#sp-stat-upcoming')).toHaveText('1');
  });

  test('shows a friendly error on a wrong password, without opening the portal', async ({ page }) => {
    await page.route('**/auth/v1/token*', (route) => route.fulfill({
      status: 400,
      json: { error: 'invalid_grant', error_description: 'Invalid login credentials' },
    }));

    await page.goto('/');
    await page.locator('#portal-launch-btn').click();
    await page.locator('#lg-email').fill('student@example.com');
    await page.locator('#lg-password').fill('wrong-password');
    await page.locator('#lg-enter').click();

    await expect(page.locator('#lg-error')).toBeVisible();
    await expect(page.locator('#portal-overlay')).not.toBeVisible();
  });
});
