import { defineConfig, devices } from '@playwright/test';

/**
 * RTR-MRP Playwright E2E Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 *
 * Test Execution Commands:
 * - Smoke Tests (P0):     npx playwright test --grep @p0
 * - Regression (P0+P1):   npx playwright test --grep "@p0|@p1"
 * - Full Suite:           npx playwright test
 * - Quality Module:       npx playwright test --grep @quality
 * - Workflows:            npx playwright test --grep @workflow
 * - With Bug Reporter:    npx playwright test --reporter=html,json,./e2e/reporters/bug-reporter.ts
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,  // Sequential to avoid rate limiting issues
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,  // 1 retry locally for flaky tests
  workers: process.env.CI ? 1 : 2,  // Limited workers to avoid overloading
  timeout: 60000,

  // Enhanced reporter configuration for QA/QC workflow
  reporter: process.env.CI
    ? [
        ['html', { outputFolder: 'e2e/reports/html', open: 'never' }],
        ['json', { outputFile: 'e2e/reports/json/results.json' }],
        ['./e2e/reporters/bug-reporter.ts', { outputFolder: 'e2e/reports/bugs' }],
        ['github'],
      ]
    : [
        ['html', { outputFolder: 'e2e/reports/html' }],
        ['json', { outputFile: 'e2e/reports/json/results.json' }],
        ['./e2e/reporters/bug-reporter.ts', { outputFolder: 'e2e/reports/bugs' }],
        ['list'],
      ],

  // Global test metadata for filtering
  grep: process.env.TEST_GREP ? new RegExp(process.env.TEST_GREP) : undefined,
  grepInvert: process.env.TEST_GREP_INVERT ? new RegExp(process.env.TEST_GREP_INVERT) : undefined,

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    // Add custom header to identify test requests (bypass rate limiting)
    extraHTTPHeaders: {
      'x-test-request': 'true',
    },
  },

  projects: [
    // Desktop browsers - exclude mobile tests
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/mobile/**'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: ['**/mobile/**'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: ['**/mobile/**'],
    },

    // Mobile devices - only run mobile tests
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: ['**/mobile/**'],
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
      testMatch: ['**/mobile/**'],
    },

    // Tablet
    {
      name: 'iPad',
      use: { ...devices['iPad Pro 11'] },
      testIgnore: ['**/mobile/**'],
    },
  ],

  // Run local dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      SKIP_RATE_LIMIT: 'true',
      PLAYWRIGHT_TEST: 'true',
    },
  },
});
