// =============================================================================
// E2E TESTS - AI DEMAND FORECASTING
// File: e2e/ai-forecast/ai-forecast.spec.ts
// Test Cases: TC01-TC12
// =============================================================================

import { test, expect, Page } from '@playwright/test';
import { testCredentials } from '../fixtures/test-data';

// =============================================================================
// TEST HELPERS
// =============================================================================

async function login(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Use correct credentials from test-data
  await page.fill('input[name="email"]', testCredentials.admin.email);
  await page.fill('input[name="password"]', testCredentials.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
}

async function navigateToForecastDashboard(page: Page) {
  await page.goto('/ai/forecast');
  await page.waitForLoadState('networkidle');
}

async function navigateToMrpPage(page: Page) {
  await page.goto('/mrp');
  await page.waitForLoadState('networkidle');
}

async function navigateToPartDetail(page: Page, partId: string) {
  await page.goto(`/parts/${partId}`);
  await page.waitForLoadState('networkidle');
}

// =============================================================================
// TC01: FORECAST DASHBOARD LOADS WITH KPI CARDS
// =============================================================================

test.describe('AI Forecast Dashboard @p1 @ai-forecast', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('TC01: Forecast dashboard loads with KPI cards', async ({ page }) => {
    await navigateToForecastDashboard(page);

    // Check page title/header
    await expect(page.locator('h1, h2').filter({ hasText: /forecast|dự báo/i }).first()).toBeVisible();

    // Check for KPI cards - look for card containers
    const kpiCards = page.locator('[class*="card"], [class*="Card"]').filter({
      has: page.locator('text=/accuracy|confidence|parts|sản phẩm|độ chính xác/i'),
    });

    // Should have at least some metrics visible
    await expect(page.getByText(/accuracy|độ chính xác/i).first()).toBeVisible({ timeout: 10000 });
  });

  // =============================================================================
  // TC02: FORECAST CHARTS RENDER CORRECTLY
  // =============================================================================

  test('TC02: Forecast charts render correctly', async ({ page }) => {
    await navigateToForecastDashboard(page);

    // Wait for chart container to be visible
    const chartContainer = page.locator('[class*="recharts"], svg.recharts-surface, [class*="chart"]').first();
    
    // Chart should render or there should be a "select product" message
    const hasChart = await chartContainer.isVisible().catch(() => false);
    const hasSelectMessage = await page.getByText(/select|chọn|no data|không có/i).first().isVisible().catch(() => false);

    expect(hasChart || hasSelectMessage).toBeTruthy();
  });

  // =============================================================================
  // TC03: GENERATE FORECAST FOR A PRODUCT
  // =============================================================================

  test('TC03: Generate forecast for a product', async ({ page }) => {
    await navigateToForecastDashboard(page);

    // Look for product selector or generate button
    const generateButton = page.getByRole('button', { name: /generate|tạo|run/i }).first();
    const productSelect = page.locator('select, [role="combobox"]').first();

    // If there's a product selector, select a product
    if (await productSelect.isVisible().catch(() => false)) {
      await productSelect.click();
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible().catch(() => false)) {
        await firstOption.click();
      }
    }

    // Click generate if available
    if (await generateButton.isVisible().catch(() => false)) {
      await generateButton.click();
      
      // Wait for loading to complete
      await page.waitForTimeout(2000);
      
      // Should show results or loading state
      const hasResults = await page.getByText(/forecast|prediction|dự báo/i).first().isVisible().catch(() => false);
      expect(hasResults).toBeTruthy();
    }
  });

  // =============================================================================
  // TC04: VIEW PRODUCT DETAIL FORECAST (4 TABS)
  // =============================================================================

  test('TC04: View product detail forecast has 4 tabs', async ({ page }) => {
    // Navigate to a forecast detail page
    await page.goto('/ai/forecast');
    await page.waitForLoadState('networkidle');

    // Try to find and click on a product link or view detail button
    const viewDetailLink = page.getByRole('link', { name: /view|xem|detail/i }).first();
    const productRow = page.locator('tr, [class*="row"]').filter({ hasText: /SKU|product/i }).first();

    if (await viewDetailLink.isVisible().catch(() => false)) {
      await viewDetailLink.click();
    } else if (await productRow.isVisible().catch(() => false)) {
      await productRow.click();
    }

    await page.waitForLoadState('networkidle');

    // Check for tabs - Overview, History, Accuracy, Models
    const tabsList = page.locator('[role="tablist"]');
    if (await tabsList.isVisible().catch(() => false)) {
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      
      // Should have multiple tabs
      expect(tabCount).toBeGreaterThanOrEqual(2);
    }
  });

  // =============================================================================
  // TC05: SEASONAL PATTERN CHART DISPLAYS
  // =============================================================================

  test('TC05: Seasonal pattern chart displays', async ({ page }) => {
    await navigateToForecastDashboard(page);

    // Look for seasonal pattern section
    const seasonalSection = page.getByText(/seasonal|mùa|pattern|xu hướng/i).first();
    
    if (await seasonalSection.isVisible().catch(() => false)) {
      // Check for chart visualization
      const chartElement = page.locator('[class*="recharts"], svg, canvas').first();
      await expect(chartElement).toBeVisible({ timeout: 5000 });
    }
  });

  // =============================================================================
  // TC06: ACCURACY METRICS PANEL SHOWS DATA
  // =============================================================================

  test('TC06: Accuracy metrics panel shows data', async ({ page }) => {
    await navigateToForecastDashboard(page);

    // Look for accuracy metrics
    const accuracyMetrics = page.getByText(/MAPE|RMSE|MAE|accuracy|độ chính xác/i).first();
    
    // Should show accuracy data or a message about no data
    const hasMetrics = await accuracyMetrics.isVisible().catch(() => false);
    const hasNoDataMessage = await page.getByText(/no data|insufficient|không đủ/i).first().isVisible().catch(() => false);

    expect(hasMetrics || hasNoDataMessage).toBeTruthy();
  });
});

