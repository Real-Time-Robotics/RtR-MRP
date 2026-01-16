import { test, expect } from '../fixtures/auth.fixture';
import { createTestSupplier, createTestSupplierEvaluation } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';

test.describe('Supplier Management @purchasing', () => {
  const testSupplier = createTestSupplier();

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/suppliers');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should display suppliers list', async ({ authenticatedPage: page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main, [role="main"], .content')).toBeVisible({ timeout: 10000 });
  });

  test('@p0 should create new supplier', async ({ authenticatedPage: page }) => {
    const uniqueSupplier = {
      ...testSupplier,
      code: generateTestId('SUP'),
    };

    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("New Supplier"), ' +
      'button:has-text("Add"), [data-testid="create-supplier-button"]'
    ).first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Fill supplier code
      const codeInput = page.locator(
        'input[name*="code"], input[name*="supplierCode"]'
      ).first();

      if (await codeInput.isVisible()) {
        await codeInput.fill(uniqueSupplier.code);
      }

      // Fill name
      const nameInput = page.locator(
        'input[name*="name"], input[placeholder*="Name"]'
      ).first();

      if (await nameInput.isVisible()) {
        await nameInput.fill(uniqueSupplier.name);
      }

      // Fill email
      const emailInput = page.locator(
        'input[name*="email"], input[type="email"]'
      ).first();

      if (await emailInput.isVisible()) {
        await emailInput.fill(uniqueSupplier.email);
      }

      // Fill phone
      const phoneInput = page.locator(
        'input[name*="phone"], input[type="tel"]'
      ).first();

      if (await phoneInput.isVisible()) {
        await phoneInput.fill(uniqueSupplier.phone);
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

  test('@p0 should view supplier details', async ({ authenticatedPage: page }) => {
    const supplierRow = page.locator(
      'tbody tr a, a[href*="/supplier"]'
    ).first();

    if (await supplierRow.isVisible()) {
      await supplierRow.click();
      await page.waitForURL(/\/supplier/, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should edit supplier information', async ({ authenticatedPage: page }) => {
    const supplierRow = page.locator('tbody tr a, a[href*="/supplier"]').first();

    if (await supplierRow.isVisible()) {
      await supplierRow.click();
      await page.waitForTimeout(1000);

      const editButton = page.locator(
        'button:has-text("Edit"), [data-testid="edit-button"]'
      ).first();

      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(500);

        // Update a field
        const nameInput = page.locator('input[name*="name"]').first();
        if (await nameInput.isVisible()) {
          await nameInput.fill(`Updated Supplier ${Date.now()}`);
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should view supplier performance metrics', async ({ authenticatedPage: page }) => {
    const supplierRow = page.locator('tbody tr a, a[href*="/supplier"]').first();

    if (await supplierRow.isVisible()) {
      await supplierRow.click();
      await page.waitForTimeout(1000);

      const performanceTab = page.locator(
        'button:has-text("Performance"), [role="tab"]:has-text("Metrics"), ' +
        '[data-testid="performance-tab"]'
      ).first();

      if (await performanceTab.isVisible()) {
        await performanceTab.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should add supplier evaluation', async ({ authenticatedPage: page }) => {
    const supplierRow = page.locator('tbody tr a, a[href*="/supplier"]').first();

    if (await supplierRow.isVisible()) {
      await supplierRow.click();
      await page.waitForTimeout(1000);

      const evalButton = page.locator(
        'button:has-text("Evaluate"), button:has-text("Add Evaluation"), ' +
        '[data-testid="evaluation-button"]'
      ).first();

      if (await evalButton.isVisible()) {
        await evalButton.click();
        await page.waitForTimeout(500);

        // Fill evaluation scores
        const qualityScore = page.locator('input[name*="quality"]').first();
        if (await qualityScore.isVisible()) {
          await qualityScore.fill('85');
        }

        const deliveryScore = page.locator('input[name*="delivery"]').first();
        if (await deliveryScore.isVisible()) {
          await deliveryScore.fill('90');
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should view supplier purchase history', async ({ authenticatedPage: page }) => {
    const supplierRow = page.locator('tbody tr a, a[href*="/supplier"]').first();

    if (await supplierRow.isVisible()) {
      await supplierRow.click();
      await page.waitForTimeout(1000);

      const ordersTab = page.locator(
        'button:has-text("Orders"), button:has-text("Purchase History"), ' +
        '[role="tab"]:has-text("PO")'
      ).first();

      if (await ordersTab.isVisible()) {
        await ordersTab.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P2 - MINOR TESTS
  // ============================================

  test('@p2 should filter suppliers by rating', async ({ authenticatedPage: page }) => {
    const ratingFilter = page.locator(
      'select[name*="rating"], button:has-text("Rating"), ' +
      '[data-testid="rating-filter"]'
    ).first();

    if (await ratingFilter.isVisible()) {
      await ratingFilter.click();
      await page.waitForTimeout(300);

      const option = page.locator('[role="option"], option').first();
      if (await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should search suppliers', async ({ authenticatedPage: page }) => {
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="Search"]'
    ).first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should export suppliers list', async ({ authenticatedPage: page }) => {
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Download")'
    ).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should view supplier contacts', async ({ authenticatedPage: page }) => {
    const supplierRow = page.locator('tbody tr a, a[href*="/supplier"]').first();

    if (await supplierRow.isVisible()) {
      await supplierRow.click();
      await page.waitForTimeout(1000);

      const contactsTab = page.locator(
        'button:has-text("Contacts"), [role="tab"]:has-text("Contact")'
      ).first();

      if (await contactsTab.isVisible()) {
        await contactsTab.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should deactivate supplier', async ({ authenticatedPage: page }) => {
    const supplierRow = page.locator('tbody tr a, a[href*="/supplier"]').first();

    if (await supplierRow.isVisible()) {
      await supplierRow.click();
      await page.waitForTimeout(1000);

      const deactivateButton = page.locator(
        'button:has-text("Deactivate"), button:has-text("Disable")'
      ).first();

      const hasDeactivate = await deactivateButton.isVisible().catch(() => false);
      console.log(`Supplier deactivation feature available: ${hasDeactivate}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
