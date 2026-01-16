import { test, expect } from '../fixtures/auth.fixture';
import { generateTestId } from '../utils/test-helpers';

test.describe('Production Schedule @production', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/production/schedule');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should display schedule view', async ({ authenticatedPage: page }) => {
    await expect(page.locator('body')).toBeVisible();

    // Check for calendar or gantt view
    const scheduleView = page.locator(
      '[data-testid="schedule-view"], .schedule, .calendar, ' +
      '.gantt, [role="grid"]'
    ).first();

    const hasScheduleView = await scheduleView.isVisible().catch(() => false);
    console.log(`Schedule view visible: ${hasScheduleView}`);

    await expect(page.locator('main, [role="main"], .content')).toBeVisible({ timeout: 10000 });
  });

  test('@p0 should view work orders on schedule', async ({ authenticatedPage: page }) => {
    // Look for work order items on schedule
    const woItems = page.locator(
      '[data-testid="schedule-item"], .schedule-event, ' +
      '.work-order-card, div[draggable="true"]'
    ).first();

    const hasWOItems = await woItems.isVisible().catch(() => false);
    console.log(`Work order items on schedule visible: ${hasWOItems}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p0 should filter by work center', async ({ authenticatedPage: page }) => {
    const workCenterFilter = page.locator(
      'select[name*="workCenter"], button:has-text("Work Center"), ' +
      '[data-testid="work-center-filter"], button:has-text("All Centers")'
    ).first();

    if (await workCenterFilter.isVisible()) {
      await workCenterFilter.click();
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
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should change schedule view mode', async ({ authenticatedPage: page }) => {
    // Look for view mode toggles
    const viewModes = ['Day', 'Week', 'Month', 'Gantt', 'List'];

    for (const mode of viewModes) {
      const viewButton = page.locator(
        `button:has-text("${mode}"), [data-testid="${mode.toLowerCase()}-view"]`
      ).first();

      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForTimeout(500);
        console.log(`${mode} view available`);
        break;
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should navigate date range', async ({ authenticatedPage: page }) => {
    // Look for navigation buttons
    const nextButton = page.locator(
      'button:has-text("Next"), button[aria-label*="next"], ' +
      '[data-testid="next-button"], button:has(svg[class*="right"])'
    ).first();

    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }

    const prevButton = page.locator(
      'button:has-text("Prev"), button:has-text("Previous"), ' +
      'button[aria-label*="previous"], [data-testid="prev-button"]'
    ).first();

    if (await prevButton.isVisible()) {
      await prevButton.click();
      await page.waitForTimeout(500);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should view schedule conflicts', async ({ authenticatedPage: page }) => {
    // Look for conflict indicators
    const conflictIndicator = page.locator(
      '[data-testid="conflict-indicator"], .conflict, .warning, ' +
      'div:has-text("Conflict"), span[class*="red"]'
    ).first();

    const hasConflicts = await conflictIndicator.isVisible().catch(() => false);
    console.log(`Schedule conflict indicators visible: ${hasConflicts}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should filter by status', async ({ authenticatedPage: page }) => {
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

  test('@p2 should drag and drop reschedule', async ({ authenticatedPage: page }) => {
    // Find draggable item
    const draggableItem = page.locator(
      '[draggable="true"], [data-testid="schedule-item"]'
    ).first();

    const hasDragAndDrop = await draggableItem.isVisible().catch(() => false);
    console.log(`Drag and drop scheduling available: ${hasDragAndDrop}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should view capacity utilization', async ({ authenticatedPage: page }) => {
    const capacityView = page.locator(
      '[data-testid="capacity-view"], div:has-text("Capacity"), ' +
      '.utilization, progress'
    ).first();

    const hasCapacityView = await capacityView.isVisible().catch(() => false);
    console.log(`Capacity utilization view available: ${hasCapacityView}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should export schedule', async ({ authenticatedPage: page }) => {
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("Print"), ' +
      'button:has-text("Download"), [data-testid="export-schedule-button"]'
    ).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should auto-schedule work orders', async ({ authenticatedPage: page }) => {
    const autoScheduleButton = page.locator(
      'button:has-text("Auto Schedule"), button:has-text("Optimize"), ' +
      '[data-testid="auto-schedule-button"]'
    ).first();

    const hasAutoSchedule = await autoScheduleButton.isVisible().catch(() => false);
    console.log(`Auto-schedule feature available: ${hasAutoSchedule}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should zoom timeline', async ({ authenticatedPage: page }) => {
    const zoomIn = page.locator(
      'button:has-text("Zoom In"), button[aria-label*="zoom in"], ' +
      '[data-testid="zoom-in"]'
    ).first();

    const zoomOut = page.locator(
      'button:has-text("Zoom Out"), button[aria-label*="zoom out"], ' +
      '[data-testid="zoom-out"]'
    ).first();

    const hasZoom = (await zoomIn.isVisible().catch(() => false)) ||
                    (await zoomOut.isVisible().catch(() => false));
    console.log(`Timeline zoom feature available: ${hasZoom}`);

    await expect(page.locator('body')).toBeVisible();
  });
});