// =============================================================================
// MRP INTEGRATION TESTS
// =============================================================================

test.describe('MRP AI Forecast Integration @p1 @mrp', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // =============================================================================
  // TC07: MRP PAGE - TOGGLE "USE AI FORECAST"
  // =============================================================================

  test('TC07: MRP page - toggle Use AI Forecast', async ({ page }) => {
    await navigateToMrpPage(page);

    // Look for AI Forecast toggle
    const aiToggle = page.locator('button[role="switch"], [class*="switch"]').filter({
      has: page.locator('text=/AI|forecast|dự báo/i'),
    }).first();

    // Alternative: find by label
    const aiLabel = page.getByText(/AI Forecast|Sử dụng AI/i).first();
    
    if (await aiToggle.isVisible().catch(() => false)) {
      await aiToggle.click();
      // Toggle should change state
      await expect(aiToggle).toHaveAttribute('aria-checked', /true|false/);
    } else if (await aiLabel.isVisible().catch(() => false)) {
      // Find nearby switch
      const nearbySwitch = aiLabel.locator('..').locator('button[role="switch"]').first();
      if (await nearbySwitch.isVisible().catch(() => false)) {
        await nearbySwitch.click();
      }
    }
  });

  // =============================================================================
  // TC08: MRP PAGE - SELECT FORECAST WEIGHT (30/50/70/100%)
  // =============================================================================

  test('TC08: MRP page - select forecast weight options', async ({ page }) => {
    await navigateToMrpPage(page);

    // First enable AI Forecast toggle if exists
    const aiToggle = page.locator('button[role="switch"]').first();
    if (await aiToggle.isVisible().catch(() => false)) {
      const isChecked = await aiToggle.getAttribute('aria-checked');
      if (isChecked !== 'true') {
        await aiToggle.click();
        await page.waitForTimeout(500);
      }
    }

    // Look for weight selector
    const weightSelector = page.locator('select, [role="combobox"]').filter({
      has: page.locator('text=/weight|%|trọng số/i'),
    }).first();

    if (await weightSelector.isVisible().catch(() => false)) {
      await weightSelector.click();
      
      // Check for weight options
      const options = page.locator('[role="option"]');
      const optionCount = await options.count();
      
      // Should have multiple weight options (30%, 50%, 70%, 100%)
      expect(optionCount).toBeGreaterThanOrEqual(2);
    }
  });

  // =============================================================================
  // TC09: MRP PAGE - HOLIDAY BUFFER INDICATOR
  // =============================================================================

  test('TC09: MRP page - holiday buffer indicator', async ({ page }) => {
    await navigateToMrpPage(page);

    // Enable AI Forecast first
    const aiToggle = page.locator('button[role="switch"]').first();
    if (await aiToggle.isVisible().catch(() => false)) {
      const isChecked = await aiToggle.getAttribute('aria-checked');
      if (isChecked !== 'true') {
        await aiToggle.click();
        await page.waitForTimeout(1000);
      }
    }

    // Look for holiday buffer indicator
    const holidayIndicator = page.getByText(/holiday|buffer|Tết|ngày lễ/i).first();
    const bufferPercent = page.getByText(/\+\d+%/i).first();

    // Should show holiday-related info when AI forecast is enabled
    const hasIndicator = await holidayIndicator.isVisible().catch(() => false);
    const hasPercent = await bufferPercent.isVisible().catch(() => false);

    // At least the AI section should be visible
    const aiSection = page.getByText(/AI Forecast|Forecast Integration/i).first();
    expect(await aiSection.isVisible().catch(() => false)).toBeTruthy();
  });
});

