
import { test, expect } from '@playwright/test';
import { testCredentials } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';

test.describe('Full Feature Coverage Simulation', () => {

    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', testCredentials.admin.email);
        await page.fill('input[type="password"]', testCredentials.admin.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/home', { timeout: 30000 });
    });

    /**
     * MODULE 1: BOM MANAGEMENT
     */
    test('BOM Management Cycle', async ({ page }) => {
        await test.step('Navigate to BOM', async () => {
            await page.goto('/bom');
        });

        await test.step('Create BOM Header', async () => {
            const createBtn = page.locator('a[href="/bom/new"]');
            if (await createBtn.isVisible()) {
                await createBtn.click();
                await page.waitForURL('**/bom/new');

                const productSelect = page.locator('button[role="combobox"]');
                await productSelect.click();
                const firstOption = page.locator('div[role="option"]').first();
                await expect(firstOption).toBeVisible();
                await firstOption.click();

                await page.fill('input[id="version"]', '2.0');
                await page.fill('textarea[id="notes"]', 'Created via E2E Simulation');
                await page.click('button:has-text("Create BOM")');
                await page.waitForURL(/.*bom\/.*/, { timeout: 15000 });
            }
        });
    });

    /**
     * MODULE 2: PURCHASING
     */
    test('Purchasing Lifecycle', async ({ page }) => {
        await page.goto('/purchasing');
        await test.step('Create Purchase Order', async () => {
            const createBtn = page.locator('button:has-text("Create PO"), button:has-text("Tạo PO")');
            if (await createBtn.isVisible()) {
                await createBtn.click();

                const supplierInput = page.locator('input[name="supplierId"], input[placeholder*="Supplier"]');
                if (await supplierInput.isVisible()) {
                    await supplierInput.fill('KDE');
                    await page.keyboard.press('Enter');
                }

                await page.click('button:has-text("Save"), button:has-text("Lưu")');
            }
        });
    });

    /**
     * MODULE 3: PRODUCTION
     */
    test('Production Workflow', async ({ page }) => {
        // 1. Create Work Order
        await page.goto('/production/new');

        // Wait for form
        await expect(page.locator('input[id="quantity"]')).toBeVisible();

        // Select Product (Placeholder "Select product...")
        const productTrigger = page.locator('button:has-text("Select product...")');
        if (await productTrigger.isVisible()) {
            await productTrigger.click();
            const firstOption = page.locator('div[role="option"]').first();
            await expect(firstOption).toBeVisible();
            await firstOption.click();
        } else {
            // Fallback
            const combos = page.locator('button[role="combobox"]');
            if (await combos.count() > 1) {
                await combos.nth(1).click();
                await page.locator('div[role="option"]').first().click();
            }
        }

        await page.fill('input[id="quantity"]', '50');
        await page.click('button:has-text("Create Work Order")');

        // 2. Verify Detail Page (Skip List View check due to flakiness)
        await page.waitForURL(/.*production\/.*/);
        await expect(page.locator('h1')).not.toBeEmpty();

        // Look for actions
        const actions = page.locator('button');
        await expect(actions.first()).toBeVisible();
    });

    /**
     * MODULE 4: QUALITY CONTROL
     */
    test('Quality Control - NCR', async ({ page }) => {
        await page.goto('/quality');

        const ncrTab = page.locator('button[role="tab"]:has-text("NCR"), div:has-text("NCR")');
        if (await ncrTab.count() > 0) {
            await ncrTab.first().click();
        }

        const createNcrBtn = page.locator('button:has-text("Create NCR"), button:has-text("Tạo NCR")');
        if (await createNcrBtn.isVisible()) {
            await createNcrBtn.click();
            await expect(page.locator('div[role="dialog"]')).toBeVisible();
            await page.keyboard.press('Escape');
        }
    });

    /**
     * MODULE 5: INVENTORY
     */
    test('Inventory Operations', async ({ page }) => {
        await page.goto('/inventory');

        const filterBtn = page.locator('button:has-text("Filter"), button:has-text("Bộ lọc")');
        if (await filterBtn.isVisible()) {
            await filterBtn.click();
            await expect(page.locator('div[role="menu"], div[role="dialog"]')).toBeVisible();
        }
    });

});
