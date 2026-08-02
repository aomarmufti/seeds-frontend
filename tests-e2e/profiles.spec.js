// Student and tutor profile pages (SCRUM-XX39 / XX40).
//
// The property worth protecting is honesty about persistence. These screens
// mix fields that genuinely save (profiles columns, writable by their owner
// under RLS) with fields that cannot be changed here at all — and the second
// kind must never render as an input somebody can type into and lose work in.
const { test, expect } = require('@playwright/test');
const { signIn, stubBackend, expectPortalReady } = require('./support/portal');

const PROFILE = {
  id: '33333333-3333-3333-3333-333333333333',
  role: 'student',
  email: 'portal@example.com',
  full_name: 'Ibrahim Khan',
  school_year: 'Year 11',
  subjects: 'Maths, Biology',
  target_grades: { Maths: 'A*' },
  subject: 'Mathematics',
  level: 'gcse',
  assigned_tutor: 'Suleiman',
  whatsapp_number: null,
  whatsapp_opted_in: false,
};

/** Capture what the page sends back to Supabase, and answer as Supabase does. */
async function captureProfileWrites(page, row) {
  const writes = [];
  await page.route('**/rest/v1/profiles*', (route, request) => {
    if (request.method() === 'PATCH') {
      writes.push(request.postDataJSON());
      return route.fulfill({ json: [row] });
    }
    return route.fulfill({ json: row });
  });
  return writes;
}

test.describe('Student profile', () => {
  test('saves the details a parent owns, and sends only those', async ({ page }) => {
    await stubBackend(page, {
      'resource=my-bookings': { recentBookings: [] },
      'resource=billing-cycle': { billingCycle: 'weekly' },
    });
    await signIn(page, {
      role: 'student', fullName: 'Ibrahim Khan', next: '/student/profile',
    });
    const writes = await captureProfileWrites(page, PROFILE);
    await page.reload();
    await expectPortalReady(page, 'Your profile');

    const year = page.getByPlaceholder('Year 11');
    await expect(year).toHaveValue('Year 11');
    await year.fill('Year 12');

    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('✓ Saved')).toBeVisible();

    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ school_year: 'Year 12' });
    // Rate and tutor assignment are admin's to set. RLS would allow the
    // write; the product must not offer it.
    expect(writes[0]).not.toHaveProperty('level');
    expect(writes[0]).not.toHaveProperty('subject');
    expect(writes[0]).not.toHaveProperty('assigned_tutor');
    expect(writes[0]).not.toHaveProperty('role');
  });

  test('commercial facts are shown but not editable', async ({ page }) => {
    await stubBackend(page, {
      'resource=my-bookings': { recentBookings: [] },
      'resource=billing-cycle': { billingCycle: 'weekly' },
    });
    await signIn(page, {
      role: 'student', fullName: 'Ibrahim Khan', next: '/student/profile',
    });
    await captureProfileWrites(page, PROFILE);
    await page.reload();
    await expectPortalReady(page, 'Your profile');

    // Present as facts, with a route to change them…
    await expect(page.getByText('Mathematics')).toBeVisible();
    await expect(page.getByText('Suleiman')).toBeVisible();
    // …and not as fields that would silently fail to save.
    await expect(page.locator('input[value="Mathematics"]')).toHaveCount(0);
    await expect(page.locator('input[value="Suleiman"]')).toHaveCount(0);
  });
});

test.describe('Tutor profile', () => {
  const TUTOR_PROFILE = {
    ...PROFILE, role: 'tutor', tutor_name: 'Suleiman', full_name: 'Suleiman Ahmed',
    bio: 'I teach History and Arabic.', subject: null, level: null, assigned_tutor: null,
  };

  test('the display name is locked, and says why', async ({ page }) => {
    await stubBackend(page, { 'resource=connect-status': { connected: true, onboardingComplete: true, payoutCycle: 'weekly' } });
    await signIn(page, {
      role: 'tutor', fullName: 'Suleiman Ahmed', tutorName: 'Suleiman', next: '/tutor/profile',
    });
    await captureProfileWrites(page, TUTOR_PROFILE);
    await page.reload();
    await expectPortalReady(page, 'Your profile');

    // Editing this field would break the tutor's own booking permissions —
    // the backend matches it as a string against every booking they have.
    await expect(page.locator('input[value="Suleiman"]')).toHaveCount(0);
    await expect(page.getByText(/disconnect you from your own bookings/)).toBeVisible();
  });

  test('the bio saves', async ({ page }) => {
    await stubBackend(page, { 'resource=connect-status': { connected: false, onboardingComplete: false } });
    await signIn(page, {
      role: 'tutor', fullName: 'Suleiman Ahmed', tutorName: 'Suleiman', next: '/tutor/profile',
    });
    const writes = await captureProfileWrites(page, TUTOR_PROFILE);
    await page.reload();
    await expectPortalReady(page, 'Your profile');

    await page.locator('textarea').fill('Six years of GCSE and A-Level History.');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('✓ Saved')).toBeVisible();

    expect(writes[0]).toMatchObject({ bio: 'Six years of GCSE and A-Level History.' });
    expect(writes[0]).not.toHaveProperty('tutor_name');
  });
});
