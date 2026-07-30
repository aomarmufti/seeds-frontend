// Routes and access, against the Next.js app.
//
// These cover the property that has to survive the whole migration: a URL is a
// request, not a grant. Every portal path is real and linkable, but landing on
// one signed out sends you to the login screen — the address bar can ask for a
// page, it can never be what authorises one.
//
// The legacy suite is parked in legacy/tests-e2e/ and still describes the old
// single-file build; those specs get ported alongside the screens they cover
// rather than deleted, so nothing silently loses its coverage.
const { test, expect } = require('@playwright/test');

const PORTAL_PATHS = [
  '/tutor/schedule',
  '/tutor/students',
  '/tutor/earnings',
  '/admin/leads',
  '/admin/bookings',
  '/admin/students',
  '/admin/tutors',
  '/student/lessons',
  '/student/progress',
  '/student/payments',
];

test.describe('Public site', () => {
  test('the marketing page renders without a session', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('the marketing page ships no portal code', async ({ page }) => {
    // The concrete harm in the old build was that admin and tutor logic was
    // downloaded by, and readable to, every anonymous visitor.
    const scripts = [];
    page.on('response', (r) => {
      if (r.url().endsWith('.js')) scripts.push(r.url());
    });
    await page.goto('/', { waitUntil: 'networkidle' });

    const bodies = await Promise.all(
      scripts.map(async (url) => {
        try {
          const res = await page.request.get(url);
          return await res.text();
        } catch { return ''; }
      }),
    );
    const all = bodies.join('\n');

    // Function names that only exist behind a login.
    for (const marker of ['mark-delivered', 'assign-tutor', 'resource=accounts']) {
      expect(all, `anonymous visitor should not receive "${marker}"`).not.toContain(marker);
    }
  });
});

test.describe('Access control', () => {
  for (const path of PORTAL_PATHS) {
    test(`${path} sends a signed-out visitor to the login screen`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
      // and it remembers where they were trying to go
      expect(decodeURIComponent(page.url())).toContain(path);
    });
  }

  test('the login page itself is reachable', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#lg-email')).toBeVisible();
    await expect(page.locator('#lg-password')).toBeVisible();
  });
});

test.describe('Routing', () => {
  test('each portal index redirects to a real page', async ({ page }) => {
    // Signed out these end at /login, but the redirect chain proves the index
    // routes resolve rather than 404.
    for (const [index, expected] of [
      ['/tutor', 'tutor/schedule'],
      ['/admin', 'admin/leads'],
      ['/student', 'student/lessons'],
    ]) {
      const res = await page.goto(index);
      expect(res.status(), `${index} should not 404`).toBeLessThan(400);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(decodeURIComponent(page.url())).toContain(expected);
    }
  });

  test('an unknown path 404s rather than silently rendering', async ({ page }) => {
    const res = await page.goto('/tutor/not-a-real-page');
    expect(res.status()).toBe(404);
  });
});
