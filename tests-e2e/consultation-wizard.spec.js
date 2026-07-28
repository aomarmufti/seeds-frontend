// SCRUM-62 (initial slice): the full public wizard flow, step 1 through
// confirmation. Mocks the backend at the network boundary (route
// interception) rather than needing a live backend, live Stripe, or a
// live Cal.com account — this asserts OUR client-side logic (state
// machine, payload shape, the postMessage handoff from the embedded
// booking page) is correct, independent of whether those third parties
// are reachable. A real Cal.com iframe can't be driven from here either
// way; the postMessage it fires on a completed booking is simulated
// directly, exactly at the boundary our own code actually listens on
// (calParseBookingSuccess in index.html) — not independently verified
// against a live Cal.com account's actual message shape (see the comment
// on calParseBookingSuccess itself).
const { test, expect } = require('@playwright/test');

test.describe('Consultation booking wizard (mocked backend)', () => {
  test('books a consultation end-to-end and sends the exact payload the backend expects', async ({ page }) => {
    let schedulingLinkRequest = null;
    let confirmRequestBody = null;

    await page.route('**/api/bookings?action=scheduling-link*', async (route) => {
      schedulingLinkRequest = new URL(route.request().url());
      await route.fulfill({ json: { url: 'https://cal.eu/seeds-tuition/fake-consultation' } });
    });
    await page.route('**/api/bookings?action=confirm', async (route) => {
      confirmRequestBody = route.request().postDataJSON();
      await route.fulfill({ json: { success: true, meetingLink: 'https://meet.google.com/fake-link' } });
    });

    await page.goto('/');
    await page.getByRole('link', { name: /Book a Free Consultation/i }).first().click();

    // Step 1 — tutor + lesson type (Initial Consultation is pre-selected,
    // it's the only option).
    await page.locator('.bk-tutor-opt', { hasText: 'Suleiman' }).click();
    await page.locator('#bk-step-1').getByRole('button', { name: /Continue/i }).click();

    // Step 2 — the wizard requests a real-time Cal.com link for the
    // selected tutor, scoped to the consultation event type specifically.
    await expect(page.locator('#bk-step-2')).toBeVisible();
    await expect.poll(() => schedulingLinkRequest?.searchParams.get('tutorName')).toBe('Suleiman');
    expect(schedulingLinkRequest.searchParams.get('context')).toBe('consultation');

    // Simulate Cal.com's embedded page firing its "booking completed"
    // message — this is the actual boundary our own code listens on (see
    // calParseBookingSuccess and the window.addEventListener('message', ...)
    // handler in index.html).
    await page.evaluate(() => {
      window.postMessage({
        type: 'CAL:bookingSuccessful',
        data: { booking: { startTime: '2027-03-15T10:00:00Z', endTime: '2027-03-15T10:15:00Z' } },
      }, '*');
    });

    // Step 3 — student/parent details.
    await expect(page.locator('#bk-step-3')).toBeVisible();
    await page.locator('#bk-student-name').fill('Test Student');
    await page.locator('#bk-parent-name').fill('Test Parent');
    await page.locator('#bk-email').fill('parent@example.com');
    await page.locator('#bk-step-3').getByRole('button', { name: /Continue/i }).click();

    // Step 4 — review. Assert the summary reflects real selected state,
    // not stale/default values.
    await expect(page.locator('#bk-step-4')).toBeVisible();
    await expect(page.locator('#bk-sum-tutor')).toHaveText('Suleiman');
    await expect(page.locator('#bk-sum-type')).toContainText('Initial Consultation');
    await expect(page.locator('#bk-sum-student')).toHaveText('Test Student');
    await expect(page.locator('#bk-sum-price')).toHaveText('Free');

    await page.getByRole('button', { name: /Confirm Free Consultation/i }).click();

    // Success panel.
    await expect(page.locator('#bk-step-success')).toBeVisible();
    await expect(page.locator('#bk-final-tutor')).toHaveText('Suleiman');

    // The actual wire payload — SCRUM-58 regression guard: this endpoint
    // only ever creates a 'consultation' booking, never 'trial' (the two
    // used to be conflated, which blocked a family's real trial lesson
    // later via a shared DB constraint).
    expect(confirmRequestBody).toMatchObject({
      tutorName: 'Suleiman',
      lessonType: 'consultation',
      studentName: 'Test Student',
      parentName: 'Test Parent',
      parentEmail: 'parent@example.com',
      startTime: '2027-03-15T10:00:00.000Z',
    });
  });

  // SCRUM-62: exercises the fetchWithTimeout 15s guard (index.html) added
  // this session for the exact "Confirming your slot…"-style hang this
  // wizard used to be vulnerable to — a slow/hung backend call must
  // recover with a friendly message, never leave the wizard stuck on
  // "Loading…" forever.
  test('recovers with a friendly message instead of hanging if the availability call is slow', async ({ page }) => {
    test.setTimeout(45000);
    await page.route('**/api/bookings?action=scheduling-link*', async (route) => {
      // Longer than fetchWithTimeout's 15s abort threshold.
      await new Promise((r) => setTimeout(r, 16000));
      await route.fulfill({ json: { url: 'https://cal.eu/seeds-tuition/fake-consultation' } });
    });

    await page.goto('/');
    await page.getByRole('link', { name: /Book a Free Consultation/i }).first().click();
    await page.locator('.bk-tutor-opt', { hasText: 'Suleiman' }).click();
    await page.locator('#bk-step-1').getByRole('button', { name: /Continue/i }).click();

    await expect(page.locator('#bk-cal-status')).toContainText(/Loading Suleiman.s availability/);
    // Once fetchWithTimeout aborts (~15s in), the status text must change
    // away from "Loading…" — the wizard recovered instead of hanging.
    await expect(page.locator('#bk-cal-status')).not.toContainText(/Loading Suleiman.s availability/, { timeout: 25000 });
    await expect(page.locator('#bk-cal-wrap')).toBeHidden();
  });

  test('rejects step 3 without required fields and never calls the backend', async ({ page }) => {
    let confirmCalled = false;
    await page.route('**/api/bookings?action=scheduling-link*', (route) =>
      route.fulfill({ json: { url: 'https://cal.eu/seeds-tuition/fake' } }));
    await page.route('**/api/bookings?action=confirm', (route) => { confirmCalled = true; return route.fulfill({ json: { success: true } }); });

    await page.goto('/');
    await page.getByRole('link', { name: /Book a Free Consultation/i }).first().click();
    await page.locator('#bk-step-1').getByRole('button', { name: /Continue/i }).click();
    await page.evaluate(() => {
      window.postMessage({ type: 'CAL:bookingSuccessful', data: { booking: { startTime: '2027-03-15T10:00:00Z' } } }, '*');
    });
    await expect(page.locator('#bk-step-3')).toBeVisible();

    // Leave every field blank.
    await page.locator('#bk-step-3').getByRole('button', { name: /Continue/i }).click();

    await expect(page.locator('#bk-step-3')).toBeVisible();
    await expect(page.locator('#bk-step3-error')).toBeVisible();
    expect(confirmCalled).toBe(false);
  });
});
