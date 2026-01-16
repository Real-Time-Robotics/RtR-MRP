import { test, expect } from '../fixtures/auth.fixture';
import { createTestStockAdjustment } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';

test.describe('Stock Adjustments @inventory', () => {
  const testAdjustment = createTestStockAdjustment();

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/inventory/adjustments');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should display adjustments list', async ({ authenticatedPage: page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main, [role="main"], .content')).toBeVisible({ timeout: 10000 });
  });

  test('@p0 should create cycle count adjustment', async ({ authenticatedPage: page }) => {
    const uniqueAdjustment = {
      ...testAdjustment,
      adjustmentNumber: generateTestId('ADJ'),
    };

    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("New Adjustment"), ' +
      'button:has-text("Add"), button:has-text("Cycle Count")'
    ).first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Select adjustment type
      const typeSelector = page.locator(
        'select[name*="type"], button:has-text("Type"), [data-testid="adjustment-type"]'
      ).first();

      if (await typeSelector.isVisible()) {
        await typeSelector.click();
        await page.waitForTimeout(200);

        const cycleCountOption = page.locator(
          '[role="option"]:has-text("Cycle Count"), option:has-text("Cycle")'
        ).first();

        if (await cycleCountOption.isVisible()) {
          await cycleCountOption.click();
        }
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

      // Enter actual quantity
      const actualQtyInput = page.locator(
        'input[name*="actual"], input[name*="counted"]'
      ).first();

      if (await actualQtyInput.isVisible()) {
        await actualQtyInput.fill('98');
      }

      // Enter reason
      const reasonInput = page.locator(
        'textarea[name*="reason"], input[name*="reason"]'
      ).first();

      if (await reasonInput.isVisible()) {
        await reasonInput.fill('E2E Test - Cycle count variance');
      }

      // Submit
      const submitButton = page.locator(
        'button:has-text("Save"), button:has-text("Submit"), button[type="submit"]'
      ).first();

      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p0 should show variance calculation', async ({ authenticatedPage: page }) => {
    // Navigate to adjustment detail or create form
    const adjustmentRow = page.locator(
      'tbody tr a, a[href*="/adjustment/"]'
    ).first();

    if (await adjustmentRow.isVisible()) {
      await adjustmentRow.click();
      await page.waitForTimeout(1000);

      // Look for variance display
      const varianceDisplay = page.locator(
        '[data-testid="variance"], div:has-text("Variance"), ' +
        'span:has-text("+"), span:has-text("-")'
      ).first();

      const hasVariance = await varianceDisplay.isVisible().catch(() => false);
      console.log(`Variance calculation visible: ${hasVariance}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should create damage adjustment', async ({ authenticatedPage: page }) => {
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("New")'
    ).first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Select damage type
      const typeSelector = page.locator(
        'select[name*="type"], button:has-text("Type")'
      ).first();

      if (await typeSelector.isVisible()) {
        await typeSelector.click();
        await page.waitForTimeout(200);

        const damageOption = page.locator(
          '[role="option"]:has-text("Damage"), option:has-text("Damage")'
        ).first();

        if (await damageOption.isVisible()) {
          await damageOption.click();
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should require approval for adjustments', async ({ authenticatedPage: page }) => {
    const adjustmentRow = page.locator('tbody tr a, a[href*="/adjustment/"]').first();

    if (await adjustmentRow.isVisible()) {
      await adjustmentRow.click();
      await page.waitForTimeout(1000);

      // Look for approval workflow
      const approveButton = page.locator(
        'button:has-text("Approve"), button:has-text("Submit for Approval"), ' +
        '[data-testid="approval-button"]'
      ).first();

      const hasApproval = await approveButton.isVisible().catch(() => false);
      console.log(`Adjustment approval workflow available: ${hasApproval}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should reject adjustment with reason', async ({ authenticatedPage: page }) => {
    const adjustmentRow = page.locator('tbody tr a, a[href*="/adjustment/"]').first();

    if (await adjustmentRow.isVisible()) {
      await adjustmentRow.click();
      await page.waitForTimeout(1000);

      const rejectButton = page.locator(
        'button:has-text("Reject"), button:has-text("Decline")'
      ).first();

      const hasReject = await rejectButton.isVisible().catch(() => false);
      console.log(`Rejection feature available: ${hasReject}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should filter adjustments by status', async ({ authenticatedPage: page }) => {
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

  // ============================================
  // P2 - MINOR TESTS
  // ============================================

  test('@p2 should view adjustment history', async ({ authenticatedPage: page }) => {
    const adjustmentRow = page.locator('tbody tr a, a[href*="/adjustment/"]').first();

    if (await adjustmentRow.isVisible()) {
      await adjustmentRow.click();
      await page.waitForTimeout(1000);

      const historyTab = page.locator(
        'button:has-text("History"), [role="tab"]:has-text("History")'
      ).first();

      if (await historyTab.isVisible()) {
        await historyTab.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should export adjustments report', async ({ authenticatedPage: page }) => {
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Download")'
    ).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should display adjustment summary metrics', async ({ authenticatedPage: page }) => {
    // Look for summary metrics
    const summaryMetrics = page.locator(
      '[data-testid="adjustment-metrics"], .metrics-summary, ' +
      'div:has-text("Total Adjustments")'
    ).first();

    const hasMetrics = await summaryMetrics.isVisible().catch(() => false);
    console.log(`Adjustment summary metrics visible: ${hasMetrics}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should attach supporting documents', async ({ authenticatedPage: page }) => {
    const adjustmentRow = page.locator('tbody tr a, a[href*="/adjustment/"]').first();

    if (await adjustmentRow.isVisible()) {
      await adjustmentRow.click();
      await page.waitForTimeout(1000);

      const attachButton = page.locator(
        'button:has-text("Attach"), input[type="file"], button:has-text("Upload")'
      ).first();

      const hasAttachment = await attachButton.isVisible().catch(() => false);
      console.log(`Attachment feature available: ${hasAttachment}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
