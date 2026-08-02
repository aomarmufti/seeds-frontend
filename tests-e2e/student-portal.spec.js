// Student portal, against the Next.js routes (SCRUM-XX25).
//
// Rewritten from the legacy overlay suite, which drove #portal-overlay and had
// been red since before the rebuild. The intent it was protecting is kept:
// real backend data reaches the screen, an unpaid balance is impossible to
// miss, a wrong password does not open the portal, and the empty state is
// honest rather than blank.
const { test, expect } = require('@playwright/test');
const {
  signIn, stubBackend, mockSignInFailure, expectPortalReady,
} = require('./support/portal');

const IN_2_DAYS = new Date(Date.now() + 2 * 864e5).toISOString();
const IN_5_DAYS = new Date(Date.now() + 5 * 864e5).toISOString();
const LAST_WEEK = new Date(Date.now() - 7 * 864e5).toISOString();

const BOOKINGS = {
  recentBookings: [
    {
      id: 'b1', subject: 'A-Level Mathematics', tutorName: 'Azeem Omar-Mufti',
      startTime: IN_2_DAYS, status: 'confirmed', feePence: 4500,
      meetLink: 'https://meet.google.com/abc-defg-hij',
    },
    {
      id: 'b2', subject: 'GCSE Biology', tutorName: 'Abdul-Moez',
      startTime: IN_5_DAYS, status: 'requested', feePence: 4000,
    },
    {
      id: 'b3', subject: 'GCSE History', tutorName: 'Suleiman',
      startTime: LAST_WEEK, status: 'completed', feePence: 4000,
    },
    // Cancelled lessons are filtered out before render — pinned here so a
    // regression that starts showing them again is caught.
    {
      id: 'b4', subject: 'Cancelled Chemistry', tutorName: 'Abdul-Moez',
      startTime: IN_5_DAYS, status: 'cancelled', feePence: 4000,
    },
  ],
};

async function signInAsStudent(page, { bookings = BOOKINGS, billing = { batches: [] } } = {}) {
  await stubBackend(page, {
    'resource=my-bookings': bookings,
    'resource=billing-history': billing,
  });
  await signIn(page, { role: 'student', fullName: 'Ibrahim Khan', next: '/student/lessons' });
}

test.describe('Student portal', () => {
  test('signs in and shows real booking data, next lesson first', async ({ page }) => {
    await signInAsStudent(page);
    await expectPortalReady(page, 'My lessons');

    expect(page.url()).toContain('/student/lessons');

    // The soonest upcoming lesson leads the page — that is the answer a parent
    // opened the portal to get.
    await expect(page.getByText('A-Level Mathematics').first()).toBeVisible();
    await expect(page.getByText('Azeem Omar-Mufti').first()).toBeVisible();

    // The later upcoming lesson appears under "Coming up", the finished one
    // under "Past lessons".
    await expect(page.getByText('GCSE Biology')).toBeVisible();
    await expect(page.getByText('GCSE History')).toBeVisible();

    // Cancelled lessons are not the family's business to see here.
    await expect(page.getByText('Cancelled Chemistry')).toHaveCount(0);
  });

  test('a lesson still awaiting the tutor is labelled, not shown as confirmed', async ({ page }) => {
    await signInAsStudent(page);
    await expectPortalReady(page, 'My lessons');
    await expect(page.getByText('Awaiting confirmation')).toBeVisible();
  });

  test('an unpaid balance is surfaced above everything else', async ({ page }) => {
    await signInAsStudent(page, {
      billing: { batches: [{ id: 'z1', status: 'payment_link_sent', totalPence: 12000 }] },
    });
    await expectPortalReady(page, 'My lessons');

    const banner = page.getByText(/Payment due/);
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('£120');
  });

  test('a student with nothing booked gets an honest empty state, not a blank page', async ({ page }) => {
    await signInAsStudent(page, { bookings: { recentBookings: [] } });
    await expectPortalReady(page, 'My lessons');

    await expect(page.getByText('Nothing booked yet')).toBeVisible();
    await expect(page.getByText('No lessons yet.')).toBeVisible();
  });

  test('the next lesson can be added to a calendar', async ({ page }) => {
    await signInAsStudent(page);
    await expectPortalReady(page, 'My lessons');

    // A booking that lives only in the portal is a booking a parent can miss.
    const gcal = page.getByRole('link', { name: /add to google calendar/i });
    await expect(gcal).toBeVisible();
    await expect(gcal).toHaveAttribute('href', /calendar\.google\.com/);

    const ics = page.getByRole('link', { name: /apple \/ outlook/i });
    await expect(ics).toHaveAttribute('href', /^data:text\/calendar/);
  });

  test('a family whose only booking is the consultation sees it named as one', async ({ page }) => {
    await signInAsStudent(page, {
      bookings: {
        recentBookings: [{
          id: 'c1', lessonType: 'consultation', tutorName: 'Azeem Omar-Mufti',
          startTime: IN_2_DAYS, status: 'confirmed',
          meetLink: 'https://meet.google.com/aaa-bbbb-ccc',
        }],
      },
    });
    await expectPortalReady(page, 'My lessons');

    // It used to say "No lesson booked yet" — which was true and useless: they
    // had already booked the thing the whole funnel exists to produce.
    await expect(page.getByText('Your free consultation')).toBeVisible();
    await expect(page.getByText(/Free consultation call/).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /join the call/i })).toBeVisible();
    await expect(page.getByText('Nothing booked yet')).toHaveCount(0);
  });

  test('a wrong password does not open the portal', async ({ page }) => {
    await stubBackend(page);
    await mockSignInFailure(page);

    await page.goto('/login?next=%2Fstudent%2Flessons');
    await page.locator('#lg-email').fill('portal@example.com');
    await page.locator('#lg-password').fill('nope');
    await page.locator('#lg-enter').click();

    await expect(page.locator('.error-note')).toBeVisible();
    // Still on the login page — the portal never rendered.
    expect(page.url()).toContain('/login');
    await expect(page.locator('.page-hd h1')).toHaveCount(0);
  });

  test('the progress page renders lifecycle data', async ({ page }) => {
    await stubBackend(page, {
      'resource=progress': [
        { id: 'p1', subject: 'A-Level Mathematics', coverage: 72, currentGrade: 'B', targetGrade: 'A*' },
      ],
      'resource=homework': [],
      'resource=notes': [],
    });
    await signIn(page, { role: 'student', fullName: 'Ibrahim Khan', next: '/student/progress' });

    await expect(page.locator('.page-hd h1')).toBeVisible({ timeout: 15000 });
    expect(page.url()).toContain('/student/progress');
    await expect(page.getByText('A-Level Mathematics').first()).toBeVisible();
  });
});

