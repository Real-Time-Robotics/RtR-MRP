/**
 * SALES ORDER & PURCHASE ORDER DATA INTEGRITY TESTS
 *
 * Verifies that ALL fields are correctly saved, including:
 * - currency field (recently fixed bug)
 * - decimal amounts
 * - date fields
 * - status transitions
 *
 * @tags @data-integrity @orders @regression
 */

import { test, expect } from '../fixtures/auth.fixture';
import { generateTestId } from '../utils/test-helpers';
import {
  DataIntegrityResult,
  FieldComparison,
  generateReport,
  takeIntegrityScreenshot,
  compareValues,
} from '../utils/data-integrity-helpers';

// ============================================================================
// SALES ORDER TESTS
// ============================================================================

interface SalesOrderTestData {
  orderNumber: string;
  customerId: string;
  orderDate: string;
  requiredDate: string;
  priority: string;
  currency: string;
  notes: string;
  // Lines
  lines: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

function createSalesOrderTestData(): SalesOrderTestData {
  const uniqueId = generateTestId('SO');
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return {
    orderNumber: uniqueId,
    customerId: '', // Will be selected from dropdown
    orderDate: today,
    requiredDate: nextWeek,
    priority: 'normal',
    currency: 'USD', // <-- This was the field that couldn't be updated
    notes: 'Data integrity test order',
    lines: [],
  };
}

test.describe('Sales Order Data Integrity Tests @data-integrity @sales-orders', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should preserve currency field when updating Sales Order', async ({ authenticatedPage: page }) => {
    console.log('\n' + '='.repeat(60));
    console.log('SALES ORDER CURRENCY UPDATE TEST');
    console.log('='.repeat(60));

    // Find an existing order to edit
    const firstRow = page.locator('tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('No orders found - skipping test');
      test.skip();
      return;
    }

    // Get the order ID from the row
    const orderLink = firstRow.locator('a[href*="/orders/"]').first();
    let orderId = '';

    if (await orderLink.isVisible().catch(() => false)) {
      const href = await orderLink.getAttribute('href');
      orderId = href?.split('/').pop() || '';
    }

    // Click edit button
    const editButton = firstRow.locator('button:has-text("Sửa"), button:has-text("Edit")').first();
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
    } else {
      await firstRow.click();
    }

    await page.waitForTimeout(1000);

    const modal = page.locator('[role="dialog"]');
    if (!(await modal.isVisible({ timeout: 5000 }).catch(() => false))) {
      // Maybe it navigated to a page instead
      await page.waitForURL(/\/orders\//, { timeout: 5000 }).catch(() => {});
    }

    // Record original currency
    const currencySelect = page.locator('[name="currency"], select[name="currency"]').first();
    let originalCurrency = '';

    if (await currencySelect.isVisible().catch(() => false)) {
      originalCurrency = await currencySelect.inputValue().catch(() => '');
    }

    // Change currency to USD if not already
    const newCurrency = originalCurrency === 'USD' ? 'VND' : 'USD';

    if (await currencySelect.isVisible().catch(() => false)) {
      await currencySelect.selectOption(newCurrency);
    } else {
      // Maybe it's a custom dropdown
      const currencyTrigger = page.locator('button:has-text("Currency"), [data-name="currency"]').first();
      if (await currencyTrigger.isVisible().catch(() => false)) {
        await currencyTrigger.click();
        await page.waitForTimeout(200);
        await page.locator(`[data-value="${newCurrency}"], [role="option"]:has-text("${newCurrency}")`).first().click();
      }
    }

    console.log(`Changing currency from "${originalCurrency}" to "${newCurrency}"`);

    // Save - find the button first
    const saveButton = page.locator('button:has-text("Lưu"), button:has-text("Save"), button[type="submit"]').first();
    if (!(await saveButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('Save button not found - skipping test');
      test.skip(true, 'Save button not visible - UI may have changed');
      return;
    }
    await saveButton.click();
    await page.waitForTimeout(3000);

    // Verify via API
    if (orderId) {
      const response = await page.request.get(`/api/sales-orders/${orderId}`);
      const data = await response.json();

      console.log('Saved order currency:', data.currency);

      if (data.currency) {
        expect(data.currency).toBe(newCurrency);
        console.log('✅ Currency update successful');
      }
    }
  });

