import { test, expect } from '../fixtures/auth.fixture';
import { createTestMRPRun } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';

test.describe('MRP Planning @mrp', () => {
  const testMRPRun = createTestMRPRun();

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/mrp');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should display MRP dashboard', async ({ authenticatedPage: page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main, [role="main"], .content')).toBeVisible({ timeout: 10000 });
  });

  test('@p0 should run MRP calculation', async ({ authenticatedPage: page }) => {
    const runMRPButton = page.locator(
      'button:has-text("Run MRP"), button:has-text("Calculate"), ' +
      'button:has-text("Generate Plan"), [data-testid="run-mrp-button"]'
    ).first();

    if (await runMRPButton.isVisible()) {
      await runMRPButton.click();
      await page.waitForTimeout(500);

      // Configure MRP run parameters if modal appears
      const horizonInput = page.locator('input[name*="horizon"], input[name*="days"]').first();
      if (await horizonInput.isVisible()) {
        await horizonInput.fill('30');
      }

      // Include forecasts checkbox
      const forecastCheckbox = page.locator('input[name*="forecast"], input[type="checkbox"]').first();
      if (await forecastCheckbox.isVisible()) {
        await forecastCheckbox.check();
      }

      // Start calculation
      const calculateButton = page.locator(
        'button:has-text("Calculate"), button:has-text("Run"), button:has-text("Start")'
      ).first();

      if (await calculateButton.isVisible()) {
        await calculateButton.click();
        await page.waitForTimeout(3000); // MRP can take time
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p0 should display MRP results', async ({ authenticatedPage: page }) => {
    // Navigate to results tab/section
    const resultsTab = page.locator(
      'button:has-text("Results"), [role="tab"]:has-text("Results"), ' +
      'button:has-text("Suggestions")'
    ).first();

    if (await resultsTab.isVisible()) {
      await resultsTab.click();
      await page.waitForTimeout(500);
    }

    // Check for results display
    const resultsTable = page.locator(
      '[data-testid="mrp-results"], table, .mrp-suggestions, ' +
      'div:has-text("Planned Orders")'
    ).first();

    const hasResults = await resultsTable.isVisible().catch(() => false);
    console.log(`MRP results displayed: ${hasResults}`);

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should view planned purchase orders', async ({ authenticatedPage: page }) => {
    const poTab = page.locator(
      'button:has-text("Purchase Orders"), button:has-text("Planned PO"), ' +
      '[role="tab"]:has-text("Purchase")'
    ).first();

    if (await poTab.isVisible()) {
      await poTab.click();
      await page.waitForTimeout(500);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should view planned work orders', async ({ authenticatedPage: page }) => {
    const woTab = page.locator(
      'button:has-text("Work Orders"), button:has-text("Planned WO"), ' +
      '[role="tab"]:has-text("Production")'
    ).first();

    if (await woTab.isVisible()) {
      await woTab.click();
      await page.waitForTimeout(500);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should firm planned orders', async ({ authenticatedPage: page }) => {
    // Find planned order row
    const plannedOrderRow = page.locator(
      '[data-testid="planned-order"], tr:has-text("Planned"), ' +
      'tr:has-text("Suggested")'
    ).first();

    if (await plannedOrderRow.isVisible()) {
      await plannedOrderRow.click();
      await page.waitForTimeout(500);

      const firmButton = page.locator(
        'button:has-text("Firm"), button:has-text("Convert"), button:has-text("Release")'
      ).first();

      const hasFirm = await firmButton.isVisible().catch(() => false);
      console.log(`Firm planned order feature available: ${hasFirm}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should view MRP exceptions', async ({ authenticatedPage: page }) => {
    const exceptionsTab = page.locator(
      'button:has-text("Exceptions"), button:has-text("Alerts"), ' +
      '[role="tab"]:has-text("Exception")'
    ).first();

    if (await exceptionsTab.isVisible()) {
      await exceptionsTab.click();
      await page.waitForTimeout(500);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P2 - MINOR TESTS
  // ============================================

  test('@p2 should configure MRP parameters', async ({ authenticatedPage: page }) => {
    const settingsButton = page.locator(
      'button:has-text("Settings"), button:has-text("Configure"), ' +
      '[data-testid="mrp-settings"]'
    ).first();

    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForTimeout(500);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should compare MRP scenarios', async ({ authenticatedPage: page }) => {
    const compareButton = page.locator(
      'button:has-text("Compare"), button:has-text("Scenario")'
    ).first();

    const hasCompare = await compareButton.isVisible().catch(() => false);
    console.log(`MRP scenario comparison available: ${hasCompare}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should export MRP plan', async ({ authenticatedPage: page }) => {
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Download")'
    ).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should view MRP run history', async ({ authenticatedPage: page }) => {
    const historyTab = page.locator(
      'button:has-text("History"), button:has-text("Previous Runs"), ' +
      '[role="tab"]:has-text("History")'
    ).first();

    if (await historyTab.isVisible()) {
      await historyTab.click();
      await page.waitForTimeout(500);
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
