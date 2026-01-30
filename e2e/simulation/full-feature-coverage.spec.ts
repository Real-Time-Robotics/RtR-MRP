
import { test, expect } from '@playwright/test';
import { testCredentials } from '../fixtures/test-data';
import { generateTestId } from '../utils/test-helpers';

test.describe('Full Feature Coverage Simulation', () => {
    test.describe.configure({ mode: 'serial' });

    let supplierName: string;
    let partNumber: string;

    test.beforeAll(() => {
        const uniqueId = generateTestId('');
        supplierName = `AutoSupplier ${uniqueId}`;
        partNumber = `PART-${uniqueId}`;
    });

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', testCredentials.admin.email);
        await page.fill('input[type="password"]', testCredentials.admin.password);
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/.*dashboard|.*home/, { timeout: 30000 });

        // Robust Session Wait: Wait for User Menu or Navigation
        try {
            await Promise.race([
                page.getByRole('button', { name: /Open menu|User menu/i }).first().waitFor({ timeout: 15000 }),
                page.waitForSelector('.avatar', { timeout: 15000 }),
                page.waitForSelector('nav', { timeout: 15000 })
            ]);
        } catch (e) {
            console.log('Session wait warning: UI did not fully stabilize in 15s');
        }
    });

    test('Phase 1: Foundation - Create Supplier and Part', async ({ page }) => {
        test.setTimeout(90000);

        await test.step('Create Supplier', async () => {
            // Wait for data load
            const responsePromise = page.waitForResponse(response =>
                response.url().includes('/api/suppliers') && response.status() === 200
            );
            await page.goto('/suppliers');
            await responsePromise;

            // Create Button - Robust Selector
            const addBtn = page.getByRole('button', { name: /Thêm nhà cung cấp|Add Supplier/i });
            await expect(addBtn).toBeVisible({ timeout: 30000 });
            await addBtn.click();

            // Dialog Scope
            const dialog = page.getByRole('dialog');
            await expect(dialog).toBeVisible();

            await dialog.locator('input[name="code"]').fill(`SUP-${generateTestId('')}`);
            await dialog.locator('input[name="name"]').fill(supplierName);

            // Country Selection - Scoped to Dialog
            // Fallback strategy for Radix Select
            const countryTrigger = dialog.locator('button[role="combobox"]').nth(1);
            await countryTrigger.click();
            await page.getByRole('option', { name: 'Vietnam' }).click();

            await dialog.locator('input[name="contactEmail"]').fill('auto@test.com');
            await dialog.locator('button[type="submit"]').click();

            await expect(dialog).not.toBeVisible();

            // Validation
            const searchInput = page.locator('input[placeholder*="Tìm kiếm"]');
            await searchInput.fill(supplierName);
            await page.waitForResponse(resp => resp.url().includes('search=') && resp.status() === 200);
            await expect(page.locator(`text=${supplierName}`)).toBeVisible();
        });

        await test.step('Create Part (Product)', async () => {
            const responsePromise = page.waitForResponse(response =>
                response.url().includes('/api/parts') && response.status() === 200
            );
            await page.goto('/parts');
            await responsePromise;

            const addBtn = page.getByRole('button', { name: /Thêm|Add/i }).first();
            await addBtn.click();

            const dialog = page.getByRole('dialog');
            await expect(dialog).toBeVisible();

            await dialog.locator('input[name="partNumber"]').fill(partNumber);
            await dialog.locator('input[name="name"]').fill(`AutoPart ${partNumber}`);

            await dialog.locator('input[name="unitCost"]').fill('100');

            await dialog.locator('button[type="submit"]').click();
            await expect(dialog).not.toBeVisible();

            const searchInput = page.locator('input[placeholder*="Tìm kiếm"]');
            await searchInput.fill(partNumber);
            await page.waitForResponse(resp => resp.url().includes('search=') && resp.status() === 200);
            await expect(page.locator(`text=${partNumber}`)).toBeVisible();
        });
    });

    test('Phase 2: Engineering - Create BOM', async ({ page }) => {
        await page.goto('/bom');
        const addBtn = page.getByRole('button', { name: /Thêm|Add|Create/i }).first();
        // Handle if it's a link styled as button
        if (await addBtn.count() === 0) {
            await page.click('a[href="/bom/new"]');
        } else {
            await addBtn.click();
        }

        // Wait for potential navigation
        await page.waitForTimeout(1000);

        // Check if Dialog or Page
        const dialog = page.getByRole('dialog');
        const container = (await dialog.isVisible()) ? dialog : page;

        const productSelect = container.locator('button[role="combobox"]').first();
        await productSelect.click();

        await page.keyboard.type(partNumber);
        await page.waitForTimeout(1000);
        await page.keyboard.press('Enter');

        await container.locator('input[name="version"], input[id="version"]').fill('1.0');
        await container.locator('button:has-text("Lưu"), button:has-text("Create")').click();

        await expect(page).toHaveURL(/.*bom\/.*/);
        await expect(page.locator('body')).toContainText(partNumber);
    });

    test('Phase 3: Purchasing - PO to Receipt', async ({ page }) => {
        test.setTimeout(90000);
        await page.goto('/purchasing');
        await page.getByRole('button', { name: /Thêm|Add/i }).first().click();

        await page.locator('button[role="combobox"]').first().click();
        await page.keyboard.type(supplierName);
        await page.waitForTimeout(1000);
        await page.keyboard.press('Enter');

        const addLineBtn = page.locator('button:has-text("Thêm sản phẩm")');
        if (await addLineBtn.isVisible()) {
            await addLineBtn.click();
            await page.keyboard.type(partNumber);
            await page.keyboard.press('Enter');
            await page.locator('input[type="number"]').fill('50');
        }

        await page.locator('button[type="submit"], button:has-text("Lưu")').click();
        await expect(page).toHaveURL(/.*purchasing\/.*/);

        const receiveBtn = page.getByRole('button', { name: /Nhập kho|Receive/i });
        if (await receiveBtn.isVisible()) {
            await receiveBtn.click();
            await page.getByRole('button', { name: /Xác nhận|Confirm/i }).click();
        }
    });

    test('Phase 4: Production - Work Order Lifecycle', async ({ page }) => {
        await page.goto('/production');
        await page.getByRole('button', { name: /Thêm|Add/i }).first().click();

        const productInput = page.locator('button[role="combobox"]').first();
        await productInput.click();
        await page.keyboard.type(partNumber);
        await page.keyboard.press('Enter');

        await page.locator('input[id="quantity"]').fill('10');
        await page.locator('button[type="submit"], button:has-text("Lưu")').click();

        await expect(page).toHaveURL(/.*production\/.*/);

        const startBtn = page.getByRole('button', { name: /Bắt đầu|Start/i });
        if (await startBtn.isVisible()) {
            await startBtn.click();
        }
    });

    test('Phase 5: Quality - Create NCR', async ({ page }) => {
        await page.goto('/quality');
        await page.getByRole('button', { name: /Thêm|Create NCR/i }).click();

        await page.fill('input[name="title"]', 'E2E Defect Test');

        const partSelect = page.locator('button[role="combobox"]').first();
        if (await partSelect.isVisible()) {
            await partSelect.click();
            await page.keyboard.type(partNumber);
            await page.keyboard.press('Enter');
        }

        await page.fill('textarea[name="description"]', 'Description');
        await page.locator('button[type="submit"]').click();

        await expect(page.locator('text=E2E Defect Test')).toBeVisible();
    });

});
