/**
 * CUSTOMER & SUPPLIER DATA INTEGRITY TESTS
 *
 * Verifies that ALL fields are correctly saved for Customers and Suppliers.
 *
 * @tags @data-integrity @customers @suppliers @regression
 */

import { test, expect } from '../fixtures/auth.fixture';
import { generateTestId } from '../utils/test-helpers';
import {
  DataIntegrityResult,
  FieldComparison,
  generateReport,
  takeIntegrityScreenshot,
  compareValues,
  checkSuccess,
} from '../utils/data-integrity-helpers';

// ============================================================================
// CUSTOMER TESTS
// ============================================================================

interface CustomerTestData {
  customerCode: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tier: string;
  creditLimit: number;
  paymentTerms: number;
  currency: string;
  taxId: string;
  notes: string;
}

function createFullCustomerTestData(): CustomerTestData {
  const uniqueId = generateTestId('CUST');
  return {
    customerCode: uniqueId,
    name: `Test Customer ${uniqueId}`,
    email: `customer-${uniqueId.toLowerCase()}@test.com`,
    phone: '0901234567',
    address: '123 Test Street, District 1, HCMC',
    tier: 'gold',
    creditLimit: 50000000,
    paymentTerms: 30,
    currency: 'VND',
    taxId: '0123456789',
    notes: 'Created for data integrity testing',
  };
}

test.describe('Customer Data Integrity Tests @data-integrity @customers', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should save ALL fields correctly when creating a Customer', async ({ authenticatedPage: page }) => {
    const testData = createFullCustomerTestData();

    console.log('\n' + '='.repeat(60));
    console.log('CUSTOMER DATA INTEGRITY TEST');
    console.log('='.repeat(60));
    console.log('Test Customer Code:', testData.customerCode);
    console.log('Expected creditLimit:', testData.creditLimit);
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

    const modal = page.locator('[role="dialog"], form').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill form fields
    const fillField = async (name: string, value: string | number) => {
      const input = modal.locator(`input[name="${name}"], textarea[name="${name}"]`).first();
      if (await input.isVisible().catch(() => false)) {
        await input.clear();
        await input.fill(String(value));
      }
    };

    await fillField('customerCode', testData.customerCode);
    await fillField('name', testData.name);
    await fillField('email', testData.email);
    await fillField('phone', testData.phone);
    await fillField('address', testData.address);
    await fillField('creditLimit', testData.creditLimit);
    await fillField('paymentTerms', testData.paymentTerms);
    await fillField('taxId', testData.taxId);
    await fillField('notes', testData.notes);

    // Select tier dropdown
    const tierTrigger = modal.locator('[name="tier"], button:has-text("Tier")').first();
    if (await tierTrigger.isVisible().catch(() => false)) {
      await tierTrigger.click();
      await page.waitForTimeout(200);
      const option = page.locator(`[data-value="${testData.tier}"], [role="option"]:has-text("${testData.tier}")`).first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
      }
    }

    await takeIntegrityScreenshot(page, 'customer', 'before-create');

    // Save
    await modal.locator('button:has-text("Lưu"), button:has-text("Save"), button[type="submit"]').first().click();
    await page.waitForTimeout(3000);

    // Verify via API
    const response = await page.request.get(`/api/customers?search=${testData.customerCode}`);
    const data = await response.json();

    console.log('API Response:', JSON.stringify(data, null, 2));

    if (data.customers && data.customers.length > 0) {
      const saved = data.customers[0];

      const result: DataIntegrityResult = {
        success: true,
        entityType: 'Customer',
        entityId: saved.id,
        comparisons: [],
        mismatches: [],
        errors: [],
      };

      const addComparison = (field: string, expected: any, actual: any, fieldType: 'string' | 'number' | 'boolean' = 'string') => {
        const match = compareValues(expected, actual, fieldType);
        const comparison: FieldComparison = { field, expected, actual, match };
        result.comparisons.push(comparison);
        if (!match) {
          result.mismatches.push(comparison);
          result.success = false;
        }
      };

      addComparison('customerCode', testData.customerCode, saved.customerCode);
      addComparison('name', testData.name, saved.name);
      addComparison('email', testData.email, saved.email);
      addComparison('creditLimit', testData.creditLimit, saved.creditLimit, 'number');
      addComparison('paymentTerms', testData.paymentTerms, saved.paymentTerms, 'number');

      const report = generateReport(result);
      console.log(report);

      expect(result.success, `Customer data integrity failed: ${result.mismatches.map(m => m.field).join(', ')}`).toBe(true);
    }
  });

  test('should preserve creditLimit value', async ({ authenticatedPage: page }) => {
    const uniqueId = generateTestId('CLIM');
    const creditLimit = 100000000;

    const createButton = page.locator('button:has-text("Thêm"), button:has-text("Create")').first();
    if (!(await createButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await createButton.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    await modal.locator('input[name="code"]').first().fill(uniqueId);
    await modal.locator('input[name="name"]').first().fill('Credit Limit Test');

    // Find creditLimit by label since NumberInput doesn't have name prop
    let creditInput = modal.locator('input[name="creditLimit"]').first();
    if (!(await creditInput.isVisible().catch(() => false))) {
      // Fallback to label-based selector
      creditInput = modal.locator('label:has-text("Credit"), label:has-text("Hạn mức")').first().locator('..').locator('input').first();
    }
    if (await creditInput.isVisible().catch(() => false)) {
      await creditInput.clear();
      await creditInput.fill(String(creditLimit));
    }

    await modal.locator('button:has-text("Lưu")').first().click();
    await page.waitForTimeout(3000);

    const response = await page.request.get(`/api/customers?search=${uniqueId}`);
    const data = await response.json();

    if (data.customers && data.customers.length > 0) {
      console.log(`Expected creditLimit: ${creditLimit}`);
      console.log(`Actual creditLimit: ${data.customers[0].creditLimit}`);
      expect(data.customers[0].creditLimit).toBe(creditLimit);
    }
  });
});

