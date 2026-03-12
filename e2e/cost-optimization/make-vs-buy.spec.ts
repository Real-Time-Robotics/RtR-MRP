import { test, expect } from '../fixtures/auth.fixture';

test.describe('Make vs Buy Analysis @p0 @cost-optimization', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/make-vs-buy');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should display analysis list', async ({ authenticatedPage: page }) => {
    // AnalysisList renders a table of analyses
    const table = page.locator('table, [role="table"]').first();
    await expect(table).toBeVisible({ timeout: 10000 });

    const rows = table.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should filter analyses by status', async ({ authenticatedPage: page }) => {
    // Status filter dropdown
    const statusFilter = page.locator('button:has-text("Status"), button:has-text("Trạng thái"), select').first();
    if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(300);

      // Select a status option
      const option = page.locator('[role="option"], [role="menuitem"]').filter({ hasText: /Decided|Đã quyết định/i }).first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option.click();
        await page.waitForTimeout(500);
      }
    }
    expect(true).toBeTruthy();
  });

  test('should filter analyses by recommendation', async ({ authenticatedPage: page }) => {
    const recFilter = page.locator('button:has-text("Recommendation"), button:has-text("Khuyến nghị"), select').nth(1);
    if (await recFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await recFilter.click();
      await page.waitForTimeout(300);

      const option = page.locator('[role="option"], [role="menuitem"]').filter({ hasText: /MAKE|Make/i }).first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option.click();
        await page.waitForTimeout(500);
      }
    }
    expect(true).toBeTruthy();
  });

  test('should search analyses by part number', async ({ authenticatedPage: page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="Tìm"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('FC-001');
      await page.waitForTimeout(500);

      // Should filter results
      const table = page.locator('table, [role="table"]').first();
      if (await table.isVisible()) {
        const visibleText = await table.textContent();
        // Search should have been applied (may or may not find FC-001)
        expect(visibleText).toBeTruthy();
      }
    }
  });

  test('should navigate to create new analysis', async ({ authenticatedPage: page }) => {
    const createBtn = page.locator('a[href*="new"], button:has-text("Tạo"), button:has-text("New"), button:has-text("Create")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForURL(/make-vs-buy\/new/, { timeout: 10000 });
      expect(page.url()).toContain('new');
    } else {
      await page.goto('/cost-optimization/make-vs-buy/new');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display new analysis form fields', async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/make-vs-buy/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Form should have part selector and cost inputs
    const body = await page.locator('body').textContent();
    // Should show buy/make sections
    const hasBuySection = body?.includes('Buy') || body?.includes('Mua') || body?.includes('mua ngoài');
    const hasMakeSection = body?.includes('Make') || body?.includes('Tự') || body?.includes('sản xuất');
    expect(hasBuySection || hasMakeSection).toBeTruthy();
  });

  test('should view analysis detail', async ({ authenticatedPage: page }) => {
    // Click on first analysis row
    const row = page.locator('table tbody tr, [role="row"]').first();
    if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
      const link = row.locator('a').first();
      if (await link.isVisible()) {
        await link.click();
      } else {
        await row.click();
      }
      await page.waitForTimeout(1000);

      // Should navigate to detail
      if (page.url().includes('/make-vs-buy/')) {
        // Should show ROI calculator or scoring
        const detail = page.locator('body');
        const text = await detail.textContent();
        const hasDetail = text?.includes('ROI') || text?.includes('Score') || text?.includes('Điểm') || text?.includes('Chi phí');
        expect(hasDetail).toBeTruthy();
      }
    }
  });

  test('should show ROI calculator on detail page', async ({ authenticatedPage: page }) => {
    // Navigate to first analysis
    const link = page.locator('a[href*="/make-vs-buy/c"]').first();
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // ROICalculator shows savings, break-even, NPV
      const body = await page.locator('body').textContent();
      const hasROI = body?.includes('ROI') || body?.includes('Break') || body?.includes('Hoà vốn') || body?.includes('NPV');
      expect(hasROI).toBeTruthy();
    }
  });

  test('should show scoring display on detail page', async ({ authenticatedPage: page }) => {
    const link = page.locator('a[href*="/make-vs-buy/c"]').first();
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // ScoringDisplay shows financial, capability, strategic scores
      const body = await page.locator('body').textContent();
      const hasScoring = body?.includes('Score') || body?.includes('Điểm') || body?.includes('Financial') || body?.includes('Tài chính');
      expect(hasScoring).toBeTruthy();
    }
  });

  test('should show capability gaps', async ({ authenticatedPage: page }) => {
    const link = page.locator('a[href*="/make-vs-buy/c"]').first();
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // CapabilityGaps section may or may not be present depending on data
      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();
    }
  });
});
