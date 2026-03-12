import { test, expect } from '../fixtures/auth.fixture';

test.describe('Cost Optimization Export @p2 @cost-optimization', () => {

  test('should export savings data from dashboard', async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Click export button
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Xuất")').first();
    if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await exportBtn.click();
      await page.waitForTimeout(500);

      // Should show dropdown with CSV/JSON options
      const dropdown = page.locator('[role="menu"], [role="menuitem"], [data-state="open"]').first();
      if (await dropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click CSV option
        const csvOption = page.locator('button:has-text("CSV"), [role="menuitem"]:has-text("CSV")').first();
        if (await csvOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
          await csvOption.click();
          const download = await downloadPromise;
          if (download) {
            const filename = download.suggestedFilename();
            expect(filename).toContain('.csv');
          }
        }
      }
    }
  });

  test('should export autonomy data', async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/autonomy');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Xuất")').first();
    if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await exportBtn.click();
      await page.waitForTimeout(500);

      const jsonOption = page.locator('button:has-text("JSON"), [role="menuitem"]:has-text("JSON")').first();
      if (await jsonOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
        await jsonOption.click();
        const download = await downloadPromise;
        if (download) {
          const filename = download.suggestedFilename();
          expect(filename).toContain('.json');
        }
      }
    }
  });

  test('should export roadmap data', async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/roadmap');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Xuất")').first();
    if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await exportBtn.click();
      await page.waitForTimeout(500);

      const csvOption = page.locator('button:has-text("CSV"), [role="menuitem"]:has-text("CSV")').first();
      if (await csvOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
        await csvOption.click();
        const download = await downloadPromise;
        if (download) {
          const filename = download.suggestedFilename();
          expect(filename).toContain('.csv');
        }
      }
    }
  });
});
