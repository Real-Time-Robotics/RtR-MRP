import { test as base, Page } from '@playwright/test';
import { testCredentials } from './test-data';

/**
 * Custom test fixture with authenticated page
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Wait for form to be ready
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

    // Fill credentials
    await page.fill('input[type="email"], input[name="email"]', testCredentials.admin.email);
    await page.fill('input[type="password"], input[name="password"]', testCredentials.admin.password);

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for successful login (redirect to home or dashboard)
    try {
      await page.waitForURL(/\/(home|dashboard|parts|bom|production)/, { timeout: 20000 });
    } catch {
      // May already be on the page or redirected elsewhere
    }

    // Wait for page to stabilize with a shorter timeout
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Provide the authenticated page to the test
    await use(page);
  },
});

export { expect } from '@playwright/test';
