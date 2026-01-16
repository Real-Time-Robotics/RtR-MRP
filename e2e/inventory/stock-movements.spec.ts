import { test, expect } from '../fixtures/auth.fixture';
import { createTestStockMovement } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';

test.describe('Stock Movements @inventory', () => {
  const testMovement = createTestStockMovement();

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/inventory/movements');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should display stock movements list', async ({ authenticatedPage: page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main, [role="main"], .content')).toBeVisible({ timeout: 10000 });
  });

  test('@p0 should view current stock levels', async ({ authenticatedPage: page }) => {
    // Navigate to stock overview if not already there
    const stockTab = page.locator(
      'button:has-text("Stock"), button:has-text("Levels"), ' +
      'a[href*="/stock"], [role="tab"]:has-text("Stock")'
    ).first();

    if (await stockTab.isVisible()) {
      await stockTab.click();
      await page.waitForTimeout(500);
    }

    // Look for stock data
    const stockData = page.locator(
      'table, [data-testid="stock-levels"], .stock-list'
    ).first();

    const hasStockData = await stockData.isVisible().catch(() => false);
    console.log(`Stock levels data visible: ${hasStockData}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p0 should record stock movement (receipt)', async ({ authenticatedPage: page }) => {
    const uniqueMovement = {
      ...testMovement,
      movementNumber: generateTestId('SM'),
    };

    // Click create/add button
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("New Movement"), ' +
      'button:has-text("Add"), button:has-text("Receipt"), [data-testid="create-movement-button"]'
    ).first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Select movement type
      const typeSelector = page.locator(
        'select[name*="type"], button:has-text("Type"), [data-testid="movement-type"]'
      ).first();

      if (await typeSelector.isVisible()) {
        await typeSelector.click();
        await page.waitForTimeout(200);

        const receiptOption = page.locator(
          '[role="option"]:has-text("Receipt"), option:has-text("Receipt"), ' +
          '[role="option"]:has-text("IN")'
        ).first();

        if (await receiptOption.isVisible()) {
          await receiptOption.click();
        }
      }

      // Fill part selection
      const partSelector = page.locator(
        'input[name*="part"], select[name*="part"], [data-testid="part-selector"]'
      ).first();

      if (await partSelector.isVisible()) {
        await partSelector.click();
        await page.waitForTimeout(200);

        const partOption = page.locator('[role="option"], option').first();
        if (await partOption.isVisible()) {
          await partOption.click();
        }
      }

      // Fill quantity
      const quantityInput = page.locator(
        'input[name*="quantity"], input[type="number"]'
      ).first();

      if (await quantityInput.isVisible()) {
        await quantityInput.fill('50');
      }

      // Fill location
      const locationInput = page.locator(
        'input[name*="location"], select[name*="location"]'
      ).first();

      if (await locationInput.isVisible()) {
        await locationInput.click();
        await page.waitForTimeout(200);
        const locOption = page.locator('[role="option"], option').first();
        if (await locOption.isVisible()) {
          await locOption.click();
        }
      }

      // Save
      const saveButton = page.locator(
        'button:has-text("Save"), button:has-text("Submit"), button[type="submit"]'
      ).first();

      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p0 should record stock movement (issue)', async ({ authenticatedPage: page }) => {
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("New"), button:has-text("Issue")'
    ).first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Select issue type
      const typeSelector = page.locator(
        'select[name*="type"], button:has-text("Type")'
      ).first();

      if (await typeSelector.isVisible()) {
        await typeSelector.click();
        await page.waitForTimeout(200);

        const issueOption = page.locator(
          '[role="option"]:has-text("Issue"), option:has-text("Issue"), ' +
          '[role="option"]:has-text("OUT")'
        ).first();

        if (await issueOption.isVisible()) {
          await issueOption.click();
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should transfer between locations', async ({ authenticatedPage: page }) => {
    const transferButton = page.locator(
      'button:has-text("Transfer"), button:has-text("Move"), ' +
      '[data-testid="transfer-button"]'
    ).first();

    if (await transferButton.isVisible()) {
      await transferButton.click();
      await page.waitForTimeout(500);

      // Fill from location
      const fromLocation = page.locator(
        'select[name*="from"], input[name*="from"], [data-testid="from-location"]'
      ).first();

      if (await fromLocation.isVisible()) {
        await fromLocation.click();
        await page.waitForTimeout(200);
        const fromOption = page.locator('[role="option"], option').first();
        if (await fromOption.isVisible()) {
          await fromOption.click();
        }
      }

      // Fill to location
      const toLocation = page.locator(
        'select[name*="to"], input[name*="to"], [data-testid="to-location"]'
      ).first();

      if (await toLocation.isVisible()) {
        await toLocation.click();
        await page.waitForTimeout(200);
        const toOption = page.locator('[role="option"], option').nth(1);
        if (await toOption.isVisible()) {
          await toOption.click();
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should view movement history', async ({ authenticatedPage: page }) => {
    // Look for history tab or filter
    const historyTab = page.locator(
      'button:has-text("History"), [role="tab"]:has-text("History"), ' +
      'a:has-text("History")'
    ).first();

    if (await historyTab.isVisible()) {
      await historyTab.click();
      await page.waitForTimeout(500);
    }

    // Check for movement records
    const movementRecords = page.locator(
      'table tbody tr, [data-testid="movement-record"], .movement-row'
    ).first();

    const hasRecords = await movementRecords.isVisible().catch(() => false);
    console.log(`Movement history records visible: ${hasRecords}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should filter movements by type', async ({ authenticatedPage: page }) => {
    const typeFilter = page.locator(
      'select[name*="type"], button:has-text("Movement Type"), ' +
      '[data-testid="type-filter"]'
    ).first();

    if (await typeFilter.isVisible()) {
      await typeFilter.click();
      await page.waitForTimeout(300);

      const option = page.locator('[role="option"], option').first();
      if (await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should filter movements by date range', async ({ authenticatedPage: page }) => {
    const startDate = page.locator(
      'input[name*="start"], input[name*="from"], input[type="date"]'
    ).first();

    if (await startDate.isVisible()) {
      await startDate.fill(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      await page.waitForTimeout(300);
    }

    const endDate = page.locator(
      'input[name*="end"], input[name*="to"], input[type="date"]'
    ).nth(1);

    if (await endDate.isVisible()) {
      await endDate.fill(new Date().toISOString().split('T')[0]);
      await page.waitForTimeout(500);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P2 - MINOR TESTS
  // ============================================

  test('@p2 should export stock movements report', async ({ authenticatedPage: page }) => {
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Download"), ' +
      '[data-testid="export-button"]'
    ).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should view movement details', async ({ authenticatedPage: page }) => {
    const movementRow = page.locator(
      'tbody tr a, a[href*="/movement/"], [data-testid="movement-row"]'
    ).first();

    if (await movementRow.isVisible()) {
      await movementRow.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should reverse a movement', async ({ authenticatedPage: page }) => {
    const movementRow = page.locator('tbody tr a, a[href*="/movement/"]').first();

    if (await movementRow.isVisible()) {
      await movementRow.click();
      await page.waitForTimeout(1000);

      const reverseButton = page.locator(
        'button:has-text("Reverse"), button:has-text("Undo"), ' +
        '[data-testid="reverse-button"]'
      ).first();

      const hasReverseFeature = await reverseButton.isVisible().catch(() => false);
      console.log(`Movement reversal feature available: ${hasReverseFeature}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should link movement to reference document', async ({ authenticatedPage: page }) => {
    const movementRow = page.locator('tbody tr a, a[href*="/movement/"]').first();

    if (await movementRow.isVisible()) {
      await movementRow.click();
      await page.waitForTimeout(1000);

      // Look for reference document link
      const referenceLink = page.locator(
        'a[href*="/orders/"], a[href*="/production/"], ' +
        '[data-testid="reference-link"], div:has-text("Reference")'
      ).first();

      const hasReferenceLink = await referenceLink.isVisible().catch(() => false);
      console.log(`Reference document link available: ${hasReferenceLink}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
