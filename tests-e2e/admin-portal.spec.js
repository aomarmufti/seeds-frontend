// Admin portal, against the Next.js routes (SCRUM-XX25).
//
// Rewritten from the legacy #ad-overlay suite. Two of the old specs covered
// the Cal.com scheduling-links editor and the payout-cycle picker in the
// Tutors panel; the link editor has not been ported yet (SCRUM-74, still an
// open item), so that coverage is deliberately not faked here — it comes back
// with the screen.
const { test, expect } = require('@playwright/test');
const { signIn, stubBackend, expectPortalReady } = require('./support/portal');

const LEADS = [
  {
    id: 'l1', name: 'Sister Aisha', email: 'aisha@example.com',
    subject: 'Mathematics', level: 'GCSE', status: 'new',
    created_at: new Date().toISOString(),
  },
  {
    id: 'l2', name: 'Rebecca C.', email: 'rebecca@example.com',
    subject: 'Chemistry', level: 'A-Level', status: 'contacted',
    created_at: new Date().toISOString(),
  },
];

const PENDING = [
  {
    id: 'p1', full_name: 'Hassan Ali', email: 'hassan@example.com',
    role: 'pending', created_at: new Date().toISOString(),
  },
];

async function signInAsAdmin(page, { leads = LEADS, pending = PENDING } = {}) {
  await stubBackend(page, {
    '/api/leads': leads,
    'resource=accounts': [],
    'resource=pending-profiles': pending,
  });
  await signIn(page, { role: 'admin', fullName: 'Azeem Omar-Mufti', next: '/admin/leads' });
}

test.describe('Admin portal', () => {
  test('signs in and shows real lead data', async ({ page }) => {
    await signInAsAdmin(page);
    await expectPortalReady(page, 'Leads');

    expect(page.url()).toContain('/admin/leads');
    await expect(page.getByText('Sister Aisha')).toBeVisible();
    await expect(page.getByText('rebecca@example.com')).toBeVisible();
  });

  test('signups waiting on approval are called out separately from enquiries', async ({ page }) => {
    await signInAsAdmin(page);
    await expectPortalReady(page, 'Leads');

    // A pending signup is a person who cannot use anything they were promised
    // until someone acts — it does not belong buried in the enquiry list.
    await expect(page.getByText(/Awaiting approval \(1\)/)).toBeVisible();
    await expect(page.getByText('Hassan Ali')).toBeVisible();
    await expect(page.getByRole('button', { name: /approve as student/i })).toBeVisible();
  });

  test('with nothing waiting, the approval section is absent rather than empty', async ({ page }) => {
    await signInAsAdmin(page, { pending: [] });
    await expectPortalReady(page, 'Leads');
    await expect(page.getByText(/Awaiting approval \(\d+\)/)).toHaveCount(0);
  });

  test('an admin with no enquiries yet sees an honest empty state', async ({ page }) => {
    await signInAsAdmin(page, { leads: [], pending: [] });
    await expectPortalReady(page, 'Leads');
    await expect(page.getByText('No enquiries yet.')).toBeVisible();
  });

  test('the bookings page renders backend data rather than placeholder stats', async ({ page }) => {
    await stubBackend(page, {
      '/api/analytics': {
        recentBookings: [
          {
            id: 'b9', subject: 'GCSE Biology', studentName: 'Ibrahim Khan',
            tutorName: 'Abdul-Moez',
            startTime: new Date(Date.now() - 864e5).toISOString(),
            endTime: new Date(Date.now() - 864e5 + 55 * 60000).toISOString(),
            status: 'confirmed', feePence: 4000,
          },
        ],
      },
    });
    await signIn(page, { role: 'admin', fullName: 'Azeem Omar-Mufti', next: '/admin/bookings' });
    await expectPortalReady(page, 'Bookings');

    await expect(page.getByText('Ibrahim Khan').first()).toBeVisible();
    await expect(page.getByText('Abdul-Moez').first()).toBeVisible();
  });

  test('the Today screen leads with what costs money when it is missed', async ({ page }) => {
    const now = Date.now();
    // Still to come, but clamped so it stays on *today's* date however late in
    // the day this runs — a plain now+2h lands tomorrow after 22:00 and drops
    // the lesson out of the Today card.
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 0, 0);
    const todayStart = Math.min(now + 2 * 3600e3, endOfDay.getTime());
    await stubBackend(page, {
      'resource=pending-profiles': PENDING,
      '/api/leads': LEADS,
      '/api/analytics': {
        recentBookings: [
          // Happening today.
          {
            id: 'd1', subject: 'GCSE Maths', studentName: 'Ibrahim Khan',
            tutorName: 'Azeem Omar-Mufti',
            startTime: new Date(todayStart).toISOString(),
            endTime: new Date(todayStart + 55 * 60e3).toISOString(),
            status: 'confirmed', feePence: 4000,
          },
          // Taught, nobody said what happened — unbilled and unpayable.
          {
            id: 'd2', subject: 'A-Level Arabic', studentName: 'Yusuf Ahmed',
            tutorName: 'Suleiman',
            startTime: new Date(now - 864e5).toISOString(),
            endTime: new Date(now - 864e5 + 55 * 60e3).toISOString(),
            status: 'confirmed', feePence: 4500,
          },
        ],
      },
    });
    await signIn(page, { role: 'admin', fullName: 'Azeem Omar-Mufti', next: '/admin/today' });
    await expectPortalReady(page, 'Today');

    await expect(page.getByText(/Waiting on you \(1\)/)).toBeVisible();
    await expect(page.getByText(/Unrecorded outcomes \(1\)/)).toBeVisible();
    await expect(page.getByText(/Today's lessons \(1\)/)).toBeVisible();

    // The unrecorded lesson is the one named, not the one happening later today.
    await expect(page.getByText('Yusuf Ahmed')).toBeVisible();
  });

  test('/admin lands on Today rather than a list', async ({ page }) => {
    await stubBackend(page, { '/api/analytics': { recentBookings: [] }, '/api/leads': [] });
    await signIn(page, { role: 'admin', fullName: 'Azeem Omar-Mufti', next: '/admin' });
    await expectPortalReady(page, 'Today');
    expect(page.url()).toContain('/admin/today');
  });
});
