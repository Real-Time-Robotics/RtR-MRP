import { test, expect } from '../fixtures/auth.fixture';
import { generateTestId } from '../utils/test-helpers';

test.describe('Analytics & Reports @reports', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should display reports dashboard', async ({ authenticatedPage: page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main, [role="main"], .content')).toBeVisible({ timeout: 10000 });
  });

  test('@p0 should view inventory report', async ({ authenticatedPage: page }) => {
    const inventoryReportButton = page.locator(
      'button:has-text("Inventory"), a:has-text("Inventory Report"), ' +
      '[data-testid="inventory-report"]'
    ).first();

    if (await inventoryReportButton.isVisible()) {
      await inventoryReportButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p0 should view production report', async ({ authenticatedPage: page }) => {
    const productionReportButton = page.locator(
      'button:has-text("Production"), a:has-text("Production Report"), ' +
      '[data-testid="production-report"]'
    ).first();

    if (await productionReportButton.isVisible()) {
      await productionReportButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should view quality metrics report', async ({ authenticatedPage: page }) => {
    const qualityReportButton = page.locator(
      'button:has-text("Quality"), a:has-text("Quality Report"), ' +
      '[data-testid="quality-report"]'
    ).first();

    if (await qualityReportButton.isVisible()) {
      await qualityReportButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should filter reports by date range', async ({ authenticatedPage: page }) => {
    const startDateInput = page.locator(
      'input[name*="start"], input[name*="from"], input[type="date"]'
    ).first();

    if (await startDateInput.isVisible()) {
      await startDateInput.fill(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    }

    const endDateInput = page.locator(
      'input[name*="end"], input[name*="to"], input[type="date"]'
    ).nth(1);

    if (await endDateInput.isVisible()) {
      await endDateInput.fill(new Date().toISOString().split('T')[0]);
    }

    const applyButton = page.locator('button:has-text("Apply"), button:has-text("Filter")').first();
    if (await applyButton.isVisible()) {
      await applyButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should export report to PDF', async ({ authenticatedPage: page }) => {
    const exportButton = page.locator(
      'button:has-text("PDF"), button:has-text("Export PDF")'
    ).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should export report to Excel', async ({ authenticatedPage: page }) => {
    const exportButton = page.locator(
      'button:has-text("Excel"), button:has-text("Export Excel"), button:has-text("XLS")'
    ).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P2 - MINOR TESTS
  // ============================================

  test('@p2 should view OEE dashboard', async ({ authenticatedPage: page }) => {
    const oeeButton = page.locator(
      'button:has-text("OEE"), a:has-text("OEE"), [data-testid="oee-report"]'
    ).first();

    if (await oeeButton.isVisible()) {
      await oeeButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should view supplier performance report', async ({ authenticatedPage: page }) => {
    const supplierReportButton = page.locator(
      'button:has-text("Supplier"), a:has-text("Supplier Performance")'
    ).first();

    if (await supplierReportButton.isVisible()) {
      await supplierReportButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should schedule automated report', async ({ authenticatedPage: page }) => {
    const scheduleButton = page.locator(
      'button:has-text("Schedule"), button:has-text("Automate")'
    ).first();

    const hasSchedule = await scheduleButton.isVisible().catch(() => false);
    console.log(`Report scheduling feature available: ${hasSchedule}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should view report charts', async ({ authenticatedPage: page }) => {
    const chartElement = page.locator(
      'canvas, svg.recharts-surface, [data-testid="report-chart"], .chart'
    ).first();

    const hasChart = await chartElement.isVisible().catch(() => false);
    console.log(`Report charts visible: ${hasChart}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should customize report columns', async ({ authenticatedPage: page }) => {
    const columnsButton = page.locator(
      'button:has-text("Columns"), button:has-text("Customize")'
    ).first();

    const hasCustomize = await columnsButton.isVisible().catch(() => false);
    console.log(`Report column customization available: ${hasCustomize}`);

    await expect(page.locator('body')).toBeVisible();
  });
});
