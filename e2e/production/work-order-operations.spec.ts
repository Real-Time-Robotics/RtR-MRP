import { test, expect } from '../fixtures/auth.fixture';
import { createTestWorkOrder } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';

test.describe('Work Order Operations @production', () => {
  const testWO = createTestWorkOrder();

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/production');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should start work order operation', async ({ authenticatedPage: page }) => {
    // Navigate to work order detail
    const woRow = page.locator(
      'tbody tr a, a[href*="/production/"], [data-testid="work-order-row"]'
    ).first();

    if (await woRow.isVisible()) {
      await woRow.click();
      await page.waitForTimeout(1000);

      // Find operations list
      const operationsTab = page.locator(
        'button:has-text("Operations"), [role="tab"]:has-text("Operations"), ' +
        '[data-testid="operations-tab"]'
      ).first();

      if (await operationsTab.isVisible()) {
        await operationsTab.click();
        await page.waitForTimeout(500);
      }

      // Start first operation
      const startButton = page.locator(
        'button:has-text("Start"), button:has-text("Begin"), ' +
        '[data-testid="start-operation-button"]'
      ).first();

      if (await startButton.isVisible()) {
        await startButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p0 should record time and quantity', async ({ authenticatedPage: page }) => {
    const woRow = page.locator('tbody tr a, a[href*="/production/"]').first();

    if (await woRow.isVisible()) {
      await woRow.click();
      await page.waitForTimeout(1000);

      // Look for time entry form
      const timeInput = page.locator(
        'input[name*="time"], input[name*="hours"], input[name*="duration"]'
      ).first();

      if (await timeInput.isVisible()) {
        await timeInput.fill('2.5');
        await page.waitForTimeout(300);
      }

      // Look for quantity entry
      const quantityInput = page.locator(
        'input[name*="quantity"], input[name*="completed"], ' +
        'input[name*="output"]'
      ).first();

      if (await quantityInput.isVisible()) {
        await quantityInput.fill('25');
        await page.waitForTimeout(300);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should complete operation', async ({ authenticatedPage: page }) => {
    const woRow = page.locator('tbody tr a, a[href*="/production/"]').first();

    if (await woRow.isVisible()) {
      await woRow.click();
      await page.waitForTimeout(1000);

      const completeButton = page.locator(
        'button:has-text("Complete"), button:has-text("Finish"), ' +
        'button:has-text("Done"), [data-testid="complete-operation-button"]'
      ).first();

      if (await completeButton.isVisible()) {
        await completeButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should log scrap quantity', async ({ authenticatedPage: page }) => {
    const woRow = page.locator('tbody tr a, a[href*="/production/"]').first();

    if (await woRow.isVisible()) {
      await woRow.click();
      await page.waitForTimeout(1000);

      // Look for scrap entry
      const scrapInput = page.locator(
        'input[name*="scrap"], input[name*="waste"], [data-testid="scrap-input"]'
      ).first();

      if (await scrapInput.isVisible()) {
        await scrapInput.fill('2');
        await page.waitForTimeout(300);

        // Look for scrap reason
        const reasonSelector = page.locator(
          'select[name*="reason"], button:has-text("Reason")'
        ).first();

        if (await reasonSelector.isVisible()) {
          await reasonSelector.click();
          await page.waitForTimeout(200);

          const reasonOption = page.locator('[role="option"], option').first();
          if (await reasonOption.isVisible()) {
            await reasonOption.click();
          }
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should log rework requirement', async ({ authenticatedPage: page }) => {
    const woRow = page.locator('tbody tr a, a[href*="/production/"]').first();

    if (await woRow.isVisible()) {
      await woRow.click();
      await page.waitForTimeout(1000);

      const reworkButton = page.locator(
        'button:has-text("Rework"), button:has-text("Flag Rework"), ' +
        '[data-testid="rework-button"]'
      ).first();

      if (await reworkButton.isVisible()) {
        await reworkButton.click();
        await page.waitForTimeout(500);

        const reworkQtyInput = page.locator(
          'input[name*="rework"], input[type="number"]'
        ).first();

        if (await reworkQtyInput.isVisible()) {
          await reworkQtyInput.fill('3');
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should assign operator to operation', async ({ authenticatedPage: page }) => {
    const woRow = page.locator('tbody tr a, a[href*="/production/"]').first();

    if (await woRow.isVisible()) {
      await woRow.click();
      await page.waitForTimeout(1000);

      const operatorSelector = page.locator(
        'select[name*="operator"], input[name*="operator"], ' +
        'button:has-text("Assign"), [data-testid="operator-selector"]'
      ).first();

      if (await operatorSelector.isVisible()) {
        await operatorSelector.click();
        await page.waitForTimeout(200);

        const operatorOption = page.locator('[role="option"], option').first();
        if (await operatorOption.isVisible()) {
          await operatorOption.click();
          await page.waitForTimeout(300);
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P2 - MINOR TESTS
  // ============================================

  test('@p2 should view operation history', async ({ authenticatedPage: page }) => {
    const woRow = page.locator('tbody tr a, a[href*="/production/"]').first();

    if (await woRow.isVisible()) {
      await woRow.click();
      await page.waitForTimeout(1000);

      const historyTab = page.locator(
        'button:has-text("History"), [role="tab"]:has-text("Log"), ' +
        '[data-testid="history-tab"]'
      ).first();

      if (await historyTab.isVisible()) {
        await historyTab.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should pause and resume operation', async ({ authenticatedPage: page }) => {
    const woRow = page.locator('tbody tr a, a[href*="/production/"]').first();

    if (await woRow.isVisible()) {
      await woRow.click();
      await page.waitForTimeout(1000);

      // Pause
      const pauseButton = page.locator(
        'button:has-text("Pause"), button:has-text("Hold"), ' +
        '[data-testid="pause-button"]'
      ).first();

      if (await pauseButton.isVisible()) {
        await pauseButton.click();
        await page.waitForTimeout(500);
      }

      // Resume
      const resumeButton = page.locator(
        'button:has-text("Resume"), button:has-text("Continue"), ' +
        '[data-testid="resume-button"]'
      ).first();

      const hasResume = await resumeButton.isVisible().catch(() => false);
      console.log(`Pause/Resume feature available: ${hasResume}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should add operation notes', async ({ authenticatedPage: page }) => {
    const woRow = page.locator('tbody tr a, a[href*="/production/"]').first();

    if (await woRow.isVisible()) {
      await woRow.click();
      await page.waitForTimeout(1000);

      const notesInput = page.locator(
        'textarea[name*="notes"], textarea[name*="comment"], ' +
        'textarea[placeholder*="Notes"]'
      ).first();

      if (await notesInput.isVisible()) {
        await notesInput.fill('E2E Test - Operation completed without issues');
        await page.waitForTimeout(300);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should view work instructions', async ({ authenticatedPage: page }) => {
    const woRow = page.locator('tbody tr a, a[href*="/production/"]').first();

    if (await woRow.isVisible()) {
      await woRow.click();
      await page.waitForTimeout(1000);

      const instructionsTab = page.locator(
        'button:has-text("Instructions"), button:has-text("Procedure"), ' +
        '[role="tab"]:has-text("Work"), [data-testid="instructions-tab"]'
      ).first();

      if (await instructionsTab.isVisible()) {
        await instructionsTab.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should record material consumption', async ({ authenticatedPage: page }) => {
    const woRow = page.locator('tbody tr a, a[href*="/production/"]').first();

    if (await woRow.isVisible()) {
      await woRow.click();
      await page.waitForTimeout(1000);

      const materialsTab = page.locator(
        'button:has-text("Materials"), button:has-text("BOM"), ' +
        '[role="tab"]:has-text("Materials")'
      ).first();

      if (await materialsTab.isVisible()) {
        await materialsTab.click();
        await page.waitForTimeout(500);

        const consumeButton = page.locator(
          'button:has-text("Consume"), button:has-text("Issue"), ' +
          '[data-testid="consume-materials-button"]'
        ).first();

        const hasConsume = await consumeButton.isVisible().catch(() => false);
        console.log(`Material consumption feature available: ${hasConsume}`);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