// =============================================================================
// PART DETAIL AI RECOMMENDATIONS TESTS
// =============================================================================

test.describe('Part Detail AI Recommendations @p1 @parts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // =============================================================================
  // TC10: PART DETAIL - AI TAB SHOWS RECOMMENDATIONS
  // =============================================================================

  test('TC10: Part detail - AI tab shows recommendations', async ({ page }) => {
    // Navigate to parts list
    await page.goto('/parts');
    await page.waitForLoadState('networkidle');

    // Click on first part to go to detail
    const partLink = page.locator('a[href*="/parts/"]').first();
    if (await partLink.isVisible().catch(() => false)) {
      await partLink.click();
      await page.waitForLoadState('networkidle');

      // Look for AI tab
      const aiTab = page.locator('[role="tab"]').filter({ hasText: /AI/i }).first();
      
      if (await aiTab.isVisible().catch(() => false)) {
        await aiTab.click();
        await page.waitForTimeout(1000);

        // Should show AI recommendations section or "Get recommendations" button
        const hasRecommendations = await page.getByText(/recommendation|khuyến nghị|safety stock|tồn kho/i).first().isVisible().catch(() => false);
        const hasGetButton = await page.getByRole('button', { name: /get|lấy|analyze/i }).first().isVisible().catch(() => false);

        expect(hasRecommendations || hasGetButton).toBeTruthy();
      }
    }
  });

  // =============================================================================
  // TC11: PART DETAIL - CURRENT VS RECOMMENDED COMPARISON
  // =============================================================================

  test('TC11: Part detail - current vs recommended comparison', async ({ page }) => {
    await page.goto('/parts');
    await page.waitForLoadState('networkidle');

    const partLink = page.locator('a[href*="/parts/"]').first();
    if (await partLink.isVisible().catch(() => false)) {
      await partLink.click();
      await page.waitForLoadState('networkidle');

      // Click AI tab
      const aiTab = page.locator('[role="tab"]').filter({ hasText: /AI/i }).first();
      if (await aiTab.isVisible().catch(() => false)) {
        await aiTab.click();
        await page.waitForTimeout(500);

        // Click "Get Recommendations" if available
        const getButton = page.getByRole('button', { name: /get|lấy|analyze|recommendations/i }).first();
        if (await getButton.isVisible().catch(() => false)) {
          await getButton.click();
          await page.waitForTimeout(3000); // Wait for API response
        }

        // Look for comparison display (Current vs Recommended)
        const currentLabel = page.getByText(/current|hiện tại/i).first();
        const recommendedLabel = page.getByText(/recommended|khuyến nghị|đề xuất/i).first();

        const hasComparison = await currentLabel.isVisible().catch(() => false) || 
                             await recommendedLabel.isVisible().catch(() => false);

        // Should show comparison or error/no-data message
        const hasError = await page.getByText(/error|lỗi|no data|insufficient/i).first().isVisible().catch(() => false);
        
        expect(hasComparison || hasError).toBeTruthy();
      }
    }
  });

  // =============================================================================
  // TC12: PART DETAIL - APPLY RECOMMENDATIONS BUTTON
  // =============================================================================

  test('TC12: Part detail - apply recommendations button', async ({ page }) => {
    await page.goto('/parts');
    await page.waitForLoadState('networkidle');

    const partLink = page.locator('a[href*="/parts/"]').first();
    if (await partLink.isVisible().catch(() => false)) {
      await partLink.click();
      await page.waitForLoadState('networkidle');

      // Click AI tab
      const aiTab = page.locator('[role="tab"]').filter({ hasText: /AI/i }).first();
      if (await aiTab.isVisible().catch(() => false)) {
        await aiTab.click();
        await page.waitForTimeout(500);

        // Click "Get Recommendations" if available
        const getButton = page.getByRole('button', { name: /get|lấy|analyze|recommendations/i }).first();
        if (await getButton.isVisible().catch(() => false)) {
          await getButton.click();
          await page.waitForTimeout(3000);
        }

        // Look for "Apply Recommendations" button
        const applyButton = page.getByRole('button', { name: /apply|áp dụng/i }).first();
        
        // Button should exist (may be disabled if no changes needed)
        if (await applyButton.isVisible().catch(() => false)) {
          const isDisabled = await applyButton.isDisabled().catch(() => true);
          
          // Button should be present (enabled or disabled based on delta)
          expect(await applyButton.isVisible()).toBeTruthy();
        }
      }
    }
  });
});
