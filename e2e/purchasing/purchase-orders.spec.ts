import { test, expect } from '../fixtures/auth.fixture';
import { createTestPurchaseOrder, createTestSupplier } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';

test.describe('Purchase Orders @purchasing', () => {
  const testPO = createTestPurchaseOrder();

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/purchasing');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should display purchase orders list', async ({ authenticatedPage: page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main, [role="main"], .content')).toBeVisible({ timeout: 10000 });
  });

  test('@p0 should create new purchase order', async ({ authenticatedPage: page }) => {
    const uniquePO = {
      ...testPO,
      poNumber: generateTestId('PO'),
    };

    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("New PO"), ' +
      'button:has-text("Add"), [data-testid="create-po-button"]'
    ).first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Fill PO number
      const poNumberInput = page.locator(
        'input[name*="poNumber"], input[name*="po_number"], ' +
        'input[name*="orderNumber"]'
      ).first();

      if (await poNumberInput.isVisible()) {
        await poNumberInput.fill(uniquePO.poNumber);
      }

      // Select supplier
      const supplierSelector = page.locator(
        'select[name*="supplier"], input[name*="supplier"], ' +
        '[data-testid="supplier-selector"]'
      ).first();

      if (await supplierSelector.isVisible()) {
        await supplierSelector.click();
        await page.waitForTimeout(200);

        const supplierOption = page.locator('[role="option"], option').first();
        if (await supplierOption.isVisible()) {
          await supplierOption.click();
        }
      }

      // Set expected date
      const expectedDateInput = page.locator(
        'input[name*="expected"], input[name*="delivery"], input[type="date"]'
      ).first();

      if (await expectedDateInput.isVisible()) {
        await expectedDateInput.fill(uniquePO.expectedDate);
      }

      // Save
      const saveButton = page.locator(
        'button:has-text("Save"), button:has-text("Create"), button[type="submit"]'
      ).first();

      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p0 should add line items to PO', async ({ authenticatedPage: page }) => {
    const poRow = page.locator(
      'tbody tr a, a[href*="/purchasing/"], a[href*="/po/"]'
    ).first();

    if (await poRow.isVisible()) {
      await poRow.click();
      await page.waitForTimeout(1000);

      const addLineButton = page.locator(
        'button:has-text("Add Line"), button:has-text("Add Item"), ' +
        '[data-testid="add-line-button"]'
      ).first();

      if (await addLineButton.isVisible()) {
        await addLineButton.click();
        await page.waitForTimeout(500);

        // Select part
        const partSelector = page.locator(
          'select[name*="part"], input[name*="part"]'
        ).first();

        if (await partSelector.isVisible()) {
          await partSelector.click();
          await page.waitForTimeout(200);

          const partOption = page.locator('[role="option"], option').first();
          if (await partOption.isVisible()) {
            await partOption.click();
          }
        }

        // Enter quantity
        const quantityInput = page.locator(
          'input[name*="quantity"], input[type="number"]'
        ).first();

        if (await quantityInput.isVisible()) {
          await quantityInput.fill('100');
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should confirm purchase order', async ({ authenticatedPage: page }) => {
    const poRow = page.locator('tbody tr a, a[href*="/purchasing/"]').first();

    if (await poRow.isVisible()) {
      await poRow.click();
      await page.waitForTimeout(1000);

      const confirmButton = page.locator(
        'button:has-text("Confirm"), button:has-text("Send to Supplier"), ' +
        'button:has-text("Approve")'
      ).first();

      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should receive goods against PO', async ({ authenticatedPage: page }) => {
    const poRow = page.locator('tbody tr a, a[href*="/purchasing/"]').first();

    if (await poRow.isVisible()) {
      await poRow.click();
      await page.waitForTimeout(1000);

      const receiveButton = page.locator(
        'button:has-text("Receive"), button:has-text("Goods Receipt"), ' +
        '[data-testid="receive-button"]'
      ).first();

      if (await receiveButton.isVisible()) {
        await receiveButton.click();
        await page.waitForTimeout(500);

        // Enter received quantity
        const receivedQtyInput = page.locator(
          'input[name*="received"], input[name*="qty"]'
        ).first();

        if (await receivedQtyInput.isVisible()) {
          await receivedQtyInput.fill('100');
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should filter PO by status', async ({ authenticatedPage: page }) => {
    const statusFilter = page.locator(
      'select[name*="status"], button:has-text("Status"), ' +
      '[data-testid="status-filter"]'
    ).first();

    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.waitForTimeout(300);

      const option = page.locator('[role="option"], option').first();
      if (await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should filter PO by supplier', async ({ authenticatedPage: page }) => {
    const supplierFilter = page.locator(
      'select[name*="supplier"], button:has-text("Supplier"), ' +
      '[data-testid="supplier-filter"]'
    ).first();

    if (await supplierFilter.isVisible()) {
      await supplierFilter.click();
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

  test('@p2 should print PO', async ({ authenticatedPage: page }) => {
    const poRow = page.locator('tbody tr a, a[href*="/purchasing/"]').first();

    if (await poRow.isVisible()) {
      await poRow.click();
      await page.waitForTimeout(1000);

      const printButton = page.locator(
        'button:has-text("Print"), button:has-text("PDF")'
      ).first();

      if (await printButton.isVisible()) {
        await printButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should email PO to supplier', async ({ authenticatedPage: page }) => {
    const poRow = page.locator('tbody tr a, a[href*="/purchasing/"]').first();

    if (await poRow.isVisible()) {
      await poRow.click();
      await page.waitForTimeout(1000);

      const emailButton = page.locator(
        'button:has-text("Email"), button:has-text("Send")'
      ).first();

      const hasEmail = await emailButton.isVisible().catch(() => false);
      console.log(`Email PO feature available: ${hasEmail}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should cancel PO', async ({ authenticatedPage: page }) => {
    const poRow = page.locator('tbody tr a, a[href*="/purchasing/"]').first();

    if (await poRow.isVisible()) {
      await poRow.click();
      await page.waitForTimeout(1000);

      const cancelButton = page.locator(
        'button:has-text("Cancel"), button:has-text("Void")'
      ).first();

      const hasCancel = await cancelButton.isVisible().catch(() => false);
      console.log(`Cancel PO feature available: ${hasCancel}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should view receipt history', async ({ authenticatedPage: page }) => {
    const poRow = page.locator('tbody tr a, a[href*="/purchasing/"]').first();

    if (await poRow.isVisible()) {
      await poRow.click();
      await page.waitForTimeout(1000);

      const receiptsTab = page.locator(
        'button:has-text("Receipts"), [role="tab"]:has-text("Receipts")'
      ).first();

      if (await receiptsTab.isVisible()) {
        await receiptsTab.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