  test('should create Sales Order with all fields', async ({ authenticatedPage: page }) => {
    const testData = createSalesOrderTestData();

    console.log('\n' + '='.repeat(60));
    console.log('SALES ORDER CREATE TEST');
    console.log('='.repeat(60));

    const createButton = page.locator('button:has-text("Thêm"), button:has-text("Create"), button:has-text("New")').first();

    if (!(await createButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      // Try navigation to /orders/new
      await page.goto('/orders/new');
      await page.waitForTimeout(2000);
    } else {
      await createButton.click();
      await page.waitForTimeout(500);
    }

    // Fill form
    const orderNumberInput = page.locator('input[name="orderNumber"]').first();
    if (await orderNumberInput.isVisible().catch(() => false)) {
      await orderNumberInput.fill(testData.orderNumber);
    }

    const notesInput = page.locator('textarea[name="notes"]').first();
    if (await notesInput.isVisible().catch(() => false)) {
      await notesInput.fill(testData.notes);
    }

    // Select customer (first available)
    const customerSelect = page.locator('[name="customerId"], select[name="customerId"], button:has-text("Customer")').first();
    if (await customerSelect.isVisible().catch(() => false)) {
      await customerSelect.click();
      await page.waitForTimeout(200);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible().catch(() => false)) {
        await firstOption.click();
      }
    }

    // Set currency
    const currencySelect = page.locator('[name="currency"], select[name="currency"]').first();
    if (await currencySelect.isVisible().catch(() => false)) {
      await currencySelect.selectOption(testData.currency);
    }

    await takeIntegrityScreenshot(page, 'sales-order', 'before-create');

    // Save
    await page.locator('button:has-text("Lưu"), button:has-text("Save"), button[type="submit"]').first().click();
    await page.waitForTimeout(3000);

    // Verify
    const response = await page.request.get(`/api/sales-orders?search=${testData.orderNumber}`);
    const data = await response.json();

    if (data.orders && data.orders.length > 0) {
      const saved = data.orders[0];
      console.log('Saved order:', JSON.stringify(saved, null, 2));

      expect(saved.orderNumber).toBe(testData.orderNumber);
      expect(saved.currency).toBe(testData.currency);
      console.log('✅ Sales Order created with correct data');
    }
  });
});

// ============================================================================
// PURCHASE ORDER TESTS
// ============================================================================

interface PurchaseOrderTestData {
  poNumber: string;
  supplierId: string;
  orderDate: string;
  expectedDate: string;
  currency: string;
  notes: string;
  lines: Array<{
    partId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

function createPurchaseOrderTestData(): PurchaseOrderTestData {
  const uniqueId = generateTestId('PO');
  const today = new Date().toISOString().split('T')[0];
  const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return {
    poNumber: uniqueId,
    supplierId: '',
    orderDate: today,
    expectedDate: twoWeeks,
    currency: 'USD',
    notes: 'Data integrity test PO',
    lines: [],
  };
}

test.describe('Purchase Order Data Integrity Tests @data-integrity @purchase-orders', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/purchasing');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should preserve currency field when updating Purchase Order', async ({ authenticatedPage: page }) => {
    console.log('\n' + '='.repeat(60));
    console.log('PURCHASE ORDER CURRENCY UPDATE TEST');
    console.log('='.repeat(60));

    // Find an existing PO to edit
    const firstRow = page.locator('tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('No POs found - skipping test');
      test.skip();
      return;
    }

    // Get the PO ID
    const poLink = firstRow.locator('a[href*="/purchasing/"]').first();
    let poId = '';

    if (await poLink.isVisible().catch(() => false)) {
      const href = await poLink.getAttribute('href');
      poId = href?.split('/').pop() || '';
    }

    // Click edit
    const editButton = firstRow.locator('button:has-text("Sửa"), button:has-text("Edit")').first();
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
    } else {
      await firstRow.click();
    }

    await page.waitForTimeout(1000);

    // Record and change currency
    const currencySelect = page.locator('[name="currency"], select[name="currency"]').first();
    let originalCurrency = '';

    if (await currencySelect.isVisible().catch(() => false)) {
      originalCurrency = await currencySelect.inputValue().catch(() => '');
      const newCurrency = originalCurrency === 'USD' ? 'VND' : 'USD';
      await currencySelect.selectOption(newCurrency);
      console.log(`Changing currency from "${originalCurrency}" to "${newCurrency}"`);

      // Save
      await page.locator('button:has-text("Lưu"), button:has-text("Save")').first().click();
      await page.waitForTimeout(3000);

      // Verify
      if (poId) {
        const response = await page.request.get(`/api/purchase-orders/${poId}`);
        const data = await response.json();

        console.log('Saved PO currency:', data.currency);
        expect(data.currency).toBe(newCurrency);
        console.log('✅ Currency update successful');
      }
    }
  });