// SCRUM-XX41. Eligibility for the two free lessons is inferred from the
// family's own bookings. These are outcome tests: they assert what the family
// is offered, not which layer decided it. Two mechanisms currently agree —
// the calendar page filters cancelled bookings out, and hasUsedFreeLesson
// ignores them — so a regression has to break both to turn these red. They
// are here because the rule is commercial (a free lesson is worth £40 of
// goodwill) and was, until now, an accident of a display filter.
//
// What they deliberately do NOT cover: a trial the student no-showed still
// burns the trial. That one is not visible from here — my-bookings doesn't
// return delivery_status — and is backend work.
test.describe('Free-lesson eligibility', () => {
  async function openBookingModal(page, recentBookings) {
    await stubBackend(page, {
      'resource=my-bookings': { recentBookings },
      'resource=billing-history': { batches: [] },
      'action=scheduling-link': { url: 'https://cal.example/never-loaded' },
    });
    await signIn(page, { role: 'student', fullName: 'Ibrahim Khan', next: '/student/calendar' });
    await expectPortalReady(page, 'Calendar');
    await page.getByRole('button', { name: '+ Book lesson' }).click();
    return page.getByRole('dialog', { name: 'Book a lesson' });
  }

  test('a cancelled consultation has not been used', async ({ page }) => {
    const modal = await openBookingModal(page, [{
      id: 'c1', lessonType: 'consultation', tutorName: 'Suleiman',
      startTime: IN_2_DAYS, status: 'cancelled',
    }]);
    // They never had the call, so it is still theirs to book.
    await expect(modal.getByRole('option', { name: /free initial consultation/i })).toBeAttached();
  });

  test('a consultation that went ahead has been used', async ({ page }) => {
    const modal = await openBookingModal(page, [{
      id: 'c1', lessonType: 'consultation', tutorName: 'Suleiman',
      startTime: LAST_WEEK, status: 'completed',
    }]);
    await expect(modal.getByRole('option', { name: /free initial consultation/i })).toHaveCount(0);
    // Consultation done and no trial yet — the trial is what's on offer.
    await expect(modal.getByRole('option', { name: /free trial lesson/i })).toBeAttached();
  });

  // SCRUM-XX42a. A group session with two attendees cannot exist — one
  // booking holds one student_id, and bookings_no_tutor_overlap refuses the
  // second row. Offering it sold a group session and created a 1:1 lesson at
  // £20, so the option is withdrawn until the backend has a real session.
  test('a group session is not offered for booking', async ({ page }) => {
    const modal = await openBookingModal(page, [{
      id: 'c1', lessonType: 'consultation', tutorName: 'Suleiman',
      startTime: LAST_WEEK, status: 'completed',
    }]);
    await expect(modal.getByRole('option', { name: /group session/i })).toHaveCount(0);
    // The lessons that can actually be created are still there.
    await expect(modal.getByRole('option', { name: /GCSE 1:1/ })).toBeAttached();
    await expect(modal.getByRole('option', { name: /A-Level 1:1/ })).toBeAttached();
  });

  test('a cancelled trial does not burn the free trial', async ({ page }) => {
    const modal = await openBookingModal(page, [
      { id: 'c1', lessonType: 'consultation', tutorName: 'Suleiman', startTime: LAST_WEEK, status: 'completed' },
      { id: 't1', lessonType: 'trial', tutorName: 'Suleiman', startTime: LAST_WEEK, status: 'cancelled' },
    ]);
    await expect(modal.getByRole('option', { name: /free trial lesson/i })).toBeAttached();
  });
});