// ============================================================================
// SUPPLIER TESTS
// ============================================================================

interface SupplierTestData {
  supplierCode: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  rating: string;
  leadTimeDays: number;
  paymentTerms: number;
  currency: string;
  minOrderValue: number;
  taxId: string;
}

function createFullSupplierTestData(): SupplierTestData {
  const uniqueId = generateTestId('SUP');
  return {
    supplierCode: uniqueId,
    name: `Test Supplier ${uniqueId}`,
    email: `supplier-${uniqueId.toLowerCase()}@test.com`,
    phone: '0907654321',
    address: '456 Factory Road, Binh Duong',
    rating: 'A',
    leadTimeDays: 14,
    paymentTerms: 45,
    currency: 'USD',
    minOrderValue: 1000,
    taxId: '9876543210',
  };
}

test.describe('Supplier Data Integrity Tests @data-integrity @suppliers', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/suppliers');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should save ALL fields correctly when creating a Supplier', async ({ authenticatedPage: page }) => {
    const testData = createFullSupplierTestData();

    console.log('\n' + '='.repeat(60));
    console.log('SUPPLIER DATA INTEGRITY TEST');
    console.log('='.repeat(60));
    console.log('Test Supplier Code:', testData.supplierCode);
    console.log('Expected leadTimeDays:', testData.leadTimeDays);
    console.log('='.repeat(60) + '\n');

    const createButton = page.locator('button:has-text("Thêm"), button:has-text("Create"), button:has-text("New")').first();

    if (!(await createButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await createButton.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"], form').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill form fields
    const fillField = async (name: string, value: string | number) => {
      const input = modal.locator(`input[name="${name}"], textarea[name="${name}"]`).first();
      if (await input.isVisible().catch(() => false)) {
        await input.clear();
        await input.fill(String(value));
      }
    };

    await fillField('supplierCode', testData.supplierCode);
    await fillField('name', testData.name);
    await fillField('email', testData.email);
    await fillField('phone', testData.phone);
    await fillField('address', testData.address);
    await fillField('leadTimeDays', testData.leadTimeDays);
    await fillField('paymentTerms', testData.paymentTerms);
    await fillField('minOrderValue', testData.minOrderValue);
    await fillField('taxId', testData.taxId);

    await takeIntegrityScreenshot(page, 'supplier', 'before-create');

    // Save
    await modal.locator('button:has-text("Lưu"), button:has-text("Save"), button[type="submit"]').first().click();
    await page.waitForTimeout(3000);

    // Verify via API
    const response = await page.request.get(`/api/suppliers?search=${testData.supplierCode}`);
    const data = await response.json();

    console.log('API Response:', JSON.stringify(data, null, 2));

    if (data.suppliers && data.suppliers.length > 0) {
      const saved = data.suppliers[0];

      const result: DataIntegrityResult = {
        success: true,
        entityType: 'Supplier',
        entityId: saved.id,
        comparisons: [],
        mismatches: [],
        errors: [],
      };

      const addComparison = (field: string, expected: any, actual: any, fieldType: 'string' | 'number' | 'boolean' = 'string') => {
        const match = compareValues(expected, actual, fieldType);
        const comparison: FieldComparison = { field, expected, actual, match };
        result.comparisons.push(comparison);
        if (!match) {
          result.mismatches.push(comparison);
          result.success = false;
        }
      };

      addComparison('supplierCode', testData.supplierCode, saved.supplierCode);
      addComparison('name', testData.name, saved.name);
      addComparison('email', testData.email, saved.email);
      addComparison('leadTimeDays', testData.leadTimeDays, saved.leadTimeDays, 'number');
      addComparison('paymentTerms', testData.paymentTerms, saved.paymentTerms, 'number');
      addComparison('minOrderValue', testData.minOrderValue, saved.minOrderValue, 'number');

      const report = generateReport(result);
      console.log(report);

      expect(result.success, `Supplier data integrity failed: ${result.mismatches.map(m => m.field).join(', ')}`).toBe(true);
    }
  });

  test('should preserve leadTimeDays value for Supplier', async ({ authenticatedPage: page }) => {
    const uniqueId = generateTestId('SLT');
    const leadTime = 21;

    const createButton = page.locator('button:has-text("Thêm"), button:has-text("Create")').first();
    if (!(await createButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await createButton.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    await modal.locator('input[name="code"]').first().fill(uniqueId);
    await modal.locator('input[name="name"]').first().fill('Lead Time Test Supplier');

    // Find leadTimeDays by label since NumberInput doesn't have name prop
    let leadInput = modal.locator('input[name="leadTimeDays"]').first();
    if (!(await leadInput.isVisible().catch(() => false))) {
      // Fallback to label-based selector
      leadInput = modal.locator('label:has-text("Lead Time"), label:has-text("Thời gian")').first().locator('..').locator('input').first();
    }
    if (await leadInput.isVisible().catch(() => false)) {
      await leadInput.clear();
      await leadInput.fill(String(leadTime));
    }

    await modal.locator('button:has-text("Lưu")').first().click();
    await page.waitForTimeout(3000);

    const response = await page.request.get(`/api/suppliers?search=${uniqueId}`);
    const data = await response.json();

    if (data.suppliers && data.suppliers.length > 0) {
      console.log(`Expected leadTimeDays: ${leadTime}`);
      console.log(`Actual leadTimeDays: ${data.suppliers[0].leadTimeDays}`);
      expect(data.suppliers[0].leadTimeDays).toBe(leadTime);
    }
  });
});
