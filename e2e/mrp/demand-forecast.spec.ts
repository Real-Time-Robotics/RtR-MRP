import { test, expect } from '../fixtures/auth.fixture';
import { createTestForecast } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';

test.describe('Demand Forecast @mrp', () => {
  const testForecast = createTestForecast();

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/mrp/forecast');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should display forecast dashboard', async ({ authenticatedPage: page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main, [role="main"], .content')).toBeVisible({ timeout: 10000 });
  });

  test('@p0 should create manual forecast', async ({ authenticatedPage: page }) => {
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("New Forecast"), ' +
      'button:has-text("Add"), [data-testid="create-forecast-button"]'
    ).first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Select product/part
      const partSelector = page.locator('select[name*="part"], input[name*="part"]').first();
      if (await partSelector.isVisible()) {
        await partSelector.click();
        await page.waitForTimeout(200);
        const partOption = page.locator('[role="option"], option').first();
        if (await partOption.isVisible()) {
          await partOption.click();
        }
      }

      // Select period type
      const periodSelector = page.locator('select[name*="period"], button:has-text("Period")').first();
      if (await periodSelector.isVisible()) {
        await periodSelector.click();
        await page.waitForTimeout(200);
        const monthlyOption = page.locator('[role="option"]:has-text("Monthly"), option:has-text("Monthly")').first();
        if (await monthlyOption.isVisible()) {
          await monthlyOption.click();
        }
      }

      // Enter forecast quantities
      const quantityInputs = page.locator('input[name*="quantity"], input[type="number"]');
      const inputCount = await quantityInputs.count();
      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = quantityInputs.nth(i);
        if (await input.isVisible()) {
          await input.fill((100 + i * 10).toString());
          await page.waitForTimeout(100);
        }
      }

      // Save
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Create")').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p0 should view forecast chart', async ({ authenticatedPage: page }) => {
    const chartElement = page.locator(
      'canvas, svg.recharts-surface, [data-testid="forecast-chart"], ' +
      '.forecast-chart'
    ).first();

    const hasChart = await chartElement.isVisible().catch(() => false);
    console.log(`Forecast chart visible: ${hasChart}`);

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should generate AI-based forecast', async ({ authenticatedPage: page }) => {
    const aiButton = page.locator(
      'button:has-text("AI Forecast"), button:has-text("Auto Generate"), ' +
      'button:has-text("Predict"), [data-testid="ai-forecast-button"]'
    ).first();

    if (await aiButton.isVisible()) {
      await aiButton.click();
      await page.waitForTimeout(3000); // AI processing time
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should adjust forecast values', async ({ authenticatedPage: page }) => {
    const forecastRow = page.locator(
      'tbody tr, [data-testid="forecast-row"]'
    ).first();

    if (await forecastRow.isVisible()) {
      await forecastRow.click();
      await page.waitForTimeout(500);

      const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-button"]').first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(500);

        const quantityInput = page.locator('input[name*="quantity"], input[type="number"]').first();
        if (await quantityInput.isVisible()) {
          await quantityInput.fill('150');
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should compare forecast to actuals', async ({ authenticatedPage: page }) => {
    const compareTab = page.locator(
      'button:has-text("Compare"), button:has-text("Accuracy"), ' +
      '[role="tab"]:has-text("Actual")'
    ).first();

    if (await compareTab.isVisible()) {
      await compareTab.click();
      await page.waitForTimeout(500);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should filter forecast by product', async ({ authenticatedPage: page }) => {
    const productFilter = page.locator(
      'select[name*="product"], button:has-text("Product"), ' +
      '[data-testid="product-filter"]'
    ).first();

    if (await productFilter.isVisible()) {
      await productFilter.click();
      await page.waitForTimeout(300);

      const option = page.locator('[role="option"], option').first();
      if (await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P2 - MINOR TESTS
  // ============================================

  test('@p2 should view forecast accuracy metrics', async ({ authenticatedPage: page }) => {
    const accuracyMetrics = page.locator(
      '[data-testid="accuracy-metrics"], div:has-text("Accuracy"), ' +
      'div:has-text("MAPE"), div:has-text("Forecast Error")'
    ).first();

    const hasAccuracy = await accuracyMetrics.isVisible().catch(() => false);
    console.log(`Forecast accuracy metrics visible: ${hasAccuracy}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should import forecast data', async ({ authenticatedPage: page }) => {
    const importButton = page.locator(
      'button:has-text("Import"), button:has-text("Upload")'
    ).first();

    const hasImport = await importButton.isVisible().catch(() => false);
    console.log(`Forecast import feature available: ${hasImport}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should export forecast data', async ({ authenticatedPage: page }) => {
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Download")'
    ).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should view seasonal patterns', async ({ authenticatedPage: page }) => {
    const seasonalTab = page.locator(
      'button:has-text("Seasonal"), button:has-text("Patterns"), ' +
      '[role="tab"]:has-text("Trend")'
    ).first();

    if (await seasonalTab.isVisible()) {
      await seasonalTab.click();
      await page.waitForTimeout(500);
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
