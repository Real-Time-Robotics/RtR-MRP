import { Page, expect } from '@playwright/test';

/**
 * Wait for page to fully load
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Login as test user
 */
export async function login(page: Page, email?: string, password?: string) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Wait for login form
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

  // Fill credentials
  await page.fill('input[type="email"], input[name="email"]', email || 'admin@rtr.vn');
  await page.fill('input[type="password"], input[name="password"]', password || 'admin123');

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL('**/home', { timeout: 15000 }).catch(() => {
    // May redirect to dashboard or other page
  });
}

/**
 * Navigate to module
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await waitForPageLoad(page);
}

/**
 * Fill form field by label or placeholder
 */
export async function fillField(page: Page, identifier: string, value: string) {
  const field = page.locator(`input[placeholder*="${identifier}"], textarea[placeholder*="${identifier}"], label:has-text("${identifier}") + input, label:has-text("${identifier}") + textarea`).first();
  await field.fill(value);
}

/**
 * Select dropdown option
 */
export async function selectOption(page: Page, selector: string, value: string) {
  await page.selectOption(selector, value);
}

/**
 * Click button by text
 */
export async function clickButton(page: Page, text: string) {
  await page.click(`button:has-text("${text}")`);
}

/**
 * Assert toast message
 */
export async function expectToast(page: Page, message: string, timeout = 5000) {
  await expect(page.locator(`[role="alert"]:has-text("${message}"), .toast:has-text("${message}"), [data-sonner-toast]:has-text("${message}")`).first()).toBeVisible({ timeout });
}

/**
 * Assert table row exists
 */
export async function expectTableRow(page: Page, text: string) {
  await expect(page.locator(`tr:has-text("${text}")`).first()).toBeVisible();
}

/**
 * Generate unique ID for test data
 */
export function generateTestId(prefix = 'TEST') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

/**
 * Wait for loading to complete
 */
export async function waitForLoading(page: Page) {
  // Wait for any loading spinners to disappear
  await page.waitForSelector('.animate-spin, [data-loading="true"]', { state: 'hidden', timeout: 30000 }).catch(() => {});
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ path: `test-results/screenshots/${name}-${timestamp}.png`, fullPage: true });
}

/**
 * Get table row count
 */
export async function getTableRowCount(page: Page, tableSelector = 'tbody tr'): Promise<number> {
  return page.locator(tableSelector).count();
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(response =>
    (typeof urlPattern === 'string' ? response.url().includes(urlPattern) : urlPattern.test(response.url()))
    && response.status() === 200
  );
}

/**
 * Mock API response
 */
export async function mockApiResponse(page: Page, urlPattern: string | RegExp, response: object) {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Check if element is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Scroll to element
 */
export async function scrollToElement(page: Page, selector: string) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
}

/**
 * Wait for modal to open
 */
export async function waitForModal(page: Page) {
  await page.waitForSelector('[role="dialog"], [data-state="open"], .modal', { timeout: 5000 });
}

/**
 * Close modal
 */
export async function closeModal(page: Page) {
  const closeButton = page.locator('[aria-label="Close"], button:has-text("Cancel"), button:has-text("Đóng"), button:has-text("Hủy")').first();
  if (await closeButton.isVisible()) {
    await closeButton.click();
  }
}
