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

  // Subject, level and tutor used to be three read-only fields off
  // profiles.subject / .level / .assigned_tutor. They're enrolments now
  // (SCRUM-100), which is what lets a family hold two subjects with two
  // tutors — but the property this test protects is unchanged: shown as
  // facts, never as inputs somebody could type into and lose work in.
  test('commercial facts are shown but not editable', async ({ page }) => {
    await stubBackend(page, {
      'resource=billing-cycle': { billingCycle: 'weekly' },
      'api/enrolments': [
        {
          id: 'e1', subject: 'Mathematics', level: 'GCSE', status: 'active',
          rate_pence: 4000, tutors: { name: 'Suleiman' },
        },
      ],
    });
    await signIn(page, {
      role: 'student', fullName: 'Ibrahim Khan', next: '/student/profile',
    });
    await captureProfileWrites(page, PROFILE);
    await page.reload();
    await expectPortalReady(page, 'Your profile');

    // Present as facts, with a route to change them…
    await expect(page.getByText('Mathematics')).toBeVisible();
    await expect(page.getByText('with Suleiman')).toBeVisible();
    // …and not as fields that would silently fail to save.
    await expect(page.locator('input[value="Mathematics"]')).toHaveCount(0);
    await expect(page.locator('input[value="Suleiman"]')).toHaveCount(0);
  });

  // The rule from docs/MULTI-SUBJECT-DESIGN.md: the student asks, the tutor
  // teaches, the admin decides. A family may stop being billed for a subject
  // without emailing anyone; it may not price itself or pick its own tutor.
  test('a family can end a subject, but is offered no way to set a tutor or a rate', async ({ page }) => {
    const patches = [];
    await stubBackend(page, {
      'resource=billing-cycle': { billingCycle: 'weekly' },
      'api/enrolments': (request) => {
        if (request.method() === 'PATCH') {
          patches.push(request.postDataJSON());
          return { id: 'e1', status: 'ended' };
        }
        return [{
          id: 'e1', subject: 'Mathematics', level: 'GCSE', status: 'active',
          rate_pence: 4000, tutors: { name: 'Suleiman' },
        }];
      },
    });
    await signIn(page, {
      role: 'student', fullName: 'Ibrahim Khan', next: '/student/profile',
    });
    await captureProfileWrites(page, PROFILE);
    await page.reload();
    await expectPortalReady(page, 'Your profile');

    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'End' }).click();

    await expect.poll(() => patches.length).toBeGreaterThan(0);
    // Status is the only thing a family may write — the server refuses the
    // rest, and the product must not offer it either.
    expect(patches[0]).toMatchObject({ status: 'ended' });
    expect(patches[0]).not.toHaveProperty('rate_pence');
    expect(patches[0]).not.toHaveProperty('tutor_id');
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
