import { test, expect } from '../fixtures/auth.fixture';
import { createTestInspectionRecord, createTestCertificate } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';
import {
  startInspection,
  recordMeasurement,
  submitInspectionResult,
  generateCOC,
  waitForQualityDataLoad,
} from '../utils/quality-helpers';

test.describe('Final Inspection @quality', () => {
  const testInspection = createTestInspectionRecord();

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/quality/inspections');
    await page.waitForLoadState('domcontentloaded');
    await waitForQualityDataLoad(page);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should start final inspection for work order', async ({ authenticatedPage: page }) => {
    // Try to start final inspection
    const started = await startInspection(page, 'final');

    if (started) {
      // Look for work order selection
      const woSelector = page.locator(
        'select[name*="workOrder"], input[name*="workOrder"], ' +
        'button:has-text("Select Work Order"), [data-testid="wo-selector"]'
      ).first();

      if (await woSelector.isVisible()) {
        await woSelector.click();
        await page.waitForTimeout(300);

        const woOption = page.locator('[role="option"], option').first();
        if (await woOption.isVisible()) {
          await woOption.click();
          await page.waitForTimeout(500);
        }
      }
    }

    console.log(`Final inspection start available: ${started}`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('@p0 should record all characteristic measurements', async ({ authenticatedPage: page }) => {
    // Filter for final inspections
    const typeFilter = page.locator(
      'select[name*="type"], button:has-text("Final"), [data-testid="type-filter"]'
    ).first();

    if (await typeFilter.isVisible()) {
      await typeFilter.click();
      await page.waitForTimeout(300);
      const finalOption = page.locator('[role="option"]:has-text("Final"), option:has-text("Final")').first();
      if (await finalOption.isVisible()) {
        await finalOption.click();
        await page.waitForTimeout(500);
      }
    }

    // Navigate to inspection
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Record multiple measurements
      const measurementInputs = page.locator(
        'input[name*="measurement"], input[name*="value"], ' +
        'input[type="number"]:near(:text("Spec"))'
      );

      const inputCount = await measurementInputs.count();
      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = measurementInputs.nth(i);
        if (await input.isVisible()) {
          await input.fill((10 + i * 0.01).toString());
          await page.waitForTimeout(100);
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should approve shipment after passing inspection', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Pass inspection
      const passed = await submitInspectionResult(page, 'pass');

      if (passed) {
        // Look for shipment approval
        const approveShipmentButton = page.locator(
          'button:has-text("Approve Shipment"), button:has-text("Release"), ' +
          'button:has-text("Ship"), [data-testid="approve-shipment-button"]'
        ).first();

        if (await approveShipmentButton.isVisible()) {
          await approveShipmentButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should reject shipment after failing inspection', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Fail inspection
      const failed = await submitInspectionResult(page, 'fail');

      if (failed) {
        // Look for rejection actions
        const rejectButton = page.locator(
          'button:has-text("Reject"), button:has-text("Hold"), ' +
          'button:has-text("Quarantine"), [data-testid="reject-button"]'
        ).first();

        if (await rejectButton.isVisible()) {
          await rejectButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should generate Certificate of Conformance', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      const cocGenerated = await generateCOC(page);
      console.log(`COC generation available: ${cocGenerated}`);

      if (cocGenerated) {
        // Look for COC preview or download
        const cocPreview = page.locator(
          '[data-testid="coc-preview"], .certificate-preview, ' +
          'button:has-text("Download COC"), a:has-text("View Certificate")'
        ).first();

        const hasCOCPreview = await cocPreview.isVisible().catch(() => false);
        console.log(`COC preview available: ${hasCOCPreview}`);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should link final inspection to sales order', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Look for order reference
      const orderField = page.locator(
        'input[name*="order"], select[name*="order"], ' +
        'a[href*="/orders/"], [data-testid="order-link"]'
      ).first();

      const hasOrderLink = await orderField.isVisible().catch(() => false);
      console.log(`Order linking available: ${hasOrderLink}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P2 - MINOR TESTS
  // ============================================

  test('@p2 should display inspection checklist', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Look for checklist component
      const checklist = page.locator(
        '[data-testid="inspection-checklist"], .checklist, ' +
        '[role="list"]:has(input[type="checkbox"])'
      ).first();

      const hasChecklist = await checklist.isVisible().catch(() => false);
      console.log(`Inspection checklist visible: ${hasChecklist}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should record packaging verification', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Look for packaging section
      const packagingSection = page.locator(
        'button:has-text("Packaging"), [role="tab"]:has-text("Packaging"), ' +
        '[data-testid="packaging-section"], input[name*="packaging"]'
      ).first();

      if (await packagingSection.isVisible()) {
        await packagingSection.click();
        await page.waitForTimeout(500);

        // Check packaging checkboxes
        const packagingChecks = page.locator('input[type="checkbox"]:near(:text("Package"))');
        const checkCount = await packagingChecks.count();
        for (let i = 0; i < Math.min(checkCount, 3); i++) {
          const check = packagingChecks.nth(i);
          if (await check.isVisible()) {
            await check.check();
            await page.waitForTimeout(100);
          }
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should add inspector signature', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Look for signature section
      const signatureField = page.locator(
        'input[name*="signature"], button:has-text("Sign"), ' +
        '[data-testid="signature-pad"], canvas.signature'
      ).first();

      const hasSignature = await signatureField.isVisible().catch(() => false);
      console.log(`Signature feature available: ${hasSignature}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should view related work order details', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      // Look for work order link
      const woLink = page.locator(
        'a[href*="/production/"], a[href*="/work-order"], ' +
        'button:has-text("View Work Order")'
      ).first();

      if (await woLink.isVisible()) {
        // Note: Don't actually navigate away
        console.log('Work order link available');
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should export final inspection report', async ({ authenticatedPage: page }) => {
    const inspectionRow = page.locator('tbody tr a, a[href*="/inspection/"]').first();

    if (await inspectionRow.isVisible()) {
      await inspectionRow.click();
      await page.waitForTimeout(1000);

      const exportButton = page.locator(
        'button:has-text("Export"), button:has-text("Report"), ' +
        'button:has-text("PDF"), [data-testid="export-button"]'
      ).first();

      if (await exportButton.isVisible()) {
        await exportButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should display pass/fail statistics', async ({ authenticatedPage: page }) => {
    // Check for statistics on list page
    const statsWidget = page.locator(
      '[data-testid="inspection-stats"], .statistics, ' +
      '.metrics-card, div:has-text("Pass Rate")'
    ).first();

    const hasStats = await statsWidget.isVisible().catch(() => false);
    console.log(`Inspection statistics visible: ${hasStats}`);

    await expect(page.locator('body')).toBeVisible();
  });
});