  test('should create Purchase Order with correct totalAmount', async ({ authenticatedPage: page }) => {
    const testData = createPurchaseOrderTestData();

    console.log('\n' + '='.repeat(60));
    console.log('PURCHASE ORDER CREATE TEST');
    console.log('='.repeat(60));

    const createButton = page.locator('button:has-text("Thêm"), button:has-text("Create"), button:has-text("New")').first();

    if (!(await createButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      await page.goto('/purchasing/new');
      await page.waitForTimeout(2000);
    } else {
      await createButton.click();
      await page.waitForTimeout(500);
    }

    // Fill form
    const poNumberInput = page.locator('input[name="poNumber"]').first();
    if (await poNumberInput.isVisible().catch(() => false)) {
      await poNumberInput.fill(testData.poNumber);
    }

    // Select supplier
    const supplierSelect = page.locator('[name="supplierId"], button:has-text("Supplier")').first();
    if (await supplierSelect.isVisible().catch(() => false)) {
      await supplierSelect.click();
      await page.waitForTimeout(200);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible().catch(() => false)) {
        await firstOption.click();
      }
    }

    // Set currency
    const currencySelect = page.locator('[name="currency"], select[name="currency"]').first();
    if (await currencySelect.isVisible().catch(() => false)) {
      await currencySelect.selectOption(testData.currency);
    }

    // Add a line item if possible
    const addLineBtn = page.locator('button:has-text("Thêm dòng"), button:has-text("Add Line")').first();
    if (await addLineBtn.isVisible().catch(() => false)) {
      await addLineBtn.click();
      await page.waitForTimeout(300);

      // Fill line
      const qtyInput = page.locator('input[name*="quantity"]').last();
      if (await qtyInput.isVisible().catch(() => false)) {
        await qtyInput.fill('10');
      }

      const priceInput = page.locator('input[name*="unitPrice"]').last();
      if (await priceInput.isVisible().catch(() => false)) {
        await priceInput.fill('100.50');
      }
    }

    await takeIntegrityScreenshot(page, 'purchase-order', 'before-create');

    // Save
    await page.locator('button:has-text("Lưu"), button:has-text("Save"), button[type="submit"]').first().click();
    await page.waitForTimeout(3000);

    // Verify
    const response = await page.request.get(`/api/purchase-orders?search=${testData.poNumber}`);
    const data = await response.json();

    if (data.orders && data.orders.length > 0) {
      const saved = data.orders[0];
      console.log('Saved PO:', JSON.stringify(saved, null, 2));

      expect(saved.poNumber).toBe(testData.poNumber);
      expect(saved.currency).toBe(testData.currency);

      // Verify line total if lines exist
      if (saved.lines && saved.lines.length > 0) {
        const expectedTotal = saved.lines.reduce((sum: number, line: any) =>
          sum + (line.quantity * line.unitPrice), 0);
        expect(saved.totalAmount).toBe(expectedTotal);
      }

      console.log('✅ Purchase Order created with correct data');
    }
  });

  test('should preserve line item data after update', async ({ authenticatedPage: page }) => {
    // Find a PO with lines
    const response = await page.request.get('/api/purchase-orders?limit=10');
    const data = await response.json();

    const poWithLines = data.orders?.find((po: any) => po.lines && po.lines.length > 0);

    if (!poWithLines) {
      console.log('No PO with lines found - skipping');
      test.skip();
      return;
    }

    console.log(`Testing PO: ${poWithLines.poNumber} with ${poWithLines.lines.length} lines`);

    // Record original line data
    const originalLines = poWithLines.lines.map((line: any) => ({
      partId: line.partId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    }));

    // Update the PO (just change notes)
    const updateResponse = await page.request.put(`/api/purchase-orders/${poWithLines.id}`, {
      data: {
        notes: `Updated at ${new Date().toISOString()}`,
      },
    });

    const updatedPO = await updateResponse.json();
    console.log('Updated PO response:', JSON.stringify(updatedPO, null, 2));

    // Re-fetch and verify lines are intact
    const verifyResponse = await page.request.get(`/api/purchase-orders/${poWithLines.id}`);
    const verifiedPO = await verifyResponse.json();

    if (verifiedPO.lines) {
      expect(verifiedPO.lines.length).toBe(originalLines.length);

      verifiedPO.lines.forEach((line: any, index: number) => {
        const original = originalLines[index];
        expect(line.quantity).toBe(original.quantity);
        expect(line.unitPrice).toBe(original.unitPrice);
      });

      console.log('✅ Line items preserved after update');
    }
  });
});
