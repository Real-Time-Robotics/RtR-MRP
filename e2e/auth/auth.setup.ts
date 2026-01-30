import { test as setup, expect } from '@playwright/test';
import { testCredentials } from '../fixtures/test-data';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '../.auth/admin.json');

/**
 * Authentication setup: logs in once and saves session state.
 * Other test projects depend on this and reuse the stored session.
 */
setup('authenticate as admin', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Wait for form to be interactive (React hydration)
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });

  // Fill admin credentials (matches seed.ts)
  await emailInput.fill(testCredentials.admin.email);
  await page.locator('input[type="password"], input[name="password"]').first()
    .fill(testCredentials.admin.password);

  // Submit form
  await page.locator('button[type="submit"]').click();

  // Wait for successful redirect away from login
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForLoadState('domcontentloaded');

  // Verify authentication succeeded
  expect(page.url()).not.toContain('/login');

  // Save authenticated state for other projects to reuse
  await page.context().storageState({ path: AUTH_FILE });
});
