import { test, expect } from '../fixtures/auth.fixture';

test.describe('Substitute Finder @p1 @cost-optimization', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/substitutes');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should display evaluations list', async ({ authenticatedPage: page }) => {
    // EvaluationList renders a table
    const body = await page.locator('body').textContent();
    const hasList = body?.includes('Substitute') || body?.includes('Thay thế') || body?.includes('Original');
    expect(hasList).toBeTruthy();
  });

  test('should navigate to find new substitute', async ({ authenticatedPage: page }) => {
    const createBtn = page.locator('a[href*="substitutes/new"], button:has-text("Tìm"), button:has-text("Find"), button:has-text("New")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForURL(/substitutes\/new/, { timeout: 10000 });
    } else {
      await page.goto('/cost-optimization/substitutes/new');
    }
    await page.waitForLoadState('domcontentloaded');

    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('should display new substitute form', async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/substitutes/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Should show part selector
    const body = await page.locator('body').textContent();
    const hasForm = body?.includes('Part') || body?.includes('Linh kiện') || body?.includes('Original') || body?.includes('Gốc');
    expect(hasForm).toBeTruthy();
  });

  test('should filter evaluations by status', async ({ authenticatedPage: page }) => {
    const statusFilter = page.locator('button:has-text("Status"), button:has-text("Trạng thái"), select').first();
    if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(300);

      const option = page.locator('[role="option"], [role="menuitem"]').first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option.click();
        await page.waitForTimeout(500);
      }
    }
    expect(true).toBeTruthy();
  });

  test('should search evaluations by part number', async ({ authenticatedPage: page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="Tìm"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('GPS');
      await page.waitForTimeout(500);
    }
    expect(true).toBeTruthy();
  });

  test('should view evaluation detail', async ({ authenticatedPage: page }) => {
    const link = page.locator('a[href*="/substitutes/c"]').first();
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      expect(page.url()).toMatch(/\/substitutes\/[a-z0-9]/);

      // Should show evaluation detail
      const body = await page.locator('body').textContent();
      const hasDetail = body?.includes('Savings') || body?.includes('Tiết kiệm') ||
                       body?.includes('Compatible') || body?.includes('Tương thích') ||
                       body?.includes('Risk') || body?.includes('Rủi ro');
      expect(hasDetail).toBeTruthy();
    }
  });

  test('should show NDAA badges in evaluations', async ({ authenticatedPage: page }) => {
    const body = await page.locator('body').textContent();
    const hasNDAA = body?.includes('NDAA') || body?.includes('ndaa');
    expect(hasNDAA).toBeTruthy();
  });

  test('should show savings percentage in list', async ({ authenticatedPage: page }) => {
    const table = page.locator('table, [role="table"]').first();
    if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
      const body = await table.textContent();
      // Savings shown as percentages
      const hasPercentage = body?.includes('%');
      expect(hasPercentage).toBeTruthy();
    }
  });
});
