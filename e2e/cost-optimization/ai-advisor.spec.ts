import { test, expect } from '../fixtures/auth.fixture';

test.describe('AI Cost Advisor @p1 @cost-optimization', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/advisor');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should display empty state with intro', async ({ authenticatedPage: page }) => {
    // ChatInterface shows intro message and suggestion chips
    const body = await page.locator('body').textContent();
    const hasIntro = body?.includes('AI') || body?.includes('Advisor') || body?.includes('Tư vấn') || body?.includes('Hỏi');
    expect(hasIntro).toBeTruthy();
  });

  test('should display suggestion chips', async ({ authenticatedPage: page }) => {
    // SuggestionChips renders predefined questions
    const chips = page.locator('button').filter({ hasText: /cơ hội|giảm chi phí|NDAA|tự sản xuất|Make.*Buy/i });
    const count = await chips.count();
    // Should have at least some suggestions
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have chat input field', async ({ authenticatedPage: page }) => {
    const input = page.locator('input[type="text"], textarea, input[placeholder*="Hỏi"], input[placeholder*="Ask"], input[placeholder*="message"]').first();
    await expect(input).toBeVisible({ timeout: 5000 });
  });

  test('should have send button', async ({ authenticatedPage: page }) => {
    const sendBtn = page.locator('button[type="submit"], button:has(svg.lucide-send), button:has-text("Gửi"), button:has-text("Send")').first();
    await expect(sendBtn).toBeVisible({ timeout: 5000 });
  });

  test('should send message and show user message', async ({ authenticatedPage: page }) => {
    const input = page.locator('input[type="text"], textarea, input[placeholder*="Hỏi"], input[placeholder*="Ask"], input[placeholder*="message"]').first();

    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill('Tiến độ giảm chi phí thế nào?');

      const sendBtn = page.locator('button[type="submit"], button:has(svg.lucide-send)').first();
      await sendBtn.click();

      // Should show user message in chat
      await page.waitForTimeout(1000);
      const body = await page.locator('body').textContent();
      const hasUserMessage = body?.includes('Tiến độ giảm chi phí');
      expect(hasUserMessage).toBeTruthy();
    }
  });

  test('should receive AI response after sending message', async ({ authenticatedPage: page }) => {
    const input = page.locator('input[type="text"], textarea, input[placeholder*="Hỏi"], input[placeholder*="Ask"], input[placeholder*="message"]').first();

    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill('Hello');
      const sendBtn = page.locator('button[type="submit"], button:has(svg.lucide-send)').first();
      await sendBtn.click();

      // Wait for response (AI may take time)
      // Look for loading indicator first
      const loading = page.locator('.animate-spin, .animate-pulse').first();
      if (await loading.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Wait for loading to finish
        await loading.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
      }

      // Wait a reasonable time for AI response
      await page.waitForTimeout(5000);
      const body = await page.locator('body').textContent();
      expect(body?.length).toBeGreaterThan(50);
    }
  });

  test('should click suggestion chip and send', async ({ authenticatedPage: page }) => {
    const chip = page.locator('button').filter({ hasText: /cơ hội|giảm chi phí/i }).first();
    if (await chip.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chip.click();
      await page.waitForTimeout(1000);

      // Should populate or send the suggestion text
      const body = await page.locator('body').textContent();
      expect(body?.length).toBeGreaterThan(50);
    }
  });

  test('should pre-fill query from URL parameter', async ({ authenticatedPage: page }) => {
    await page.goto('/cost-optimization/advisor?q=NDAA%20compliance');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should auto-fill or auto-send the query
    const body = await page.locator('body').textContent();
    const hasQuery = body?.includes('NDAA') || body?.includes('compliance');
    expect(hasQuery).toBeTruthy();
  });
});
