import { Page, expect, Locator } from '@playwright/test';

/**
 * Data Integrity Testing Utilities
 *
 * These helpers verify that data entered in forms is correctly saved and retrieved.
 * This addresses the bug pattern where Create operations may not save all fields.
 */

export interface FieldComparison {
  field: string;
  expected: string | number | boolean | null;
  actual: string | number | boolean | null;
  match: boolean;
}

export interface DataIntegrityResult {
  success: boolean;
  entityType: string;
  entityId?: string;
  comparisons: FieldComparison[];
  mismatches: FieldComparison[];
  errors: string[];
}

/**
 * Wait for API response and extract JSON data
 */
export async function waitForApiData(
  page: Page,
  urlPattern: string | RegExp,
  method: 'GET' | 'POST' | 'PUT' = 'GET'
): Promise<any> {
  const response = await page.waitForResponse(
    (res) => {
      const urlMatch = typeof urlPattern === 'string'
        ? res.url().includes(urlPattern)
        : urlPattern.test(res.url());
      return urlMatch && res.request().method() === method && res.status() < 400;
    },
    { timeout: 15000 }
  );
  return response.json();
}

/**
 * Fill a text input field
 */
export async function fillInput(
  page: Page,
  selector: string,
  value: string | number | null,
  options: { clear?: boolean } = {}
): Promise<void> {
  if (value === null || value === undefined) return;

  const input = page.locator(selector).first();
  if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
    if (options.clear) {
      await input.clear();
    }
    await input.fill(String(value));
  }
}

/**
 * Select a dropdown option
 */
export async function selectDropdown(
  page: Page,
  triggerSelector: string,
  optionValue: string
): Promise<void> {
  const trigger = page.locator(triggerSelector).first();
  if (await trigger.isVisible({ timeout: 2000 }).catch(() => false)) {
    await trigger.click();
    await page.waitForTimeout(300);

    // Try different option selectors
    const option = page.locator(
      `[data-value="${optionValue}"], [role="option"]:has-text("${optionValue}"), option[value="${optionValue}"]`
    ).first();

    if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
      await option.click();
    }
  }
}

/**
 * Toggle a checkbox/switch
 */
export async function setCheckbox(
  page: Page,
  selector: string,
  checked: boolean
): Promise<void> {
  const checkbox = page.locator(selector).first();
  if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
    const isChecked = await checkbox.isChecked().catch(() => false);
    if (isChecked !== checked) {
      await checkbox.click();
    }
  }
}

/**
 * Get input value
 */
export async function getInputValue(
  page: Page,
  selector: string
): Promise<string | null> {
  const input = page.locator(selector).first();
  if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
    return await input.inputValue();
  }
  return null;
}

/**
 * Get selected dropdown value
 */
export async function getDropdownValue(
  page: Page,
  selector: string
): Promise<string | null> {
  const element = page.locator(selector).first();
  if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Try to get value from data attribute or text content
    const dataValue = await element.getAttribute('data-value');
    if (dataValue) return dataValue;

    return await element.textContent();
  }
  return null;
}

/**
 * Get checkbox state
 */
export async function getCheckboxState(
  page: Page,
  selector: string
): Promise<boolean | null> {
  const checkbox = page.locator(selector).first();
  if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
    return await checkbox.isChecked();
  }
  return null;
}

/**
 * Compare expected vs actual value with type coercion
 */
export function compareValues(
  expected: any,
  actual: any,
  fieldType: 'string' | 'number' | 'boolean' = 'string'
): boolean {
  // Handle null/undefined/empty cases
  if (expected === null || expected === undefined || expected === '') {
    return actual === null || actual === undefined || actual === '' || actual === '0';
  }

  if (fieldType === 'number') {
    const expectedNum = parseFloat(String(expected));
    const actualNum = parseFloat(String(actual));
    // Use tolerance for floating point comparison
    return Math.abs(expectedNum - actualNum) < 0.001;
  }

  if (fieldType === 'boolean') {
    const expectedBool = expected === true || expected === 'true' || expected === '1';
    const actualBool = actual === true || actual === 'true' || actual === '1';
    return expectedBool === actualBool;
  }

  // String comparison - normalize
  return String(expected).trim().toLowerCase() === String(actual).trim().toLowerCase();
}

