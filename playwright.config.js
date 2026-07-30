// Playwright against the Next.js app.
//
// BASE_URL set (CI against a deployment) → run against that URL directly.
// BASE_URL unset (local, and CI's own run) → build and serve the real
// production output, so the tests exercise what actually ships rather than a
// dev-server approximation.
const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL;

module.exports = defineConfig({
  testDir: './tests-e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Only set when pointed at a pre-installed browser (this sandbox);
        // CI installs its own matching build, so it stays unset there.
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } }
          : {}),
      },
    },
  ],
  webServer: BASE_URL ? undefined : {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
  },
});
