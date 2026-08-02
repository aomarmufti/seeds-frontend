// The two dead ends a real family hit on 2026-08-02 (SCRUM-XX44 / XX45).
//
// She booked a consultation, went to create her account, and got a red box.
// She then signed in with Google, which worked at the auth layer — and landed
// back on an empty login form with nothing on it. Both journeys ended with a
// person who had done everything right and had no idea what to do next.
//
// What these specs protect is not the wording. It is that neither path can
// end in silence, and that the raw upstream error — which contains the site
// owner's personal email address — never reaches a public page.
const { test, expect } = require('@playwright/test');
const { mockSupabase, stubBackend } = require('./support/portal');

const PENDING_USER = 'parent@example.com';

test.describe('Signed in but not yet approved', () => {
  test('a pending account is told so, instead of a blank login form', async ({ page }) => {
    await stubBackend(page);
    // handle_new_user gives every OAuth signup role 'pending', so this is
    // what a brand-new Google sign-in actually returns.
    await mockSupabase(page, { role: 'pending', fullName: 'Shanzeh', email: PENDING_USER });

    // Landing on /login with a live session is exactly where Google's
    // redirect drops them.
    await page.goto('/login');
    await page.locator('#lg-email').fill(PENDING_USER);
    await page.locator('#lg-password').fill('correct-horse-battery');
    await page.locator('#lg-enter').click();

    await expect(page.locator('#lg-pending')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#lg-pending')).toContainText(PENDING_USER);
    // And a way out, for the case that actually happened: booked with one
    // address, signed in with another.
    await expect(page.getByRole('button', { name: /use a different account/i })).toBeVisible();
  });
});

test.describe('Signup failures', () => {
  /** Fail auth/v1/signup the way the live project did: 500, SMTP refusal. */
  async function mockSignupFailure(page, body, status = 500) {
    await page.route('**/auth/v1/signup*', (route) => route.fulfill({ status, json: body }));
  }

  test('a failed confirmation email does not print the owner’s address at the visitor', async ({ page }) => {
    await stubBackend(page);
    // The verbatim upstream text from the incident.
    await mockSignupFailure(page, {
      code: 500,
      msg: 'gomail: could not send email 1: 550 "You can only send testing emails to your own email address (owner@example.com). To send emails to other recipients, please verify a domain at resend.com/domains"',
    });

    await page.goto('/signup');
    await page.locator('#su-name').fill('Shanzeh Mufti');
    await page.locator('#su-email').fill('parent@example.com');
    await page.locator('#su-password').fill('correct-horse-battery');
    await page.locator('#su-subject').selectOption('Mathematics');
    await page.locator('#su-level').selectOption('GCSE');
    await page.locator('#su-enter').click();

    const note = page.locator('.error-note');
    await expect(note).toBeVisible({ timeout: 15000 });
    // Nothing from the upstream message reaches the page.
    await expect(note).not.toContainText('owner@example.com');
    await expect(note).not.toContainText('gomail');
    await expect(note).not.toContainText('resend.com');
    // It says whose fault it is and what to do instead.
    await expect(note).toContainText(/couldn't send your confirmation email/i);
    await expect(note.getByRole('link', { name: /go to sign in/i })).toBeVisible();
  });

  test('an existing account is pointed at sign-in, not asked to try again', async ({ page }) => {
    await stubBackend(page);
    await mockSignupFailure(page, { code: 422, msg: 'User already registered', error_code: 'user_already_exists' }, 422);

    await page.goto('/signup');
    await page.locator('#su-name').fill('Shanzeh Mufti');
    await page.locator('#su-email').fill('parent@example.com');
    await page.locator('#su-password').fill('correct-horse-battery');
    await page.locator('#su-subject').selectOption('Mathematics');
    await page.locator('#su-level').selectOption('GCSE');
    await page.locator('#su-enter').click();

    await expect(page.locator('.error-note')).toContainText(/already an account/i, { timeout: 15000 });
  });

  test('the booking email is flagged as the one to keep', async ({ page }) => {
    await stubBackend(page);
    // Bookings link to an account by email alone, so changing it here is how
    // a consultation silently fails to appear.
    await page.goto('/signup?email=booked%40example.com&name=Shanzeh');
    await expect(page.getByText(/This is the address you booked with/i)).toBeVisible();
  });
});
