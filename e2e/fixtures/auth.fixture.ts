import { test as base, Page, expect } from '@playwright/test';
import { testCredentials } from './test-data';

/**
 * Custom test fixture with authenticated page.
 * Handles NextAuth session establishment and waits for redirect away from login.
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Wait for form to be fully interactive (React hydration complete)
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });

    // Fill credentials from test-data (matches seed.ts)
    await emailInput.fill(testCredentials.admin.email);
    await page.locator('input[type="password"], input[name="password"]').first()
      .fill(testCredentials.admin.password);

    // Submit login form
    await page.locator('button[type="submit"]').click();

    // Wait for NextAuth to process and redirect away from login
    // The login page uses router.push(callbackUrl) after signIn succeeds
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 25000 });
    await page.waitForLoadState('domcontentloaded');

    // Verify we're authenticated - not redirected back to login
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error(`Authentication failed: still on login page. URL: ${currentUrl}`);
    }

    // Provide the authenticated page to the test
    await use(page);
  },
});

export { expect };