/**
 * Navigate to a tab in a tabbed form
 */
export async function navigateToTab(
  page: Page,
  tabName: string
): Promise<boolean> {
  const tab = page.locator(
    `[role="tab"]:has-text("${tabName}"), button:has-text("${tabName}"), [data-tab="${tabName}"]`
  ).first();

  if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

/**
 * Wait for form to be fully loaded
 */
export async function waitForForm(page: Page, formSelector: string = 'form'): Promise<void> {
  await page.waitForSelector(formSelector, { timeout: 10000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

/**
 * Submit form and wait for response
 */
export async function submitForm(
  page: Page,
  buttonSelector: string = 'button[type="submit"], button:has-text("Lưu"), button:has-text("Save")'
): Promise<void> {
  const submitBtn = page.locator(buttonSelector).first();
  await expect(submitBtn).toBeVisible({ timeout: 5000 });
  await submitBtn.click();
  await page.waitForTimeout(1000);
}

/**
 * Check for success toast/message
 */
export async function checkSuccess(page: Page): Promise<boolean> {
  const successIndicators = [
    '[data-sonner-toast][data-type="success"]',
    '.toast-success',
    'text=thành công',
    'text=success',
  ];

  for (const selector of successIndicators) {
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
      return true;
    }
  }
  return false;
}

/**
 * Check for error toast/message
 */
export async function getErrorMessage(page: Page): Promise<string | null> {
  const errorSelectors = [
    '[data-sonner-toast][data-type="error"]',
    '.toast-error',
    '.text-red-500',
    '.text-destructive',
    '[role="alert"]',
  ];

  for (const selector of errorSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
      return await element.textContent();
    }
  }
  return null;
}

/**
 * Generate a comprehensive integrity test report
 */
export function generateReport(result: DataIntegrityResult): string {
  const lines: string[] = [];
  lines.push(`\n${'='.repeat(60)}`);
  lines.push(`DATA INTEGRITY REPORT: ${result.entityType}`);
  lines.push(`${'='.repeat(60)}`);
  lines.push(`Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);

  if (result.entityId) {
    lines.push(`Entity ID: ${result.entityId}`);
  }

  lines.push(`\nTotal fields checked: ${result.comparisons.length}`);
  lines.push(`Matches: ${result.comparisons.filter(c => c.match).length}`);
  lines.push(`Mismatches: ${result.mismatches.length}`);

  if (result.mismatches.length > 0) {
    lines.push(`\n${'─'.repeat(60)}`);
    lines.push('MISMATCHED FIELDS:');
    lines.push(`${'─'.repeat(60)}`);

    for (const mismatch of result.mismatches) {
      lines.push(`\n  Field: ${mismatch.field}`);
      lines.push(`    Expected: ${JSON.stringify(mismatch.expected)}`);
      lines.push(`    Actual:   ${JSON.stringify(mismatch.actual)}`);
    }
  }

  if (result.errors.length > 0) {
    lines.push(`\n${'─'.repeat(60)}`);
    lines.push('ERRORS:');
    lines.push(`${'─'.repeat(60)}`);
    result.errors.forEach(err => lines.push(`  - ${err}`));
  }

  lines.push(`\n${'='.repeat(60)}\n`);

  return lines.join('\n');
}

/**
 * Take screenshot with descriptive name
 */
export async function takeIntegrityScreenshot(
  page: Page,
  entityType: string,
  phase: 'before-create' | 'after-create' | 'verification' | 'error'
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/data-integrity/${entityType}-${phase}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Retry mechanism for flaky operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}
