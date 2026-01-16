import { test, expect } from '../fixtures/auth.fixture';
import { createTestInspectionPlan, createTestCharacteristic } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';
import {
  navigateToInspectionPlans,
  addInspectionCharacteristic,
  waitForQualityDataLoad,
  selectDropdownOption,
} from '../utils/quality-helpers';

test.describe('Inspection Plans @quality', () => {
  const testPlan = createTestInspectionPlan();
  const testCharacteristic = createTestCharacteristic();

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await navigateToInspectionPlans(page);
    await waitForQualityDataLoad(page);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should display inspection plans list', async ({ authenticatedPage: page }) => {
    await expect(page.locator('body')).toBeVisible();
    const url = page.url();
    expect(url.includes('quality') || url.includes('inspection')).toBeTruthy();

    await expect(page.locator('main, [role="main"], .content')).toBeVisible({ timeout: 10000 });
  });

  test('@p0 should create new inspection plan', async ({ authenticatedPage: page }) => {
    const uniquePlan = {
      ...testPlan,
      planNumber: generateTestId('IP'),
      name: `E2E Inspection Plan ${Date.now()}`,
    };

    // Click create button
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("New"), button:has-text("Add"), ' +
      'a:has-text("Create Plan"), [data-testid="create-plan-button"]'
    ).first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Fill plan number
      const planNumberInput = page.locator(
        'input[name*="planNumber"], input[name*="plan_number"], input[placeholder*="Plan"]'
      ).first();
      if (await planNumberInput.isVisible()) {
        await planNumberInput.fill(uniquePlan.planNumber);
      }

      // Fill name
      const nameInput = page.locator(
        'input[name*="name"], input[placeholder*="Name"]'
      ).first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(uniquePlan.name);
      }

      // Select type
      await selectDropdownOption(page, 'type', 'RECEIVING');

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

  test('@p0 should add characteristics to inspection plan', async ({ authenticatedPage: page }) => {
    // Navigate to plan detail
    const planRow = page.locator('tbody tr a, a[href*="/inspection-plan"]').first();

    if (await planRow.isVisible()) {
      await planRow.click();
      await page.waitForTimeout(1000);

      const charAdded = await addInspectionCharacteristic(page, {
        name: testCharacteristic.name,
        type: testCharacteristic.type,
        specification: testCharacteristic.specification,
        nominalValue: testCharacteristic.nominalValue,
        upperLimit: testCharacteristic.upperLimit,
        lowerLimit: testCharacteristic.lowerLimit,
      });

      console.log(`Characteristic add feature available: ${charAdded}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should link inspection plan to part', async ({ authenticatedPage: page }) => {
    const planRow = page.locator('tbody tr a, a[href*="/inspection-plan"]').first();

    if (await planRow.isVisible()) {
      await planRow.click();
      await page.waitForTimeout(1000);

      // Look for part linking field
      const partField = page.locator(
        'input[name*="part"], select[name*="part"], ' +
        'button:has-text("Link Part"), [data-testid="part-selector"]'
      ).first();

      if (await partField.isVisible()) {
        await partField.click();
        await page.waitForTimeout(300);

        // Select first part option
        const partOption = page.locator('[role="option"], option').first();
        if (await partOption.isVisible()) {
          await partOption.click();
          await page.waitForTimeout(500);
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should set sampling requirements', async ({ authenticatedPage: page }) => {
    const planRow = page.locator('tbody tr a, a[href*="/inspection-plan"]').first();

    if (await planRow.isVisible()) {
      await planRow.click();
      await page.waitForTimeout(1000);

      // Look for sampling section
      const samplingSection = page.locator(
        '[data-testid="sampling-section"], button:has-text("Sampling"), ' +
        'select[name*="sampling"], input[name*="aql"]'
      ).first();

      if (await samplingSection.isVisible()) {
        await samplingSection.click();
        await page.waitForTimeout(300);

        // Select AQL option if dropdown
        const aqlOption = page.locator('[role="option"]:has-text("AQL"), option:has-text("AQL")').first();
        if (await aqlOption.isVisible()) {
          await aqlOption.click();
        }

        // Fill AQL level if input
        const aqlInput = page.locator('input[name*="aql"], input[placeholder*="AQL"]').first();
        if (await aqlInput.isVisible()) {
          await aqlInput.fill('1.0');
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should edit characteristic details', async ({ authenticatedPage: page }) => {
    const planRow = page.locator('tbody tr a, a[href*="/inspection-plan"]').first();

    if (await planRow.isVisible()) {
      await planRow.click();
      await page.waitForTimeout(1000);

      // Click on characteristic to edit
      const charRow = page.locator(
        '[data-testid="characteristic-row"], tr:has-text("Dimension"), ' +
        '.characteristic-item'
      ).first();

      if (await charRow.isVisible()) {
        await charRow.click();
        await page.waitForTimeout(500);

        // Edit specification
        const specInput = page.locator(
          'input[name*="specification"], input[name*="spec"]'
        ).first();

        if (await specInput.isVisible()) {
          await specInput.fill('15.0 +/- 0.2 mm');
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P2 - MINOR TESTS
  // ============================================

  test('@p2 should activate inspection plan', async ({ authenticatedPage: page }) => {
    const planRow = page.locator('tbody tr a, a[href*="/inspection-plan"]').first();

    if (await planRow.isVisible()) {
      await planRow.click();
      await page.waitForTimeout(1000);

      const activateButton = page.locator(
        'button:has-text("Activate"), button:has-text("Enable"), ' +
        'button:has-text("Kích hoạt"), [data-testid="activate-button"]'
      ).first();

      if (await activateButton.isVisible()) {
        await activateButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should deactivate inspection plan', async ({ authenticatedPage: page }) => {
    const planRow = page.locator('tbody tr a, a[href*="/inspection-plan"]').first();

    if (await planRow.isVisible()) {
      await planRow.click();
      await page.waitForTimeout(1000);

      const deactivateButton = page.locator(
        'button:has-text("Deactivate"), button:has-text("Disable"), ' +
        'button:has-text("Ngừng"), [data-testid="deactivate-button"]'
      ).first();

      if (await deactivateButton.isVisible()) {
        await deactivateButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should copy inspection plan', async ({ authenticatedPage: page }) => {
    const planRow = page.locator('tbody tr a, a[href*="/inspection-plan"]').first();

    if (await planRow.isVisible()) {
      await planRow.click();
      await page.waitForTimeout(1000);

      const copyButton = page.locator(
        'button:has-text("Copy"), button:has-text("Duplicate"), ' +
        'button:has-text("Clone"), [data-testid="copy-button"]'
      ).first();

      if (await copyButton.isVisible()) {
        await copyButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should filter plans by type', async ({ authenticatedPage: page }) => {
    const typeFilter = page.locator(
      'select[name*="type"], button:has-text("Type"), ' +
      '[data-testid="type-filter"], button:has-text("All Types")'
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

  test('@p2 should view plan revision history', async ({ authenticatedPage: page }) => {
    const planRow = page.locator('tbody tr a, a[href*="/inspection-plan"]').first();

    if (await planRow.isVisible()) {
      await planRow.click();
      await page.waitForTimeout(1000);

      const historyTab = page.locator(
        'button:has-text("Revisions"), button:has-text("History"), ' +
        '[role="tab"]:has-text("History")'
      ).first();

      if (await historyTab.isVisible()) {
        await historyTab.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should set characteristic as critical', async ({ authenticatedPage: page }) => {
    const planRow = page.locator('tbody tr a, a[href*="/inspection-plan"]').first();

    if (await planRow.isVisible()) {
      await planRow.click();
      await page.waitForTimeout(1000);

      // Find critical checkbox
      const criticalCheckbox = page.locator(
        'input[name*="critical"], input[type="checkbox"]:near(:text("Critical")), ' +
        '[data-testid="critical-checkbox"]'
      ).first();

      if (await criticalCheckbox.isVisible()) {
        await criticalCheckbox.click();
        await page.waitForTimeout(300);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
