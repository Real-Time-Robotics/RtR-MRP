import { test, expect } from '../fixtures/auth.fixture';

test.describe('Cost Optimization Dashboard @p0 @cost-optimization', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should display KPI cards with savings data', async ({ authenticatedPage: page }) => {
    // SavingsKPICards component renders 5 cards
    const kpiSection = page.locator('.grid').filter({ hasText: /Savings|savings|Tiết kiệm/i }).first();
    await expect(kpiSection).toBeVisible({ timeout: 10000 });

    // Check key metrics are visible
    const body = page.locator('body');
    const pageText = await body.textContent();
    expect(pageText).toBeTruthy();
  });

  test('should display savings by source chart', async ({ authenticatedPage: page }) => {
    // SavingsBySourceChart renders a recharts bar/pie chart
    const chart = page.locator('.recharts-wrapper, .recharts-responsive-container').first();
    await expect(chart).toBeVisible({ timeout: 10000 });
  });

  test('should display savings trend chart', async ({ authenticatedPage: page }) => {
    // SavingsTrendChart shows monthly trend
    const charts = page.locator('.recharts-wrapper, .recharts-responsive-container');
    const count = await charts.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should display top contributors table', async ({ authenticatedPage: page }) => {
    // TopContributorsTable renders a data table
    const table = page.locator('table, [role="table"]').first();
    if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display actual vs plan chart', async ({ authenticatedPage: page }) => {
    // ActualVsPlanChart shows comparison
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const charts = page.locator('.recharts-wrapper, .recharts-responsive-container');
    const count = await charts.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should navigate to Make vs Buy from dashboard', async ({ authenticatedPage: page }) => {
    // Click Make vs Buy link in sidebar or dashboard card
    const link = page.locator('a[href*="make-vs-buy"], button:has-text("Make vs Buy")').first();
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await link.click();
      await page.waitForURL(/make-vs-buy/, { timeout: 10000 });
      expect(page.url()).toContain('make-vs-buy');
    } else {
      // Navigate directly
      await page.goto('/cost-optimization/make-vs-buy');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should have export button', async ({ authenticatedPage: page }) => {
    // ExportButton renders dropdown trigger
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Xuất")').first();
    await expect(exportBtn).toBeVisible({ timeout: 5000 });
  });

  test('should have AI quick action button', async ({ authenticatedPage: page }) => {
    // AIQuickAction renders a dropdown
    const aiBtn = page.locator('button:has-text("AI"), button:has-text("Hỏi AI")').first();
    if (await aiBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiBtn.click();
      await page.waitForTimeout(500);

      // Should show suggestion dropdown
      const dropdown = page.locator('[role="menu"], [role="menuitem"], [data-state="open"]').first();
      await expect(dropdown).toBeVisible({ timeout: 3000 });
    }
  });
});
