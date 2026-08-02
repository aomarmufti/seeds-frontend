// Tutor portal, against the Next.js routes (SCRUM-XX25).
//
// Rewritten from the legacy #tp-overlay suite. The property worth protecting
// is the billing one: a finished lesson with no recorded outcome is unbilled
// revenue, so the schedule has to put those in front of the tutor rather than
// leaving them mixed into history.
const { test, expect } = require('@playwright/test');
const { signIn, stubBackend, expectPortalReady } = require('./support/portal');

const IN_3_DAYS = new Date(Date.now() + 3 * 864e5).toISOString();
const YESTERDAY_START = new Date(Date.now() - 864e5).toISOString();
const YESTERDAY_END = new Date(Date.now() - 864e5 + 55 * 60000).toISOString();

const TUTOR_BOOKINGS = {
  recentBookings: [
    {
      id: 't1', subject: 'GCSE History', studentName: 'Ibrahim Khan',
      startTime: IN_3_DAYS, endTime: IN_3_DAYS, status: 'confirmed', feePence: 4000,
    },
    // Taught yesterday, no deliveryStatus — this is the one that must be
    // chased, because until it is recorded the family is not billed.
    {
      id: 't2', subject: 'A-Level Arabic', studentName: 'Yusuf Ahmed',
      startTime: YESTERDAY_START, endTime: YESTERDAY_END, status: 'confirmed', feePence: 4500,
    },
    {
      id: 't3', subject: 'GCSE History', studentName: 'Maryam Ali',
      startTime: YESTERDAY_START, endTime: YESTERDAY_END, status: 'confirmed',
      deliveryStatus: 'delivered', feePence: 4000,
    },
  ],
};

async function signInAsTutor(page, { bookings = TUTOR_BOOKINGS, payouts = [] } = {}) {
  await stubBackend(page, {
    'resource=my-tutor-bookings': bookings,
    '/api/payouts': payouts,
  });
  await signIn(page, {
    role: 'tutor', fullName: 'Suleiman', tutorName: 'Suleiman', next: '/tutor/schedule',
  });
}

test.describe('Tutor portal', () => {
  test('signs in and shows the real schedule', async ({ page }) => {
    await signInAsTutor(page);
    await expectPortalReady(page, 'Schedule');

    expect(page.url()).toContain('/tutor/schedule');
    await expect(page.getByText('Ibrahim Khan').first()).toBeVisible();
  });

  test('a finished lesson with no outcome is chased, not buried', async ({ page }) => {
    await signInAsTutor(page);
    await expectPortalReady(page, 'Schedule');

    // One of the three lessons qualifies: taught, and no deliveryStatus.
    await expect(page.getByText(/Confirm what happened \(1\)/)).toBeVisible();
    await expect(page.getByText('Yusuf Ahmed').first()).toBeVisible();
  });

  test('an already-recorded outcome is not chased again', async ({ page }) => {
    await signInAsTutor(page, {
      bookings: {
        recentBookings: TUTOR_BOOKINGS.recentBookings.filter((b) => b.id !== 't2'),
      },
    });
    await expectPortalReady(page, 'Schedule');
    await expect(page.getByText(/Confirm what happened/)).toHaveCount(0);
  });

  test('a tutor with an empty schedule sees an honest empty state', async ({ page }) => {
    await signInAsTutor(page, { bookings: { recentBookings: [] } });
    await expectPortalReady(page, 'Schedule');
    await expect(page.getByText('Nothing booked yet. New bookings will appear here.')).toBeVisible();
  });

  test('the earnings page renders and does not offer a manual payout request', async ({ page }) => {
    await stubBackend(page, {
      'resource=my-tutor-bookings': TUTOR_BOOKINGS,
      '/api/payouts': [],
    });
    await signIn(page, {
      role: 'tutor', fullName: 'Suleiman', tutorName: 'Suleiman', next: '/tutor/earnings',
    });
    await expectPortalReady(page, 'Earnings');

    // Payouts are automatic. A "Request payout" button would be a promise the
    // backend does not keep.
    await expect(page.getByRole('button', { name: /request payout/i })).toHaveCount(0);
  });

  test('a tutor who lands on an admin URL is sent to their own portal', async ({ page }) => {
    await stubBackend(page, { 'resource=my-tutor-bookings': TUTOR_BOOKINGS });
    await signIn(page, {
      role: 'tutor', fullName: 'Suleiman', tutorName: 'Suleiman', next: '/tutor/schedule',
    });
    await expectPortalReady(page, 'Schedule');

    // A URL is a request, not a grant — signed in as a tutor, asking for the
    // admin portal lands back in the tutor's own.
    await page.goto('/admin/leads');
    await page.waitForURL(/\/tutor/, { timeout: 15000 });
    expect(page.url()).not.toContain('/admin');
  });
});
