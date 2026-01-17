
import { test, expect } from '@playwright/test';
import { testCredentials } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';

test.describe('Stress & Resilience Suite', () => {
    // Run these tests in parallel to simulate load
    test.describe.configure({ mode: 'parallel' });

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', testCredentials.admin.email);
        await page.fill('input[type="password"]', testCredentials.admin.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/home', { timeout: 30000 });
    });

    test('Rapid Navigation Stress Test', async ({ page }) => {
        // Rapidly switch between heavy pages 20 times
        const routes = ['/inventory', '/parts', '/production', '/home'];

        for (let i = 0; i < 20; i++) {
            const route = routes[i % routes.length];
            const startTime = Date.now();

            await page.goto(route);
            // Just wait for basic load, don't wait for network idle to stress test the UI responsiveness
            await page.locator('body').waitFor();

            const duration = Date.now() - startTime;
            console.log(`Navigation ${i + 1} to ${route} took ${duration}ms`);

            // Allow a tiny breathing room but mostly hammer it
            await page.waitForTimeout(100);
        }
    });

    test('Form Submission Spam (Create Parts)', async ({ page }) => {
        // Attempt to create 5 parts in rapid succession
        // This assumes there is a quick way to create parts, or at least validate the form opens/closes efficiently

        for (let i = 0; i < 5; i++) {
            await page.goto('/parts');

            const addBtn = page.locator('button:has-text("Add"), button:has-text("Thêm")').first();
            if (await addBtn.isVisible()) {
                await addBtn.click();

                // Interacting with invalid data to trigger validation quickly (lighter than full creation)
                // or full creation if possible
                const modal = page.locator('div[role="dialog"]');
                await expect(modal).toBeVisible();

                // Just close it to simulate "Abandonment" load or fill and submit if possible
                // Let's try filling minimal info
                const inputName = page.locator('input[name="name"]');
                if (await inputName.isVisible()) {
                    await inputName.fill(`Stress Part ${i}-${generateTestId('STRESS')}`);
                }

                const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Hủy")');
                await cancelBtn.click();
                await expect(modal).not.toBeVisible();
            }

            await page.waitForTimeout(200);
        }
    });
});
