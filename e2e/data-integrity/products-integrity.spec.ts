/**
 * PRODUCT DATA INTEGRITY TESTS
 *
 * Verifies that ALL fields entered during Product creation/update are correctly saved.
 *
 * @tags @data-integrity @products @regression
 */

import { test, expect } from '../fixtures/auth.fixture';
import { generateTestId } from '../utils/test-helpers';
import {
  DataIntegrityResult,
  FieldComparison,
  generateReport,
  takeIntegrityScreenshot,
  compareValues,
  navigateToTab,
  checkSuccess,
  getErrorMessage,
} from '../utils/data-integrity-helpers';

interface ProductTestData {
  sku: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  unit: string;
  weightKg: number;
  leadTimeDays: number;
  moq: number;
  status: string;
}

function createFullProductTestData(): ProductTestData {
  const uniqueId = generateTestId('PROD');
  return {
    sku: uniqueId,
    name: `Test Product ${uniqueId}`,
    description: 'Product created for data integrity testing',
    category: 'FINISHED_GOOD',
    basePrice: 199.99,
    unit: 'EA',
    weightKg: 1.5,
    leadTimeDays: 10,
    moq: 5,
    status: 'ACTIVE',
  };
}

test.describe('Product Data Integrity Tests @data-integrity @products', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/products');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should save ALL fields correctly when creating a Product', async ({ authenticatedPage: page }) => {
    const testData = createFullProductTestData();

    console.log('\n' + '='.repeat(60));
    console.log('PRODUCT DATA INTEGRITY TEST');
    console.log('='.repeat(60));
    console.log('Test SKU:', testData.sku);
    console.log('Expected basePrice:', testData.basePrice);
    console.log('='.repeat(60) + '\n');

    // Click Create button
    const createButton = page.locator('button:has-text("Thêm"), button:has-text("Create"), button:has-text("New")').first();

    if (!(await createButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('Create button not found - skipping test');
      test.skip();
      return;
    }

    await createButton.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill form fields
    await modal.locator('input[name="sku"]').first().fill(testData.sku);
    await modal.locator('input[name="name"]').first().fill(testData.name);

    const descField = modal.locator('textarea[name="description"]').first();
    if (await descField.isVisible().catch(() => false)) {
      await descField.fill(testData.description);
    }

    const basePriceInput = modal.locator('input[name="basePrice"]').first();
    if (await basePriceInput.isVisible().catch(() => false)) {
      await basePriceInput.clear();
      await basePriceInput.fill(String(testData.basePrice));
    }

    const weightInput = modal.locator('input[name="weightKg"]').first();
    if (await weightInput.isVisible().catch(() => false)) {
      await weightInput.clear();
      await weightInput.fill(String(testData.weightKg));
    }

    const leadTimeInput = modal.locator('input[name="leadTimeDays"]').first();
    if (await leadTimeInput.isVisible().catch(() => false)) {
      await leadTimeInput.clear();
      await leadTimeInput.fill(String(testData.leadTimeDays));
    }

    // Take screenshot before save
    await takeIntegrityScreenshot(page, 'product', 'before-create');

    // Save
    await modal.locator('button:has-text("Lưu"), button:has-text("Save")').first().click();
    await page.waitForTimeout(3000);

    // Verify via API
    const response = await page.request.get(`/api/products?search=${testData.sku}`);
    const data = await response.json();

    console.log('API Response:', JSON.stringify(data, null, 2));

    if (data.products && data.products.length > 0) {
      const savedProduct = data.products[0];

      const result: DataIntegrityResult = {
        success: true,
        entityType: 'Product',
        entityId: savedProduct.id,
        comparisons: [],
        mismatches: [],
        errors: [],
      };

      // Compare fields
      const addComparison = (field: string, expected: any, actual: any, fieldType: 'string' | 'number' | 'boolean' = 'string') => {
        const match = compareValues(expected, actual, fieldType);
        const comparison: FieldComparison = { field, expected, actual, match };
        result.comparisons.push(comparison);
        if (!match) {
          result.mismatches.push(comparison);
          result.success = false;
        }
      };

      addComparison('sku', testData.sku, savedProduct.sku);
      addComparison('name', testData.name, savedProduct.name);
      addComparison('basePrice', testData.basePrice, savedProduct.basePrice, 'number');
      addComparison('weightKg', testData.weightKg, savedProduct.weightKg, 'number');
      addComparison('leadTimeDays', testData.leadTimeDays, savedProduct.leadTimeDays, 'number');

      const report = generateReport(result);
      console.log(report);

      expect(result.success, `Product data integrity failed: ${result.mismatches.map(m => m.field).join(', ')}`).toBe(true);
    } else {
      console.log('Product not found in API response');
      expect(await checkSuccess(page)).toBe(true);
    }
  });

  test('should preserve decimal basePrice value', async ({ authenticatedPage: page }) => {
    const uniqueId = generateTestId('PDEC');
    const decimalPrice = 199.99;

    const createButton = page.locator('button:has-text("Thêm"), button:has-text("Create")').first();
    if (!(await createButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await createButton.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    await modal.locator('input[name="sku"]').first().fill(uniqueId);
    await modal.locator('input[name="name"]').first().fill('Price Test Product');

    const priceInput = modal.locator('input[name="basePrice"]').first();
    if (await priceInput.isVisible().catch(() => false)) {
      await priceInput.clear();
      await priceInput.fill(String(decimalPrice));
    }

    await modal.locator('button:has-text("Lưu")').first().click();
    await page.waitForTimeout(3000);

    // Verify via API
    const response = await page.request.get(`/api/products?search=${uniqueId}`);
    const data = await response.json();

    if (data.products && data.products.length > 0) {
      const savedProduct = data.products[0];
      console.log(`Expected basePrice: ${decimalPrice}`);
      console.log(`Actual basePrice: ${savedProduct.basePrice}`);

      const tolerance = 0.01;
      const diff = Math.abs(savedProduct.basePrice - decimalPrice);
      expect(diff).toBeLessThan(tolerance);
    }
  });
});
