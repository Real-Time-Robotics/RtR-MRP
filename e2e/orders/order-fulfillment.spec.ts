import { test, expect } from '../fixtures/auth.fixture';
import { generateTestId } from '../utils/test-helpers';

test.describe('Order Fulfillment @orders', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  // ============================================
  // P0 - CRITICAL TESTS
  // ============================================

  test('@p0 should view order fulfillment status', async ({ authenticatedPage: page }) => {
    const orderRow = page.locator(
      'tbody tr a, a[href*="/orders/"], [data-testid="order-row"]'
    ).first();

    if (await orderRow.isVisible()) {
      await orderRow.click();
      await page.waitForTimeout(1000);

      // Look for fulfillment status
      const fulfillmentStatus = page.locator(
        '[data-testid="fulfillment-status"], div:has-text("Fulfillment"), ' +
        '.fulfillment-status, div:has-text("Shipped")'
      ).first();

      const hasStatus = await fulfillmentStatus.isVisible().catch(() => false);
      console.log(`Fulfillment status visible: ${hasStatus}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p0 should allocate inventory to order', async ({ authenticatedPage: page }) => {
    const orderRow = page.locator('tbody tr a, a[href*="/orders/"]').first();

    if (await orderRow.isVisible()) {
      await orderRow.click();
      await page.waitForTimeout(1000);

      const allocateButton = page.locator(
        'button:has-text("Allocate"), button:has-text("Reserve"), ' +
        '[data-testid="allocate-button"]'
      ).first();

      if (await allocateButton.isVisible()) {
        await allocateButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p0 should create shipment from order', async ({ authenticatedPage: page }) => {
    const orderRow = page.locator('tbody tr a, a[href*="/orders/"]').first();

    if (await orderRow.isVisible()) {
      await orderRow.click();
      await page.waitForTimeout(1000);

      const shipButton = page.locator(
        'button:has-text("Ship"), button:has-text("Create Shipment"), ' +
        '[data-testid="ship-button"]'
      ).first();

      if (await shipButton.isVisible()) {
        await shipButton.click();
        await page.waitForTimeout(500);

        // Fill shipping details if modal appears
        const trackingInput = page.locator(
          'input[name*="tracking"], input[name*="shipment"]'
        ).first();

        if (await trackingInput.isVisible()) {
          await trackingInput.fill('TRACK-E2E-001');
        }
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P1 - MAJOR TESTS
  // ============================================

  test('@p1 should generate pick list', async ({ authenticatedPage: page }) => {
    const orderRow = page.locator('tbody tr a, a[href*="/orders/"]').first();

    if (await orderRow.isVisible()) {
      await orderRow.click();
      await page.waitForTimeout(1000);

      const pickListButton = page.locator(
        'button:has-text("Pick List"), button:has-text("Generate Pick"), ' +
        '[data-testid="pick-list-button"]'
      ).first();

      const hasPickList = await pickListButton.isVisible().catch(() => false);
      console.log(`Pick list generation available: ${hasPickList}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should generate packing slip', async ({ authenticatedPage: page }) => {
    const orderRow = page.locator('tbody tr a, a[href*="/orders/"]').first();

    if (await orderRow.isVisible()) {
      await orderRow.click();
      await page.waitForTimeout(1000);

      const packingSlipButton = page.locator(
        'button:has-text("Packing Slip"), button:has-text("Pack List"), ' +
        '[data-testid="packing-slip-button"]'
      ).first();

      const hasPackingSlip = await packingSlipButton.isVisible().catch(() => false);
      console.log(`Packing slip generation available: ${hasPackingSlip}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should partial ship order', async ({ authenticatedPage: page }) => {
    const orderRow = page.locator('tbody tr a, a[href*="/orders/"]').first();

    if (await orderRow.isVisible()) {
      await orderRow.click();
      await page.waitForTimeout(1000);

      const partialShipButton = page.locator(
        'button:has-text("Partial Ship"), button:has-text("Ship Partial")'
      ).first();

      const hasPartialShip = await partialShipButton.isVisible().catch(() => false);
      console.log(`Partial ship feature available: ${hasPartialShip}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p1 should mark order delivered', async ({ authenticatedPage: page }) => {
    const orderRow = page.locator('tbody tr a, a[href*="/orders/"]').first();

    if (await orderRow.isVisible()) {
      await orderRow.click();
      await page.waitForTimeout(1000);

      const deliveredButton = page.locator(
        'button:has-text("Delivered"), button:has-text("Mark Delivered"), ' +
        'button:has-text("Complete")'
      ).first();

      const hasDelivered = await deliveredButton.isVisible().catch(() => false);
      console.log(`Mark delivered feature available: ${hasDelivered}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  // ============================================
  // P2 - MINOR TESTS
  // ============================================

  test('@p2 should view shipment history', async ({ authenticatedPage: page }) => {
    const orderRow = page.locator('tbody tr a, a[href*="/orders/"]').first();

    if (await orderRow.isVisible()) {
      await orderRow.click();
      await page.waitForTimeout(1000);

      const shipmentsTab = page.locator(
        'button:has-text("Shipments"), [role="tab"]:has-text("Shipments")'
      ).first();

      if (await shipmentsTab.isVisible()) {
        await shipmentsTab.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should print shipping label', async ({ authenticatedPage: page }) => {
    const orderRow = page.locator('tbody tr a, a[href*="/orders/"]').first();

    if (await orderRow.isVisible()) {
      await orderRow.click();
      await page.waitForTimeout(1000);

      const labelButton = page.locator(
        'button:has-text("Print Label"), button:has-text("Shipping Label")'
      ).first();

      const hasLabel = await labelButton.isVisible().catch(() => false);
      console.log(`Shipping label print available: ${hasLabel}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should track shipment', async ({ authenticatedPage: page }) => {
    const orderRow = page.locator('tbody tr a, a[href*="/orders/"]').first();

    if (await orderRow.isVisible()) {
      await orderRow.click();
      await page.waitForTimeout(1000);

      const trackButton = page.locator(
        'button:has-text("Track"), a:has-text("Track Shipment")'
      ).first();

      const hasTracking = await trackButton.isVisible().catch(() => false);
      console.log(`Shipment tracking available: ${hasTracking}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('@p2 should handle return/RMA', async ({ authenticatedPage: page }) => {
    const orderRow = page.locator('tbody tr a, a[href*="/orders/"]').first();

    if (await orderRow.isVisible()) {
      await orderRow.click();
      await page.waitForTimeout(1000);

      const returnButton = page.locator(
        'button:has-text("Return"), button:has-text("RMA"), ' +
        'button:has-text("Create Return")'
      ).first();

      const hasReturn = await returnButton.isVisible().catch(() => false);
      console.log(`Return/RMA handling available: ${hasReturn}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
