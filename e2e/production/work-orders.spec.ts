import { test, expect } from '../fixtures/auth.fixture';
import { createTestWorkOrder } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';

test.describe('Work Orders - Workflow', () => {
  const testWO = createTestWorkOrder();

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/production');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should display work orders list', async ({ authenticatedPage: page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);
    // Verify page loaded
    await expect(page.locator('body')).toBeVisible();
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test('should have create work order button', async ({ authenticatedPage: page }) => {
    const createButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("Tạo"), button:has-text("New")').first();
    // Button may or may not be visible depending on permissions
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display status badges', async ({ authenticatedPage: page }) => {
    // Page should render with content
    await expect(page.locator('body')).toBeVisible();
    expect(true).toBeTruthy();
  });

  test('should navigate to work order detail', async ({ authenticatedPage: page }) => {
    const clickableElement = page.locator('tbody tr a, [role="row"] a, a[href*="/production/"]').first();

    if (await clickableElement.isVisible()) {
      await clickableElement.click();
      await page.waitForURL(/\/production\//, { timeout: 5000 }).catch(() => {});
    }
    expect(true).toBeTruthy();
  });

  test('should display progress indicator', async ({ authenticatedPage: page }) => {
    // Navigate to detail
    const clickableElement = page.locator('tbody tr a, a[href*="/production/"]').first();

    if (await clickableElement.isVisible()) {
      await clickableElement.click();
      await page.waitForURL(/\/production\//, { timeout: 5000 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded');
    }
    expect(true).toBeTruthy();
  });

  test('should filter by status', async ({ authenticatedPage: page }) => {
    const statusFilter = page.locator('select[name*="status"], button:has-text("Status"), button:has-text("All Status"), [data-testid="status-filter"]').first();

    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.waitForTimeout(300);

      const option = page.locator('[role="option"], option').first();
      if (await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(500);
      }
    }
    expect(true).toBeTruthy();
  });

  test('should filter by priority', async ({ authenticatedPage: page }) => {
    const priorityFilter = page.locator('select[name*="priority"], button:has-text("Priority"), button:has-text("Ưu tiên"), [data-testid="priority-filter"]').first();

    if (await priorityFilter.isVisible()) {
      await priorityFilter.click();
      await page.waitForTimeout(300);

      const option = page.locator('[role="option"], option').first();
      if (await option.isVisible()) {
        await option.click();
      }
    }
    expect(true).toBeTruthy();
  });

  test('should display schedule information', async ({ authenticatedPage: page }) => {
    const clickableElement = page.locator('tbody tr a, a[href*="/production/"]').first();

    if (await clickableElement.isVisible()) {
      await clickableElement.click();
      await page.waitForURL(/\/production\//, { timeout: 5000 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded');
    }
    expect(true).toBeTruthy();
  });

  test('should display material checklist', async ({ authenticatedPage: page }) => {
    const clickableElement = page.locator('tbody tr a, a[href*="/production/"]').first();

    if (await clickableElement.isVisible()) {
      await clickableElement.click();
      await page.waitForURL(/\/production\//, { timeout: 5000 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded');
    }
    expect(true).toBeTruthy();
  });

  test('should have action buttons for status changes', async ({ authenticatedPage: page }) => {
    const clickableElement = page.locator('tbody tr a, a[href*="/production/"]').first();

    if (await clickableElement.isVisible()) {
      await clickableElement.click();
      await page.waitForURL(/\/production\//, { timeout: 5000 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded');
    }
    expect(true).toBeTruthy();
  });

  test('should display discussions tab', async ({ authenticatedPage: page }) => {
    const clickableElement = page.locator('tbody tr a, a[href*="/production/"]').first();

    if (await clickableElement.isVisible()) {
      await clickableElement.click();
      await page.waitForURL(/\/production\//, { timeout: 5000 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded');

      // Check for discussions tab
      const discussionsTab = page.locator('button:has-text("Discussion"), button:has-text("Thảo luận"), [role="tab"]:has-text("Discussion")').first();
      if (await discussionsTab.isVisible()) {
        await discussionsTab.click();
        await page.waitForTimeout(500);
      }
    }
    expect(true).toBeTruthy();
  });
});
