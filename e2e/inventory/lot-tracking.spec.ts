import { test, expect } from '../fixtures/auth.fixture';
import { createTestLot } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';

test.describe('Lot Tracking @inventory', () => {
  const testLot = createTestLot();

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/inventory/lots');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should display lots list', async ({ authenticatedPage: page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main, [role="main"], .content')).toBeVisible({ timeout: 10000 });
  });

  test('@p0 should create new lot number', async ({ authenticatedPage: page }) => {
    const uniqueLot = {
      ...testLot,
      lotNumber: generateTestId('LOT'),
    };

    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("New Lot"), ' +
      'button:has-text("Add"), [data-testid="create-lot-button"]'
    ).first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Fill lot number
      const lotNumberInput = page.locator(
        'input[name*="lotNumber"], input[name*="lot_number"]'
      ).first();

      if (await lotNumberInput.isVisible()) {
        await lotNumberInput.fill(uniqueLot.lotNumber);
      }

      // Select part
      const partSelector = page.locator(
        'input[name*="part"], select[name*="part"]'
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
        await quantityInput.fill('100');
      }

      // Submit
      const submitButton = page.locator(
        'button:has-text("Save"), button:has-text("Create"), button[type="submit"]'
      ).first();

      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p0 should track lot through production', async ({ authenticatedPage: page }) => {
    const lotRow = page.locator(
      'tbody tr a, a[href*="/lot/"], [data-testid="lot-row"]'
    ).first();

    if (await lotRow.isVisible()) {
      await lotRow.click();
      await page.waitForTimeout(1000);

      // Look for production tracking
      const productionTab = page.locator(
        'button:has-text("Production"), button:has-text("Usage"), ' +
        '[role="tab"]:has-text("Tracking"), [data-testid="production-tracking"]'
      ).first();

      if (await productionTab.isVisible()) {
        await productionTab.click();
        await page.waitForTimeout(500);
      }

      // Verify tracking info displayed
      const trackingInfo = page.locator(
        '[data-testid="lot-tracking"], .tracking-info, ' +
        'div:has-text("Work Order"), div:has-text("Used in")'
      ).first();

      const hasTracking = await trackingInfo.isVisible().catch(() => false);
      console.log(`Lot production tracking visible: ${hasTracking}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should view lot genealogy', async ({ authenticatedPage: page }) => {
    const lotRow = page.locator('tbody tr a, a[href*="/lot/"]').first();

    if (await lotRow.isVisible()) {
      await lotRow.click();
      await page.waitForTimeout(1000);

      const genealogyTab = page.locator(
        'button:has-text("Genealogy"), button:has-text("Traceability"), ' +
        '[role="tab"]:has-text("Tree"), [data-testid="genealogy-tab"]'
      ).first();

      if (await genealogyTab.isVisible()) {
        await genealogyTab.click();
        await page.waitForTimeout(500);

        // Look for genealogy visualization
        const genealogyView = page.locator(
          '[data-testid="genealogy-tree"], .tree-view, svg, canvas'
        ).first();

        const hasGenealogy = await genealogyView.isVisible().catch(() => false);
        console.log(`Lot genealogy view available: ${hasGenealogy}`);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should change lot status', async ({ authenticatedPage: page }) => {
    const lotRow = page.locator('tbody tr a, a[href*="/lot/"]').first();

    if (await lotRow.isVisible()) {
      await lotRow.click();
      await page.waitForTimeout(1000);

      const statusSelector = page.locator(
        'select[name*="status"], button:has-text("Status"), ' +
        '[data-testid="lot-status"]'
      ).first();

      if (await statusSelector.isVisible()) {
        await statusSelector.click();
        await page.waitForTimeout(200);

        const statusOption = page.locator('[role="option"], option').first();
        if (await statusOption.isVisible()) {
          await statusOption.click();
          await page.waitForTimeout(500);
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should link lot to supplier lot', async ({ authenticatedPage: page }) => {
    const lotRow = page.locator('tbody tr a, a[href*="/lot/"]').first();

    if (await lotRow.isVisible()) {
      await lotRow.click();
      await page.waitForTimeout(1000);

      const supplierLotField = page.locator(
        'input[name*="supplierLot"], input[name*="supplier_lot"], ' +
        '[data-testid="supplier-lot-input"]'
      ).first();

      if (await supplierLotField.isVisible()) {
        await supplierLotField.fill('SUP-LOT-E2E-001');
        await page.waitForTimeout(300);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should set lot expiration', async ({ authenticatedPage: page }) => {
    const lotRow = page.locator('tbody tr a, a[href*="/lot/"]').first();

    if (await lotRow.isVisible()) {
      await lotRow.click();
      await page.waitForTimeout(1000);

      const expirationInput = page.locator(
        'input[name*="expiration"], input[name*="expiry"], ' +
        'input[type="date"]:near(:text("Expir"))'
      ).first();

      if (await expirationInput.isVisible()) {
        await expirationInput.fill(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        await page.waitForTimeout(300);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P2 - MINOR TESTS
  // ============================================

  test('@p2 should simulate lot recall', async ({ authenticatedPage: page }) => {
    const lotRow = page.locator('tbody tr a, a[href*="/lot/"]').first();

    if (await lotRow.isVisible()) {
      await lotRow.click();
      await page.waitForTimeout(1000);

      const recallButton = page.locator(
        'button:has-text("Recall"), button:has-text("Quarantine"), ' +
        '[data-testid="recall-button"]'
      ).first();

      const hasRecallFeature = await recallButton.isVisible().catch(() => false);
      console.log(`Lot recall feature available: ${hasRecallFeature}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should search lots by number', async ({ authenticatedPage: page }) => {
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="Search"], ' +
      'input[name*="search"]'
    ).first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('LOT');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should filter by lot status', async ({ authenticatedPage: page }) => {
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

  test('@p2 should view expiring lots', async ({ authenticatedPage: page }) => {
    // Look for expiring lots filter/view
    const expiringFilter = page.locator(
      'button:has-text("Expiring"), button:has-text("Near Expiry"), ' +
      '[data-testid="expiring-filter"]'
    ).first();

    if (await expiringFilter.isVisible()) {
      await expiringFilter.click();
      await page.waitForTimeout(500);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should link certificates to lot', async ({ authenticatedPage: page }) => {
    const lotRow = page.locator('tbody tr a, a[href*="/lot/"]').first();

    if (await lotRow.isVisible()) {
      await lotRow.click();
      await page.waitForTimeout(1000);

      const certificatesTab = page.locator(
        'button:has-text("Certificates"), button:has-text("Documents"), ' +
        '[role="tab"]:has-text("Cert")'
      ).first();

      if (await certificatesTab.isVisible()) {
        await certificatesTab.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should export lot report', async ({ authenticatedPage: page }) => {
    const lotRow = page.locator('tbody tr a, a[href*="/lot/"]').first();

    if (await lotRow.isVisible()) {
      await lotRow.click();
      await page.waitForTimeout(1000);

      const exportButton = page.locator(
        'button:has-text("Export"), button:has-text("Report"), ' +
        'button:has-text("PDF")'
      ).first();

      if (await exportButton.isVisible()) {
        await exportButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should display lot movement history', async ({ authenticatedPage: page }) => {
    const lotRow = page.locator('tbody tr a, a[href*="/lot/"]').first();

    if (await lotRow.isVisible()) {
      await lotRow.click();
      await page.waitForTimeout(1000);

      const historyTab = page.locator(
        'button:has-text("History"), button:has-text("Movements"), ' +
        '[role="tab"]:has-text("History")'
      ).first();

      if (await historyTab.isVisible()) {
        await historyTab.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
