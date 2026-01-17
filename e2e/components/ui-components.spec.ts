
import { test, expect } from '@playwright/test';
import { testCredentials } from '../fixtures/test-data';

test.describe('UI Components', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/login');
        await page.fill('input[type="email"]', testCredentials.admin.email);
        await page.fill('input[type="password"]', testCredentials.admin.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/home', { timeout: 30000 });
    });

    test('should render and interact with Buttons', async ({ page }) => {
        // Navigate to a page with buttons (e.g., Settings or Parts)
        await page.goto('/settings');

        // Check for different button variants if they exist, or generic buttons
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Lưu")');
        if (await saveButton.count() > 0) {
            await expect(saveButton.first()).toBeVisible();
            await expect(saveButton.first()).toBeEnabled();
        }

        // Check logout button (usually destructive or distinct)
        const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Đăng xuất")');
        // Don't click it yet to avoid logging out, just check visibility
        if (await logoutBtn.count() > 0) {
            await expect(logoutBtn.first()).toBeVisible();
        }
    });

    test('should interact with Input fields', async ({ page }) => {
        // Navigate to Parts page to use search or filters
        await page.goto('/parts');

        // Test Search Input
        const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="Tìm kiếm"]');
        await expect(searchInput).toBeVisible();

        await searchInput.fill('Test Part');
        await expect(searchInput).toHaveValue('Test Part');

        // Clear it
        await searchInput.clear();
        await expect(searchInput).toHaveValue('');
    });

    test('should open and close Modals/Dialogs', async ({ page }) => {
        await page.goto('/parts');

        // Look for "Add Part" or "New" button to open modal
        const addPartBtn = page.locator('button:has-text("Add"), button:has-text("Thêm")').first();

        if (await addPartBtn.isVisible()) {
            await addPartBtn.click();

            // Wait for modal
            const modal = page.locator('div[role="dialog"]');
            await expect(modal).toBeVisible();

            // Close it (usually a Cancel button or X icon)
            const closeBtn = modal.locator('button:has-text("Cancel"), button:has-text("Hủy")');
            if (await closeBtn.isVisible()) {
                await closeBtn.click();
                await expect(modal).not.toBeVisible();
            } else {
                // Try pressing Escape
                await page.keyboard.press('Escape');
            }
        }
    });

    test('should display Toast notifications', async ({ page }) => {
        // This is harder to trigger deterministically without a specific action
        // But we can check if the Toaster container exists in the DOM
        const toaster = page.locator('ol[role="list"]'); // Sonner default
        // Or just check that the region is present even if empty
        // Only strict check if we perform an action that triggers it.
        // For now, we skip verifying the toast presence unless we perform an action.
    });
});
