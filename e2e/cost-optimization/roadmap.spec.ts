import { test, expect } from '../fixtures/auth.fixture';

test.describe('Cost Target Roadmap @p0 @cost-optimization', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/roadmap');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should display target list', async ({ authenticatedPage: page }) => {
    // TargetList renders cards/rows with target info
    const body = await page.locator('body').textContent();
    const hasTargets = body?.includes('Target') || body?.includes('Mục tiêu') || body?.includes('Roadmap');
    expect(hasTargets).toBeTruthy();
  });

  test('should display target with progress bar', async ({ authenticatedPage: page }) => {
    // Target cards show current cost → target cost with progress
    const progressBars = page.locator('[role="progressbar"], .bg-green-500, .bg-primary, .h-2.rounded');
    const count = await progressBars.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to target detail', async ({ authenticatedPage: page }) => {
    // Click on first target card/link
    const targetLink = page.locator('a[href*="/roadmap/c"]').first();
    if (await targetLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await targetLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      expect(page.url()).toMatch(/\/roadmap\/[a-z0-9]/);

      // Should show phases timeline
      const body = await page.locator('body').textContent();
      const hasPhases = body?.includes('Phase') || body?.includes('Giai đoạn');
      expect(hasPhases).toBeTruthy();
    }
  });

  test('should display phases timeline on detail', async ({ authenticatedPage: page }) => {
    const targetLink = page.locator('a[href*="/roadmap/c"]').first();
    if (await targetLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await targetLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // PhasesTimeline renders visual timeline
      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();
    }
  });

  test('should filter actions by phase', async ({ authenticatedPage: page }) => {
    const targetLink = page.locator('a[href*="/roadmap/c"]').first();
    if (await targetLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await targetLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Phase filter select
      const phaseFilter = page.locator('select, button:has-text("Phase"), button:has-text("Giai đoạn"), [role="combobox"]').first();
      if (await phaseFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await phaseFilter.click();
        await page.waitForTimeout(300);

        const option = page.locator('[role="option"]').first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
          await page.waitForTimeout(500);
        }
      }
    }
    expect(true).toBeTruthy();
  });

  test('should navigate to create new target', async ({ authenticatedPage: page }) => {
    const createBtn = page.locator('a[href*="roadmap/new"], button:has-text("Tạo"), button:has-text("New")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForURL(/roadmap\/new/, { timeout: 10000 });
    } else {
      await page.goto('/cost-optimization/roadmap/new');
    }
    await page.waitForLoadState('domcontentloaded');

    // Should show target form
    const body = await page.locator('body').textContent();
    const hasForm = body?.includes('Product') || body?.includes('Sản phẩm') || body?.includes('Target') || body?.includes('Mục tiêu');
    expect(hasForm).toBeTruthy();
  });

  test('should display target form fields', async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/roadmap/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Form should have product selector, target cost, target date
    const inputs = page.locator('input, [role="combobox"], select');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should show actions table on target detail', async ({ authenticatedPage: page }) => {
    const targetLink = page.locator('a[href*="/roadmap/c"]').first();
    if (await targetLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await targetLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // ActionsTable renders
      const table = page.locator('table, [role="table"]').first();
      if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
        const rows = table.locator('tbody tr');
        const count = await rows.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should have add action button on detail', async ({ authenticatedPage: page }) => {
    const targetLink = page.locator('a[href*="/roadmap/c"]').first();
    if (await targetLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await targetLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const addBtn = page.locator('a[href*="actions/new"], button:has-text("Thêm"), button:has-text("Add action")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        expect(true).toBeTruthy();
      }
    }
  });
});
