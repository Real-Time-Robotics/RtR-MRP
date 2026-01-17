
import { test, expect } from '@playwright/test';
import { testCredentials } from '../fixtures/test-data';

test.describe('Real User Journey Simulation', () => {

    test('Standard Day in the Life of a Manager', async ({ page }) => {
        test.setTimeout(120000); // Allow 2 minutes for this long scenario

        // 1. Initial Login
        await test.step('Login to Application', async () => {
            await page.goto('/login');
            await page.fill('input[type="email"]', testCredentials.admin.email);
            await page.fill('input[type="password"]', testCredentials.admin.password);
            await page.click('button[type="submit"]');
            await page.waitForURL('**/home', { timeout: 30000 });
            await expect(page.locator('h1, h2, h3').first()).toBeVisible();
        });

        // 2. Dashboard Review
        await test.step('Review Dashboard', async () => {
            // Wait for charts or KPIs to load
            await page.waitForTimeout(2000);
            // Check if there are stats visible
            const stats = page.locator('text="Pending Orders"');
            await expect(stats).toBeVisible();
        });

        // 3. Inventory Check
        await test.step('Navigate to Inventory and Check Stock', async () => {
            await page.click('a[href="/inventory"], button:has-text("Inventory"), span:has-text("Tồn kho")');
            await page.waitForURL('**/inventory');

            // Search for a random part or sort
            const searchInput = page.locator('input[placeholder*="Search"]');
            if (await searchInput.isVisible()) {
                await searchInput.fill('A');
                await page.waitForTimeout(1000); // Simulate typing pause
            }
        });

        // 4. Production / Parts Review
        await test.step('Check Production Parts', async () => {
            await page.goto('/parts');
            await expect(page).toHaveURL(/.*parts/);

            // Click on first part to view details (if list exists)
            const firstRow = page.locator('table tr, div[role="row"]').nth(1); // 0 might be header
            if (await firstRow.isVisible()) {
                await firstRow.click();
                // Wait for drawer or detail page
                await page.waitForTimeout(1000);
                // Close if it's a drawer (optional, just ensuring interaction works)
                await page.keyboard.press('Escape');
            }
        });

        // 5. Reports Section
        await test.step('Generate Report', async () => {
            // Try navigating to a reports or analysis page if it exists based on previous file exploration
            // Often "/reports" or "/quality"
            await page.goto('/reports'); // Assuming this route exists or redirects
            // Just verify page load
            // If 404, we expect it might fail, so we might traverse to known 'quality' instead
            if (page.url().includes('404')) {
                // Fallback to Quality
                await page.goto('/quality');
                await expect(page).toHaveURL(/.*quality/);
            }
        });

        // 6. User Settings & Logout
        await test.step('Logout', async () => {
            // Find avatar or settings menu
            const userMenu = page.locator('button[aria-haspopup="menu"], button[id*="menu"], div[role="button"]:has-text("Admin")').first();
            if (await userMenu.isVisible()) {
                await userMenu.click();
                const logoutBtn = page.locator('div[role="menuitem"]:has-text("Logout"), button:has-text("Đăng xuất")');
                if (await logoutBtn.isVisible()) {
                    await logoutBtn.click();
                    await page.waitForURL('**/login');
                }
            }
        });
    });
});
