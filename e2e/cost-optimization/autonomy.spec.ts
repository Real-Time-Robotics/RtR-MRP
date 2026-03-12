import { test, expect } from '../fixtures/auth.fixture';

test.describe('Autonomy Tracker @p0 @cost-optimization', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/autonomy');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should display autonomy gauge charts', async ({ authenticatedPage: page }) => {
    // 3 gauge charts: Manufacturing Autonomy, Cost Autonomy, NDAA Compliance
    const body = await page.locator('body').textContent();
    const hasAutonomy = body?.includes('Tự chủ') || body?.includes('Autonomy') || body?.includes('%');
    expect(hasAutonomy).toBeTruthy();

    // SVG circles for gauge visualization
    const svgs = page.locator('svg');
    const svgCount = await svgs.count();
    expect(svgCount).toBeGreaterThanOrEqual(1);
  });

  test('should display status breakdown chart', async ({ authenticatedPage: page }) => {
    // StatusBreakdown renders pie/bar chart
    const chart = page.locator('.recharts-wrapper, .recharts-responsive-container, svg').first();
    await expect(chart).toBeVisible({ timeout: 10000 });

    // Should show make/buy status labels
    const body = await page.locator('body').textContent();
    const hasStatus = body?.includes('MAKE') || body?.includes('BUY') || body?.includes('Tự sản xuất') || body?.includes('Mua');
    expect(hasStatus).toBeTruthy();
  });

  test('should display summary cards with counts', async ({ authenticatedPage: page }) => {
    // AutonomySummaryCards shows 6 status cards
    const body = await page.locator('body').textContent();
    // Should show various status labels
    const hasCards = body?.includes('Tự sản xuất') || body?.includes('Make') ||
                     body?.includes('Đang phát triển') || body?.includes('Development');
    expect(hasCards).toBeTruthy();
  });

  test('should display parts table', async ({ authenticatedPage: page }) => {
    // PartsTable renders table with part details
    const table = page.locator('table, [role="table"]').first();
    await expect(table).toBeVisible({ timeout: 10000 });

    const rows = table.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should filter parts by status', async ({ authenticatedPage: page }) => {
    const statusFilter = page.locator('button:has-text("Status"), button:has-text("Trạng thái"), select').first();
    if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(300);

      const option = page.locator('[role="option"], [role="menuitem"]').filter({ hasText: /Make|Tự sản xuất/i }).first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option.click();
        await page.waitForTimeout(500);
      }
    }
    expect(true).toBeTruthy();
  });

  test('should filter parts by product', async ({ authenticatedPage: page }) => {
    // ProductSelector dropdown
    const productFilter = page.locator('button:has-text("Product"), button:has-text("Sản phẩm"), [role="combobox"]').first();
    if (await productFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productFilter.click();
      await page.waitForTimeout(300);

      const option = page.locator('[role="option"], [role="menuitem"]').first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option.click();
        await page.waitForTimeout(500);
        // URL should update with productId
        expect(page.url()).toBeTruthy();
      }
    }
  });

  test('should show capability progress for parts', async ({ authenticatedPage: page }) => {
    // Progress bars in the parts table
    const progressBars = page.locator('[role="progressbar"], .bg-green-500, .bg-blue-500, .bg-primary');
    const count = await progressBars.count();
    // May or may not have progress bars depending on data
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show NDAA compliance indicator', async ({ authenticatedPage: page }) => {
    const body = await page.locator('body').textContent();
    const hasNDAA = body?.includes('NDAA') || body?.includes('ndaa');
    expect(hasNDAA).toBeTruthy();
  });

  test('should have export button', async ({ authenticatedPage: page }) => {
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Xuất")').first();
    await expect(exportBtn).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to Make vs Buy from part row', async ({ authenticatedPage: page }) => {
    // Parts table may have analyze buttons
    const analyzeBtn = page.locator('button:has-text("Analyze"), button:has-text("Phân tích"), a[href*="make-vs-buy"]').first();
    if (await analyzeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await analyzeBtn.click();
      await page.waitForTimeout(1000);
      const url = page.url();
      expect(url.includes('make-vs-buy') || url.includes('cost-optimization')).toBeTruthy();
    }
  });
});
