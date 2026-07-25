// Playwright config (SCRUM-61). Two ways to point this at a target:
//   - BASE_URL env var set (CI, against a real Vercel preview deployment)
//     → no local server is started, tests run against that URL directly.
//   - BASE_URL unset (local dev, or CI's own always-on smoke job)
//     → spins up tests-e2e/static-server.js and serves the repo root,
//       same content Vercel deploys, just without its CDN.
const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL;

module.exports = defineConfig({
  testDir: './tests-e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL || 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Only set when explicitly pointed at a pre-installed browser
        // (this sandbox's dev environment) — CI installs its own matching
        // build via `playwright install`, so this stays unset there.
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } }
          : {}),
      },
    },
  ],
  webServer: BASE_URL ? undefined : {
    command: 'node tests-e2e/static-server.js',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
