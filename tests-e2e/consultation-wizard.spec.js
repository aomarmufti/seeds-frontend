// SCRUM-62 (initial slice): the full public wizard flow, step 1 through
// confirmation. Mocks the backend at the network boundary (route
// interception) rather than needing a live backend, live Stripe, or a
// live Calendly account — this asserts OUR client-side logic (state
// machine, payload shape, the postMessage handoff from Calendly's embed)
// is correct, independent of whether those third parties are reachable.
// A real Calendly iframe can't be driven from here either way; the
// postMessage it fires on a completed booking is simulated directly,
// exactly at the boundary our own code actually listens on.
const { test, expect } = require('@playwright/test');

test.describe('Consultation booking wizard (mocked backend)', () => {
  test('books a consultation end-to-end and sends the exact payload the backend expects', async ({ page }) => {
    let calendlyLinkRequest = null;
    let confirmRequestBody = null;

    await page.route('**/api/bookings?action=calendly-link*', async (route) => {
      calendlyLinkRequest = new URL(route.request().url());
      await route.fulfill({ json: { url: 'https://calendly.com/seeds-tuition/fake-consultation' } });
    });
    await page.route('**/api/bookings?action=calendly-event*', async (route) => {
      await route.fulfill({ json: { startTime: '2027-03-15T10:00:00Z' } });
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

    // Step 2 — the wizard requests a real-time Calendly link for the
    // selected tutor, scoped to the consultation event type specifically.
    await expect(page.locator('#bk-step-2')).toBeVisible();
    await expect.poll(() => calendlyLinkRequest?.searchParams.get('tutorName')).toBe('Suleiman');
    expect(calendlyLinkRequest.searchParams.get('context')).toBe('consultation');

    // Simulate Calendly's embed firing its "booking completed" message —
    // this is the actual boundary our own code listens on (see the
    // window.addEventListener('message', ...) handler in index.html).
    await page.evaluate(() => {
      window.postMessage({
        event: 'calendly.event_scheduled',
        payload: { event: { uri: 'https://api.calendly.com/scheduled_events/fake-event-id' } },
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
    await page.route('**/api/bookings?action=calendly-link*', async (route) => {
      // Longer than fetchWithTimeout's 15s abort threshold.
      await new Promise((r) => setTimeout(r, 16000));
      await route.fulfill({ json: { url: 'https://calendly.com/seeds-tuition/fake-consultation' } });
    });

    await page.goto('/');
    await page.getByRole('link', { name: /Book a Free Consultation/i }).first().click();
    await page.locator('.bk-tutor-opt', { hasText: 'Suleiman' }).click();
    await page.locator('#bk-step-1').getByRole('button', { name: /Continue/i }).click();

    await expect(page.locator('#bk-calendly-status')).toContainText(/Loading Suleiman.s availability/);
    // Once fetchWithTimeout aborts (~15s in), the status text must change
    // away from "Loading…" — the wizard recovered instead of hanging.
    await expect(page.locator('#bk-calendly-status')).not.toContainText(/Loading Suleiman.s availability/, { timeout: 25000 });
    await expect(page.locator('#bk-calendly-wrap')).toBeHidden();
  });

  test('rejects step 3 without required fields and never calls the backend', async ({ page }) => {
    let confirmCalled = false;
    await page.route('**/api/bookings?action=calendly-link*', (route) =>
      route.fulfill({ json: { url: 'https://calendly.com/seeds-tuition/fake' } }));
    await page.route('**/api/bookings?action=calendly-event*', (route) =>
      route.fulfill({ json: { startTime: '2027-03-15T10:00:00Z' } }));
    await page.route('**/api/bookings?action=confirm', (route) => { confirmCalled = true; return route.fulfill({ json: { success: true } }); });

    await page.goto('/');
    await page.getByRole('link', { name: /Book a Free Consultation/i }).first().click();
    await page.locator('#bk-step-1').getByRole('button', { name: /Continue/i }).click();
    await page.evaluate(() => {
      window.postMessage({ event: 'calendly.event_scheduled', payload: { event: { uri: 'https://api.calendly.com/scheduled_events/x' } } }, '*');
    });
    await expect(page.locator('#bk-step-3')).toBeVisible();

    // Leave every field blank.
    await page.locator('#bk-step-3').getByRole('button', { name: /Continue/i }).click();

    await expect(page.locator('#bk-step-3')).toBeVisible();
    await expect(page.locator('#bk-step3-error')).toBeVisible();
    expect(confirmCalled).toBe(false);
  });
});
