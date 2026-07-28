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
//
// SCRUM-68/69 (payment-status badges, follow-up trial lesson booking) were
// filed from gaps found while writing this file, then closed below/in
// index.html. The trial-booking test below covers SCRUM-69's acceptance
// criteria: the option is offered only when eligible, and resolves to the
// tutor's own cal_trial_link (distinct from cal_consultation_link) — the
// Cal.com migration (each tutor gets their own account with unlimited free
// event types) restored this per-context distinction that Calendly's
// single-shared-link workaround (SCRUM-67) had collapsed away.
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
  //
  // onboarding_complete: true avoids a real race — spCheckOnboarding() (see
  // index.html) fires after login and, on a falsy value, opens a full-screen
  // welcome modal (#sp-welcome-modal) that intercepts clicks anywhere on the
  // page until dismissed. Every test in this file used to be exposed to that
  // race depending on exact timing; surfaced as a flaky failure on the
  // Payments test and a consistent one on the trial-booking test once
  // those started clicking through the portal shortly after login.
  await page.route('**/rest/v1/profiles*', async (route) => {
    await route.fulfill({ json: { role, full_name: fullName, tutor_name: null, onboarding_complete: true } });
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

  test('SCRUM-68: upcoming bookings show distinct payment-status badges', async ({ page }) => {
    await mockSupabaseAuth(page);
    await page.route('**/api/analytics?resource=my-bookings*', (route) => route.fulfill({
      json: { recentBookings: [
        { id: 'b1', tutorName: 'Suleiman', subject: 'Physics', startTime: new Date(Date.now() + 86400000).toISOString(), status: 'confirmed', paymentStatus: 'paid' },
        { id: 'b2', tutorName: 'Azeem Omar-Mufti', subject: 'Maths', startTime: new Date(Date.now() + 2 * 86400000).toISOString(), status: 'confirmed', paymentStatus: 'failed' },
        { id: 'b3', tutorName: 'Suleiman', subject: 'History', startTime: new Date(Date.now() + 3 * 86400000).toISOString(), status: 'confirmed', paymentStatus: null },
      ] },
    }));
    await page.route('**/api/billing?resource=billing-history*', (route) => route.fulfill({ json: { batches: [] } }));
    await page.route('**/api/leads?email=*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/lifecycle?resource=progress*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/lifecycle?resource=homework*', (route) => route.fulfill({ json: [] }));

    await page.goto('/');
    await page.locator('#portal-launch-btn').click();
    await page.locator('#lg-email').fill('student@example.com');
    await page.locator('#lg-password').fill('correct-horse-battery');
    await page.locator('#lg-enter').click();
    await expect(page.locator('#portal-overlay')).toBeVisible();

    // Same paymentStatus field and badge meaning as the admin panel's
    // adRenderBookings — just surfaced to the student for the first time.
    await expect(page.locator('.p-lesson .sp-pay-badge')).toHaveText(['Paid', 'Failed', 'Unbilled']);
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

  test('Progress and Homework tabs render real data from lifecycle endpoints', async ({ page }) => {
    await mockSupabaseAuth(page);
    await page.route('**/api/analytics?resource=my-bookings*', (route) => route.fulfill({ json: { recentBookings: [] } }));
    await page.route('**/api/billing?resource=billing-history*', (route) => route.fulfill({ json: { batches: [] } }));
    await page.route('**/api/leads?email=*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/lifecycle?resource=progress*', (route) => route.fulfill({
      json: [{ subject: 'Physics', percent: 62, target_grade: '8', current_grade: '6' }],
    }));
    await page.route('**/api/lifecycle?resource=homework*', (route) => route.fulfill({
      json: [{ id: 'hw1', title: 'Chapter 4 problem set', subject: 'Physics', tutor_name: 'Suleiman', completed: false, due_date: null }],
    }));

    await page.goto('/');
    await page.locator('#portal-launch-btn').click();
    await page.locator('#lg-email').fill('student@example.com');
    await page.locator('#lg-password').fill('correct-horse-battery');
    await page.locator('#lg-enter').click();
    await expect(page.locator('#portal-overlay')).toBeVisible();

    await page.locator('.p-nav-item', { hasText: 'Progress' }).click();
    await expect(page.locator('#sp-progress-cards .psc-name')).toHaveText('Physics');

    await page.locator('.p-nav-item', { hasText: 'Homework' }).click();
    await expect(page.locator('#sp-homework-container .p-hw-title')).toHaveText('Chapter 4 problem set');
  });

  test('Payments tab shows billing cycle, outstanding balance, payment history and saved cards', async ({ page }) => {
    await mockSupabaseAuth(page);
    await page.route('**/api/analytics?resource=my-bookings*', (route) => route.fulfill({
      json: { recentBookings: [{ id: 'b1', tutorName: 'Suleiman', subject: 'Physics', startTime: new Date().toISOString(), status: 'confirmed', stripeCustomerId: 'cus_test123' }] },
    }));
    await page.route('**/api/billing?resource=billing-cycle*', (route) => route.fulfill({ json: { billingCycle: 'monthly' } }));
    await page.route('**/api/billing?resource=billing-history*', (route) => route.fulfill({
      json: { batches: [
        { status: 'paid', cycle: 'monthly', totalPence: 12000 },
        { status: 'payment_link_sent', cycle: 'monthly', totalPence: 4500, paymentLink: 'https://pay.example/x' },
      ] },
    }));
    await page.route('**/api/billing?resource=payment-methods*', (route) => route.fulfill({
      json: [{ id: 'pm_1', brand: 'visa', last4: '4242', expMonth: 8, expYear: 2028 }],
    }));
    await page.route('**/api/leads?email=*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/lifecycle?resource=progress*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/lifecycle?resource=homework*', (route) => route.fulfill({ json: [] }));

    await page.goto('/');
    await page.locator('#portal-launch-btn').click();
    await page.locator('#lg-email').fill('student@example.com');
    await page.locator('#lg-password').fill('correct-horse-battery');
    await page.locator('#lg-enter').click();
    await expect(page.locator('#portal-overlay')).toBeVisible();

    await page.locator('.p-nav-item', { hasText: 'Payments' }).click();

    // Billing cycle: monthly is active per the mocked response.
    await expect(page.locator('#sp-cycle-monthly')).toHaveCSS('background-color', 'rgb(13, 27, 42)');
    await expect(page.locator('#sp-cycle-weekly')).not.toHaveCSS('background-color', 'rgb(13, 27, 42)');

    // Outstanding balance card for the unpaid batch.
    await expect(page.locator('#sp-outstanding-payments')).toContainText('£45.00');
    await expect(page.locator('#sp-outstanding-payments')).toContainText('Awaiting payment');

    // Payment history: only the paid batch counts toward the total.
    await expect(page.locator('#sp-payment-history')).toContainText('Total paid: £120.00');

    // Saved card, resolved via the stripeCustomerId on the student's own booking.
    await expect(page.locator('#sp-saved-cards')).toContainText('4242');
  });

  test('logs out automatically after 30 minutes of inactivity', async ({ page }) => {
    // Regression guard: the inactivity monitor's isPortalOpen check looked
    // for '#p-overlay.p-open', which never exists for the student portal —
    // its real container is '#portal-overlay', toggled via an inline
    // display style rather than a class. So the 30-minute timeout silently
    // never fired for students, even though it already worked correctly
    // for the tutor and admin portals. Fixed alongside this test.
    await page.clock.install();
    await mockSupabaseAuth(page);
    await page.route('**/auth/v1/logout*', (route) => route.fulfill({ status: 204, body: '' }));
    await page.route('**/api/analytics?resource=my-bookings*', (route) => route.fulfill({ json: { recentBookings: [] } }));
    await page.route('**/api/billing?resource=billing-history*', (route) => route.fulfill({ json: { batches: [] } }));
    await page.route('**/api/leads?email=*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/lifecycle?resource=progress*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/lifecycle?resource=homework*', (route) => route.fulfill({ json: [] }));

    await page.goto('/');
    await page.locator('#portal-launch-btn').click();
    await page.locator('#lg-email').fill('student@example.com');
    await page.locator('#lg-password').fill('correct-horse-battery');
    await page.locator('#lg-enter').click();
    await expect(page.locator('#portal-overlay')).toBeVisible();

    // No simulated activity for 30+ minutes — the last real event was the
    // login click above, which reset the inactivity timer.
    await page.clock.fastForward('30:01');
    await expect(page.locator('#seeds-toast')).toContainText('Session expired');
  });

  test('SCRUM-69: offers a free trial lesson only once eligible (had consultation, no trial yet)', async ({ page }) => {
    await mockSupabaseAuth(page);
    await page.route('**/api/analytics?resource=my-bookings*', (route) => route.fulfill({
      json: { recentBookings: [
        { id: 'c1', tutorName: 'Suleiman', subject: 'History', lessonType: 'consultation', startTime: new Date(Date.now() - 7 * 86400000).toISOString(), status: 'completed', paymentStatus: 'free' },
      ] },
    }));
    await page.route('**/api/bookings?action=scheduling-link*', (route) => route.fulfill({ status: 404, json: { error: 'not needed for this test' } }));
    await page.route('**/api/billing?resource=billing-history*', (route) => route.fulfill({ json: { batches: [] } }));
    await page.route('**/api/leads?email=*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/lifecycle?resource=progress*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/lifecycle?resource=homework*', (route) => route.fulfill({ json: [] }));

    await page.goto('/');
    await page.locator('#portal-launch-btn').click();
    await page.locator('#lg-email').fill('student@example.com');
    await page.locator('#lg-password').fill('correct-horse-battery');
    await page.locator('#lg-enter').click();
    await expect(page.locator('#portal-overlay')).toBeVisible();

    await page.locator('.p-nav-item', { hasText: 'Calendar' }).click();
    await page.locator('button', { hasText: '+ Book lesson' }).click();
    await expect(page.locator('#sp-book-type option[value="trial"]')).toHaveText('Free trial lesson');
  });

  test('SCRUM-69: does not offer a trial lesson once the student already has one', async ({ page }) => {
    await mockSupabaseAuth(page);
    await page.route('**/api/analytics?resource=my-bookings*', (route) => route.fulfill({
      json: { recentBookings: [
        { id: 'c1', tutorName: 'Suleiman', subject: 'History', lessonType: 'consultation', startTime: new Date(Date.now() - 14 * 86400000).toISOString(), status: 'completed', paymentStatus: 'free' },
        { id: 't1', tutorName: 'Suleiman', subject: 'History', lessonType: 'trial', startTime: new Date(Date.now() - 7 * 86400000).toISOString(), status: 'completed', paymentStatus: 'free' },
      ] },
    }));
    await page.route('**/api/bookings?action=scheduling-link*', (route) => route.fulfill({ status: 404, json: { error: 'not needed for this test' } }));
    await page.route('**/api/billing?resource=billing-history*', (route) => route.fulfill({ json: { batches: [] } }));
    await page.route('**/api/leads?email=*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/lifecycle?resource=progress*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/lifecycle?resource=homework*', (route) => route.fulfill({ json: [] }));

    await page.goto('/');
    await page.locator('#portal-launch-btn').click();
    await page.locator('#lg-email').fill('student@example.com');
    await page.locator('#lg-password').fill('correct-horse-battery');
    await page.locator('#lg-enter').click();
    await expect(page.locator('#portal-overlay')).toBeVisible();

    await page.locator('.p-nav-item', { hasText: 'Calendar' }).click();
    await page.locator('button', { hasText: '+ Book lesson' }).click();
    await expect(page.locator('#sp-book-type option[value="trial"]')).toHaveCount(0);
  });
});
