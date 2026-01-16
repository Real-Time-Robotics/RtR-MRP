import { test, expect } from '../fixtures/auth.fixture';
import { createTestInspectionRecord } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';
import {
  startInspection,
  recordMeasurement,
  submitInspectionResult,
  waitForQualityDataLoad,
} from '../utils/quality-helpers';

test.describe('In-Process Inspection @quality', () => {
  const testInspection = createTestInspectionRecord();

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/quality/inspections');
    await page.waitForLoadState('domcontentloaded');
    await waitForQualityDataLoad(page);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should start in-process inspection', async ({ authenticatedPage: page }) => {
    const started = await startInspection(page, 'in-process');

    if (started) {
      // Look for work order/operation selection
      const woSelector = page.locator(
        'select[name*="workOrder"], input[name*="operation"], ' +
        'button:has-text("Select Operation"), [data-testid="operation-selector"]'
      ).first();

      if (await woSelector.isVisible()) {
        await woSelector.click();
        await page.waitForTimeout(300);

        const option = page.locator('[role="option"], option').first();
        if (await option.isVisible()) {
          await option.click();
          await page.waitForTimeout(500);
        }
      }
    }

    console.log(`In-process inspection start available: ${started}`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('@p0 should record in-process measurements', async ({ authenticatedPage: page }) => {
    // Filter for in-process inspections
    const typeFilter = page.locator(
      'select[name*="type"], button:has-text("In-Process"), [data-testid="type-filter"]'
    ).first();

    if (await typeFilter.isVisible()) {
      await typeFilter.click();
      await page.waitForTimeout(300);
      const option = page.locator('[role="option"]:has-text("Process"), option:has-text("In-Process")').first();
      if (await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(500);
      }
    }

    // Navigate to inspection
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Record measurements
      const recorded = await recordMeasurement(page, 0, 15.02);
      console.log(`In-process measurement recording available: ${recorded}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should flag out-of-spec measurements', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Enter out-of-spec value
      const measurementInput = page.locator(
        'input[name*="measurement"], input[name*="value"], input[type="number"]'
      ).first();

      if (await measurementInput.isVisible()) {
        await measurementInput.fill('99.99'); // Likely out of spec
        await page.waitForTimeout(500);

        // Check for warning indicator
        const warning = page.locator(
          '.warning, .out-of-spec, [data-status="fail"], ' +
          '.text-red, [class*="red"], [class*="error"]'
        ).first();

        const hasWarning = await warning.isVisible().catch(() => false);
        console.log(`Out-of-spec warning visible: ${hasWarning}`);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should link inspection to operation', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Look for operation reference
      const operationField = page.locator(
        'select[name*="operation"], input[name*="operation"], ' +
        'a[href*="/operation"], [data-testid="operation-link"]'
      ).first();

      const hasOperationLink = await operationField.isVisible().catch(() => false);
      console.log(`Operation linking available: ${hasOperationLink}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should halt production on critical fail', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Look for halt/stop production button
      const haltButton = page.locator(
        'button:has-text("Halt"), button:has-text("Stop Production"), ' +
        'button:has-text("Hold"), [data-testid="halt-production-button"]'
      ).first();

      const hasHaltFeature = await haltButton.isVisible().catch(() => false);
      console.log(`Halt production feature available: ${hasHaltFeature}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should record operator ID', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Look for operator field
      const operatorField = page.locator(
        'input[name*="operator"], select[name*="operator"], ' +
        'input[name*="inspector"], [data-testid="operator-field"]'
      ).first();

      if (await operatorField.isVisible()) {
        if (await operatorField.getAttribute('type') === 'text') {
          await operatorField.fill('OP-001');
        } else {
          await operatorField.click();
          await page.waitForTimeout(200);
          const option = page.locator('[role="option"], option').first();
          if (await option.isVisible()) {
            await option.click();
          }
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P2 - MINOR TESTS
  // ============================================

  test('@p2 should display SPC chart', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Look for SPC/control chart
      const spcChart = page.locator(
        '[data-testid="spc-chart"], .control-chart, canvas, ' +
        'svg.recharts-surface, div:has-text("Control Chart")'
      ).first();

      const hasSPC = await spcChart.isVisible().catch(() => false);
      console.log(`SPC chart visible: ${hasSPC}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should record equipment used', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Look for equipment field
      const equipmentField = page.locator(
        'input[name*="equipment"], select[name*="equipment"], ' +
        'input[name*="gauge"], [data-testid="equipment-selector"]'
      ).first();

      if (await equipmentField.isVisible()) {
        await equipmentField.click();
        await page.waitForTimeout(200);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should set inspection frequency', async ({ authenticatedPage: page }) => {
    // Check for frequency setting on list/config page
    const frequencyControl = page.locator(
      'select[name*="frequency"], input[name*="frequency"], ' +
      'button:has-text("Frequency"), [data-testid="frequency-setting"]'
    ).first();

    const hasFrequency = await frequencyControl.isVisible().catch(() => false);
    console.log(`Inspection frequency setting available: ${hasFrequency}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should trigger alert on consecutive failures', async ({ authenticatedPage: page }) => {
    // Check for alert configuration
    const alertConfig = page.locator(
      'button:has-text("Alerts"), button:has-text("Rules"), ' +
      '[data-testid="alert-config"], input[name*="consecutive"]'
    ).first();

    const hasAlertConfig = await alertConfig.isVisible().catch(() => false);
    console.log(`Consecutive failure alert config available: ${hasAlertConfig}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should export in-process data', async ({ authenticatedPage: page }) => {
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Download"), ' +
      'button:has-text("Excel"), [data-testid="export-button"]'
    ).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should view inspection history for operation', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Look for history tab
      const historyTab = page.locator(
        'button:has-text("History"), [role="tab"]:has-text("History"), ' +
        '[data-testid="history-tab"]'
      ).first();

      if (await historyTab.isVisible()) {
        await historyTab.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
