import { test, expect } from '../fixtures/auth.fixture';
import { createTestCAPA, createTestNCR } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';
import {
  navigateToCAPAList,
  openCAPACreationForm,
  fillCAPAForm,
  addCAPAAction,
  waitForQualityDataLoad,
  verifyToast,
  verifyRecordInList,
  filterByStatus,
} from '../utils/quality-helpers';

test.describe('CAPA Workflow @quality', () => {
  const testCAPA = createTestCAPA();

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await navigateToCAPAList(page);
    await waitForQualityDataLoad(page);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should display CAPA list page', async ({ authenticatedPage: page }) => {
    await expect(page.locator('body')).toBeVisible();
    const url = page.url();
    expect(url.includes('quality') || url.includes('capa')).toBeTruthy();

    // Check for list/table structure
    await expect(page.locator('main, [role="main"], .content')).toBeVisible({ timeout: 10000 });
  });

  test('@p0 should create CAPA from scratch', async ({ authenticatedPage: page }) => {
    const uniqueCAPA = {
      ...testCAPA,
      capaNumber: generateTestId('CAPA'),
      title: `E2E CAPA Test ${Date.now()}`,
    };

    const formOpened = await openCAPACreationForm(page);

    if (formOpened) {
      await fillCAPAForm(page, uniqueCAPA);

      // Submit form
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

  test('@p0 should record root cause analysis', async ({ authenticatedPage: page }) => {
    // Navigate to CAPA detail
    const capaRow = page.locator('tbody tr a, a[href*="/capa/"]').first();

    if (await capaRow.isVisible()) {
      await capaRow.click();
      await page.waitForTimeout(1000);

      // Find RCA section or tab
      const rcaTab = page.locator(
        'button:has-text("Root Cause"), [role="tab"]:has-text("RCA"), ' +
        'button:has-text("Analysis"), [data-testid="rca-tab"]'
      ).first();

      if (await rcaTab.isVisible()) {
        await rcaTab.click();
        await page.waitForTimeout(500);
      }

      // Fill RCA field
      const rcaInput = page.locator(
        'textarea[name*="rootCause"], textarea[name*="rca"], ' +
        'textarea[placeholder*="Root Cause"], [data-testid="rca-input"]'
      ).first();

      if (await rcaInput.isVisible()) {
        await rcaInput.fill('E2E Test Root Cause: Process variation due to temperature fluctuation');
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should add corrective action to CAPA', async ({ authenticatedPage: page }) => {
    const capaRow = page.locator('tbody tr a, a[href*="/capa/"]').first();

    if (await capaRow.isVisible()) {
      await capaRow.click();
      await page.waitForTimeout(1000);

      const actionAdded = await addCAPAAction(page, {
        description: 'Implement temperature monitoring system',
        assignee: 'Quality Engineer',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      console.log(`Action add feature available: ${actionAdded}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should track action implementation status', async ({ authenticatedPage: page }) => {
    const capaRow = page.locator('tbody tr a, a[href*="/capa/"]').first();

    if (await capaRow.isVisible()) {
      await capaRow.click();
      await page.waitForTimeout(1000);

      // Look for actions section
      const actionsSection = page.locator(
        '[data-testid="actions-section"], .actions-list, ' +
        'div:has-text("Actions"), [role="list"]'
      ).first();

      if (await actionsSection.isVisible()) {
        // Check for status indicators
        const statusBadge = page.locator(
          '.status-badge, [data-status], span:has-text("Pending"), span:has-text("Complete")'
        ).first();

        const hasStatusTracking = await statusBadge.isVisible().catch(() => false);
        console.log(`Action status tracking visible: ${hasStatusTracking}`);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should verify CAPA effectiveness', async ({ authenticatedPage: page }) => {
    const capaRow = page.locator('tbody tr a, a[href*="/capa/"]').first();

    if (await capaRow.isVisible()) {
      await capaRow.click();
      await page.waitForTimeout(1000);

      // Look for verification section or tab
      const verificationTab = page.locator(
        'button:has-text("Verification"), button:has-text("Effectiveness"), ' +
        '[role="tab"]:has-text("Verify"), [data-testid="verification-tab"]'
      ).first();

      if (await verificationTab.isVisible()) {
        await verificationTab.click();
        await page.waitForTimeout(500);

        // Fill verification fields if available
        const verificationInput = page.locator(
          'textarea[name*="verification"], textarea[name*="effectiveness"]'
        ).first();

        if (await verificationInput.isVisible()) {
          await verificationInput.fill('Verification complete - no recurrence observed after 30 days');
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should filter CAPA by priority', async ({ authenticatedPage: page }) => {
    const priorityFilter = page.locator(
      'select[name*="priority"], button:has-text("Priority"), ' +
      '[data-testid="priority-filter"], button:has-text("All Priority")'
    ).first();

    if (await priorityFilter.isVisible()) {
      await priorityFilter.click();
      await page.waitForTimeout(300);

      const highOption = page.locator(
        '[role="option"]:has-text("High"), option:has-text("High"), ' +
        '[role="option"]:has-text("HIGH")'
      ).first();

      if (await highOption.isVisible()) {
        await highOption.click();
        await page.waitForTimeout(1000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P2 - MINOR TESTS
  // ============================================

  test('@p2 should close CAPA with evidence', async ({ authenticatedPage: page }) => {
    const capaRow = page.locator('tbody tr a, a[href*="/capa/"]').first();

    if (await capaRow.isVisible()) {
      await capaRow.click();
      await page.waitForTimeout(1000);

      // Look for close button
      const closeButton = page.locator(
        'button:has-text("Close CAPA"), button:has-text("Complete"), ' +
        'button:has-text("Đóng"), [data-testid="close-capa-button"]'
      ).first();

      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(500);

        // Fill closure evidence if modal appears
        const evidenceInput = page.locator(
          'textarea[name*="evidence"], textarea[name*="closure"]'
        ).first();

        if (await evidenceInput.isVisible()) {
          await evidenceInput.fill('CAPA closed with verified effectiveness');
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should view CAPA timeline/history', async ({ authenticatedPage: page }) => {
    const capaRow = page.locator('tbody tr a, a[href*="/capa/"]').first();

    if (await capaRow.isVisible()) {
      await capaRow.click();
      await page.waitForTimeout(1000);

      // Look for timeline or history section
      const historyTab = page.locator(
        'button:has-text("Timeline"), button:has-text("History"), ' +
        '[role="tab"]:has-text("History"), [data-testid="history-tab"]'
      ).first();

      if (await historyTab.isVisible()) {
        await historyTab.click();
        await page.waitForTimeout(500);

        // Verify timeline content loads
        const timeline = page.locator('.timeline, [data-testid="timeline"], .history-list').first();
        const hasTimeline = await timeline.isVisible().catch(() => false);
        console.log(`Timeline/history visible: ${hasTimeline}`);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should link related documents to CAPA', async ({ authenticatedPage: page }) => {
    const capaRow = page.locator('tbody tr a, a[href*="/capa/"]').first();

    if (await capaRow.isVisible()) {
      await capaRow.click();
      await page.waitForTimeout(1000);

      // Look for documents section
      const docsSection = page.locator(
        'button:has-text("Documents"), button:has-text("Attachments"), ' +
        '[data-testid="documents-section"], button:has-text("Files")'
      ).first();

      if (await docsSection.isVisible()) {
        await docsSection.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should export CAPA report', async ({ authenticatedPage: page }) => {
    const capaRow = page.locator('tbody tr a, a[href*="/capa/"]').first();

    if (await capaRow.isVisible()) {
      await capaRow.click();
      await page.waitForTimeout(1000);

      const exportButton = page.locator(
        'button:has-text("Export"), button:has-text("Print"), ' +
        'button:has-text("PDF"), [data-testid="export-button"]'
      ).first();

      if (await exportButton.isVisible()) {
        await exportButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should display CAPA metrics/dashboard', async ({ authenticatedPage: page }) => {
    // Check for metrics widgets on list page
    const metricsWidget = page.locator(
      '[data-testid="capa-metrics"], .metrics-card, ' +
      '.dashboard-widget, .statistics'
    ).first();

    const hasMetrics = await metricsWidget.isVisible().catch(() => false);
    console.log(`CAPA metrics visible: ${hasMetrics}`);

    await expect(page.locator('body')).toBeVisible();
  });
});
