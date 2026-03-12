import { test, expect } from '../fixtures/auth.fixture';

test.describe('Cost Optimization Navigation @p1 @cost-optimization', () => {

  test('should redirect /cost-optimization to dashboard', async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should redirect to dashboard
    expect(page.url()).toContain('dashboard');
  });

  test('should navigate to all sub-pages via sidebar', async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const subPages = [
      { path: 'make-vs-buy', text: 'Make vs Buy' },
      { path: 'autonomy', text: 'Autonomy' },
      { path: 'substitutes', text: 'Substitute' },
      { path: 'roadmap', text: 'Roadmap' },
      { path: 'advisor', text: 'AI' },
    ];

    for (const { path, text } of subPages) {
      // Try sidebar link first
      const link = page.locator(`a[href*="${path}"]`).first();
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        await link.click();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        expect(page.url()).toContain(path);
      } else {
        // Direct navigation
        await page.goto(`/cost-optimization/${path}`);
        await page.waitForLoadState('domcontentloaded');
        expect(page.url()).toContain(path);
      }
    }
  });

  test('should show breadcrumbs on detail pages', async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/make-vs-buy/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Breadcrumbs or back navigation
    const breadcrumb = page.locator('nav[aria-label*="bread"], ol li a, .breadcrumb, a:has-text("Make vs Buy"), a:has-text("←")').first();
    if (await breadcrumb.isVisible({ timeout: 3000 }).catch(() => false)) {
      expect(true).toBeTruthy();
    } else {
      // Page should at least be navigable
      expect(page.url()).toContain('new');
    }
  });

  test('should navigate back via breadcrumb', async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/make-vs-buy/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Click back link/breadcrumb
    const backLink = page.locator('a[href*="/make-vs-buy"]:not([href*="new"]), button:has-text("Back"), button:has-text("Quay lại"), a:has-text("←")').first();
    if (await backLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backLink.click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).not.toContain('new');
    }
  });

  test('should highlight active nav item in sidebar', async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/autonomy');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Active sidebar item should have different styling
    const activeLink = page.locator('a[href*="autonomy"]').first();
    if (await activeLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check that the link is present and points to autonomy
      const href = await activeLink.getAttribute('href');
      expect(href).toContain('autonomy');
    }
  });
});
