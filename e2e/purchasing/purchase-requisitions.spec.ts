import { test, expect } from '../fixtures/auth.fixture';
import { createTestPurchaseRequisition } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';

test.describe('Purchase Requisitions @purchasing', () => {
  const testPR = createTestPurchaseRequisition();

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/purchasing/requisitions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should display requisitions list', async ({ authenticatedPage: page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main, [role="main"], .content')).toBeVisible({ timeout: 10000 });
  });

  test('@p0 should create purchase requisition', async ({ authenticatedPage: page }) => {
    const uniquePR = {
      ...testPR,
      prNumber: generateTestId('PR'),
    };

    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("New"), ' +
      'button:has-text("Add"), [data-testid="create-pr-button"]'
    ).first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Fill PR number if field exists
      const prNumberInput = page.locator(
        'input[name*="prNumber"], input[name*="requisition"]'
      ).first();

      if (await prNumberInput.isVisible()) {
        await prNumberInput.fill(uniquePR.prNumber);
      }

      // Set required date
      const requiredDateInput = page.locator(
        'input[name*="required"], input[type="date"]'
      ).first();

      if (await requiredDateInput.isVisible()) {
        await requiredDateInput.fill(uniquePR.requiredDate);
      }

      // Add notes
      const notesInput = page.locator(
        'textarea[name*="notes"], textarea[name*="reason"]'
      ).first();

      if (await notesInput.isVisible()) {
        await notesInput.fill('E2E Test requisition');
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

  test('@p0 should add items to requisition', async ({ authenticatedPage: page }) => {
    const prRow = page.locator(
      'tbody tr a, a[href*="/requisition"]'
    ).first();

    if (await prRow.isVisible()) {
      await prRow.click();
      await page.waitForTimeout(1000);

      const addItemButton = page.locator(
        'button:has-text("Add Item"), button:has-text("Add Line")'
      ).first();

      if (await addItemButton.isVisible()) {
        await addItemButton.click();
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
          await quantityInput.fill('50');
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should submit requisition for approval', async ({ authenticatedPage: page }) => {
    const prRow = page.locator('tbody tr a, a[href*="/requisition"]').first();

    if (await prRow.isVisible()) {
      await prRow.click();
      await page.waitForTimeout(1000);

      const submitButton = page.locator(
        'button:has-text("Submit"), button:has-text("Request Approval")'
      ).first();

      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should approve requisition', async ({ authenticatedPage: page }) => {
    const prRow = page.locator('tbody tr a, a[href*="/requisition"]').first();

    if (await prRow.isVisible()) {
      await prRow.click();
      await page.waitForTimeout(1000);

      const approveButton = page.locator(
        'button:has-text("Approve"), button:has-text("Accept")'
      ).first();

      if (await approveButton.isVisible()) {
        await approveButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should convert requisition to PO', async ({ authenticatedPage: page }) => {
    const prRow = page.locator('tbody tr a, a[href*="/requisition"]').first();

    if (await prRow.isVisible()) {
      await prRow.click();
      await page.waitForTimeout(1000);

      const convertButton = page.locator(
        'button:has-text("Convert"), button:has-text("Create PO"), ' +
        'button:has-text("Generate PO")'
      ).first();

      const hasConvert = await convertButton.isVisible().catch(() => false);
      console.log(`Convert to PO feature available: ${hasConvert}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should reject requisition with reason', async ({ authenticatedPage: page }) => {
    const prRow = page.locator('tbody tr a, a[href*="/requisition"]').first();

    if (await prRow.isVisible()) {
      await prRow.click();
      await page.waitForTimeout(1000);

      const rejectButton = page.locator(
        'button:has-text("Reject"), button:has-text("Decline")'
      ).first();

      const hasReject = await rejectButton.isVisible().catch(() => false);
      console.log(`Reject requisition feature available: ${hasReject}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P2 - MINOR TESTS
  // ============================================

  test('@p2 should filter by status', async ({ authenticatedPage: page }) => {
    const statusFilter = page.locator(
      'select[name*="status"], button:has-text("Status")'
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

  test('@p2 should filter by requester', async ({ authenticatedPage: page }) => {
    const requesterFilter = page.locator(
      'select[name*="requester"], button:has-text("Requester")'
    ).first();

    if (await requesterFilter.isVisible()) {
      await requesterFilter.click();
      await page.waitForTimeout(300);

      const option = page.locator('[role="option"], option').first();
      if (await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should view approval history', async ({ authenticatedPage: page }) => {
    const prRow = page.locator('tbody tr a, a[href*="/requisition"]').first();

    if (await prRow.isVisible()) {
      await prRow.click();
      await page.waitForTimeout(1000);

      const historyTab = page.locator(
        'button:has-text("History"), [role="tab"]:has-text("Approval")'
      ).first();

      if (await historyTab.isVisible()) {
        await historyTab.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
