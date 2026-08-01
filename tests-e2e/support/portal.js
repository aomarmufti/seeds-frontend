// Shared harness for the signed-in portal specs (SCRUM-XX25).
//
// The old suite drove the legacy single-file build: it clicked
// #portal-launch-btn to open an overlay and asserted on #tp-overlay /
// #ad-overlay classes. The Next.js app has no overlays — portals are real
// routes behind PortalShell — so every one of those specs was red for a
// reason that had nothing to do with the code under test.
//
// The approach here is the one the old suite got right and worth keeping:
// sign in through the real login form rather than hand-writing a session into
// localStorage. Supabase's token endpoint is stubbed, so supabase-js stores
// the session itself in whatever format the installed version uses, and the
// test never has to know. Everything below the sign-in is the app's own code
// path.
const { expect } = require('@playwright/test');

const BACKEND = 'https://seeds-backend-six.vercel.app';
const FAKE_USER_ID = '33333333-3333-3333-3333-333333333333';

/** A Supabase session payload shaped like the real token response. */
function sessionFor(email) {
  return {
    access_token: 'fake-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'fake-refresh-token',
    user: {
      id: FAKE_USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
}

/**
 * Stub Supabase auth + the profiles lookup.
 *
 * `role` is what PortalShell routes on. Pass `password: 'wrong'` behaviour by
 * using {@link mockSignInFailure} instead.
 */
async function mockSupabase(page, { role, fullName, tutorName, email = 'portal@example.com' }) {
  await page.route('**/auth/v1/token*', (route) => route.fulfill({ json: sessionFor(email) }));
  await page.route('**/auth/v1/user*', (route) => route.fulfill({ json: sessionFor(email).user }));
  await page.route('**/auth/v1/logout*', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route('**/rest/v1/profiles*', (route) =>
    route.fulfill({ json: { role, full_name: fullName, tutor_name: tutorName, assigned_tutor: tutorName } }));
}

/** Sign-in that fails the way Supabase fails it. */
async function mockSignInFailure(page) {
  await page.route('**/auth/v1/token*', (route) =>
    route.fulfill({ status: 400, json: { error: 'invalid_grant', error_description: 'Invalid login credentials' } }));
}

/**
 * Backend stubbing.
 *
 * A catch-all is registered first so no spec can accidentally reach the real
 * seeds-backend deployment; Playwright matches the most recently registered
 * route first, so the specific handlers passed in still win. `handlers` maps a
 * substring of the request URL to the JSON to return.
 */
async function stubBackend(page, handlers = {}) {
  await page.route(`${BACKEND}/**`, (route) => route.fulfill({ json: {} }));

  for (const [match, json] of Object.entries(handlers)) {
    await page.route(`${BACKEND}/**`, (route, request) => {
      if (!request.url().includes(match)) return route.fallback();
      return route.fulfill({ json: typeof json === 'function' ? json(request) : json });
    });
  }
}

/**
 * Sign in and land in a portal.
 *
 * `next` mirrors what the app does when a signed-out visitor asks for a
 * protected page: /login?next=… and back afterwards.
 */
async function signIn(page, { role, fullName, tutorName, next }) {
  await mockSupabase(page, { role, fullName, tutorName });
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  await page.locator('#lg-email').fill('portal@example.com');
  await page.locator('#lg-password').fill('correct-horse-battery');
  await page.locator('#lg-enter').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
}

/** The portal page's own <h1>, once PortalShell has finished its auth check. */
function pageTitle(page) {
  return page.locator('.page-hd h1');
}

async function expectPortalReady(page, title) {
  await expect(pageTitle(page)).toHaveText(title, { timeout: 15000 });
}

module.exports = {
  BACKEND,
  FAKE_USER_ID,
  mockSupabase,
  mockSignInFailure,
  stubBackend,
  signIn,
  pageTitle,
  expectPortalReady,
};
