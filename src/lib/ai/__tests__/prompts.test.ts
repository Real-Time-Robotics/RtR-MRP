import { describe, it, expect } from 'vitest';
import {
  detectIntent,
  buildPrompt,
  MRP_SYSTEM_CONTEXT,
  RESPONSE_TEMPLATES,
  QueryIntent,
  DetectedIntent,
  PromptContext,
} from '../prompts';

// =============================================================================
// SYSTEM CONTEXT
// =============================================================================

describe('MRP_SYSTEM_CONTEXT', () => {
  it('is a non-empty string', () => {
    expect(MRP_SYSTEM_CONTEXT).toBeTruthy();
    expect(typeof MRP_SYSTEM_CONTEXT).toBe('string');
  });

  it('contains role description', () => {
    expect(MRP_SYSTEM_CONTEXT).toContain('Trợ lý AI');
  });

  it('contains response formatting rules', () => {
    expect(MRP_SYSTEM_CONTEXT).toContain('bold');
  });
});

// =============================================================================
// INTENT DETECTION
// =============================================================================

describe('detectIntent', () => {
  // Inventory
  it('detects inventory_status for "tồn kho"', () => {
    const result = detectIntent('Kiểm tra tồn kho');
    expect(result.intent).toBe('inventory_status');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects inventory_status for "stock"', () => {
    const result = detectIntent('Check current stock levels');
    expect(result.intent).toBe('inventory_status');
  });

  it('detects inventory_shortage for "thiếu"', () => {
    const result = detectIntent('Vật tư nào đang thiếu?');
    expect(result.intent).toBe('inventory_shortage');
  });

  it('detects inventory_shortage for "hết hàng"', () => {
    const result = detectIntent('Sắp hết hàng chưa?');
    expect(result.intent).toBe('inventory_shortage');
  });

  it('detects inventory_shortage for "critical"', () => {
    const result = detectIntent('Show me critical items');
    expect(result.intent).toBe('inventory_shortage');
  });

  // Orders
  it('detects order_status for SO number', () => {
    const result = detectIntent('Tình trạng đơn hàng SO-2025-001');
    expect(result.intent).toBe('order_status');
  });

  it('detects order_summary for "tổng đơn hàng"', () => {
    const result = detectIntent('Tổng hợp đơn hàng tuần này');
    expect(result.intent).toBe('order_summary');
  });

  it('detects order_summary for "doanh thu"', () => {
    const result = detectIntent('Doanh thu tháng này bao nhiêu?');
    expect(result.intent).toBe('order_summary');
  });

  // Production
  it('detects production_status for "sản xuất"', () => {
    const result = detectIntent('Tiến độ sản xuất hôm nay');
    expect(result.intent).toBe('production_status');
  });

  it('detects production_status for WO number', () => {
    const result = detectIntent('WO-2025-001 đang ở đâu?');
    expect(result.intent).toBe('production_status');
  });

  // MRP
  it('detects mrp_calculation for "mrp"', () => {
    const result = detectIntent('Chạy MRP cho đơn hàng mới');
    expect(result.intent).toBe('mrp_calculation');
  });

  it('detects mrp_calculation for "nhu cầu vật tư"', () => {
    const result = detectIntent('Tính toán nhu cầu vật tư');
    expect(result.intent).toBe('mrp_calculation');
  });

  // Purchase
  it('detects purchase_suggestion for "đề xuất mua"', () => {
    const result = detectIntent('Đề xuất mua hàng tuần này');
    expect(result.intent).toBe('purchase_suggestion');
  });

  it('detects purchase_suggestion for "tạo PO"', () => {
    const result = detectIntent('Tạo PO cho nhà cung cấp');
    expect(result.intent).toBe('purchase_suggestion');
  });

  // Quality
  it('detects quality_report for "chất lượng"', () => {
    const result = detectIntent('Báo cáo chất lượng tháng này');
    expect(result.intent).toBe('quality_report');
  });

  it('detects quality_report for "NCR"', () => {
    const result = detectIntent('Có bao nhiêu NCR đang mở?');
    expect(result.intent).toBe('quality_report');
  });

  // Supplier
  it('detects supplier_info for "supplier"', () => {
    const result = detectIntent('Show supplier information');
    expect(result.intent).toBe('supplier_info');
  });

  // Analytics
  it('detects analytics for "xu hướng"', () => {
    // "Xu hướng doanh thu" matches both analytics ("xu hướng") and order_summary ("doanh thu")
    // Use a query that only matches analytics
    const result = detectIntent('Xu hướng tháng trước so sánh thống kê');
    expect(result.intent).toBe('analytics');
  });

  it('detects analytics for "report"', () => {
    const result = detectIntent('Generate a monthly report');
    expect(result.intent).toBe('analytics');
  });

  // Help
  it('detects help for "giúp"', () => {
    const result = detectIntent('Giúp tôi với');
    expect(result.intent).toBe('help');
  });

  it('detects help for "có thể làm gì"', () => {
    const result = detectIntent('Bạn có thể làm gì?');
    expect(result.intent).toBe('help');
  });

  // General
  it('returns general for unmatched queries', () => {
    const result = detectIntent('xin chào');
    expect(result.intent).toBe('general');
    expect(result.confidence).toBe(0.5);
  });

  // Entity extraction
  it('extracts part numbers', () => {
    const result = detectIntent('Tồn kho CMP-BRG-002 còn bao nhiêu?');
    expect(result.entities.partNumbers).toContain('CMP-BRG-002');
  });

  it('extracts order numbers', () => {
    const result = detectIntent('Tình trạng SO-2025-001');
    expect(result.entities.orderNumbers).toContain('SO-2025-001');
  });

  it('extracts work order numbers', () => {
    const result = detectIntent('Tiến độ WO-2025-003');
    expect(result.entities.orderNumbers).toContain('WO-2025-003');
  });

  it('extracts multiple entities', () => {
    const result = detectIntent('So sánh CMP-BRG-002 và CMP-BRG-003');
    expect(result.entities.partNumbers).toHaveLength(2);
  });

  // Confidence scoring
  it('higher confidence for multiple keyword matches', () => {
    const single = detectIntent('tồn kho');
    const multi = detectIntent('tồn kho hiện tại inventory stock');
    expect(multi.confidence).toBeGreaterThanOrEqual(single.confidence);
  });

  it('caps confidence at 1', () => {
    const result = detectIntent('tồn kho inventory stock còn bao nhiêu số lượng kho');
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// PROMPT BUILDING
// =============================================================================

describe('buildPrompt', () => {
  it('builds basic prompt with system context and user query', () => {
    const context: PromptContext = {
      intent: 'general',
      query: 'Xin chào',
    };

    const messages = buildPrompt(context);
    expect(messages.length).toBeGreaterThanOrEqual(2);
    // First message should be system context
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('Trợ lý AI');
    // Last message should be user query
    expect(messages[messages.length - 1].role).toBe('user');
    expect(messages[messages.length - 1].content).toBe('Xin chào');
  });

  it('includes RAG context when provided', () => {
    const context: PromptContext = {
      intent: 'general',
      query: 'Test query',
      ragContext: 'Some RAG knowledge',
    };

    const messages = buildPrompt(context);
    const ragMessage = messages.find(m => m.content.includes('Some RAG knowledge'));
    expect(ragMessage).toBeDefined();
    expect(ragMessage!.role).toBe('system');
  });

  it('includes legacy context when provided', () => {
    const context: PromptContext = {
      intent: 'general',
      query: 'Test query',
      context: 'Legacy context data',
    };

    const messages = buildPrompt(context);
    const contextMessage = messages.find(m => m.content.includes('Legacy context data'));
    expect(contextMessage).toBeDefined();
  });

  it('includes inventory data context', () => {
    const context: PromptContext = {
      intent: 'inventory_status',
      query: 'Tồn kho?',
      data: {
        summary: { totalItems: 100, okCount: 80, lowCount: 15, outCount: 5, totalValue: 5000000 },
        items: [
          { partNumber: 'PRT-001', partName: 'Part A', onHand: 50, unit: 'pcs', status: 'ok' },
        ],
        alerts: [
          { partNumber: 'PRT-002', partName: 'Part B', onHand: 2, minStock: 10 },
        ],
      },
    };

    const messages = buildPrompt(context);
    const dataMessage = messages.find(m => m.content.includes('Tổng quan tồn kho'));
    expect(dataMessage).toBeDefined();
    expect(dataMessage!.content).toContain('PRT-001');
    expect(dataMessage!.content).toContain('PRT-002');
  });

  it('includes order data context', () => {
    const context: PromptContext = {
      intent: 'order_summary',
      query: 'Tổng đơn hàng?',
      data: {
        summary: { totalOrders: 10, pendingCount: 3, processingCount: 5, completedCount: 2, monthlyRevenue: 1000000 },
        orders: [
          { orderNumber: 'SO-001', customer: 'Customer A', value: 500000, status: 'pending' },
        ],
      },
    };

    const messages = buildPrompt(context);
    const dataMessage = messages.find(m => m.content.includes('Tổng quan đơn hàng'));
    expect(dataMessage).toBeDefined();
    expect(dataMessage!.content).toContain('SO-001');
  });

  it('includes production data context', () => {
    const context: PromptContext = {
      intent: 'production_status',
      query: 'Sản xuất?',
      data: {
        summary: { efficiency: 85, runningCount: 3, waitingCount: 1, completedToday: 2 },
        workOrders: [
          { orderNumber: 'WO-001', product: 'Product A', status: 'running', progress: 60 },
        ],
      },
    };

    const messages = buildPrompt(context);
    const dataMessage = messages.find(m => m.content.includes('Tổng quan sản xuất'));
    expect(dataMessage).toBeDefined();
  });

  it('includes MRP data context', () => {
    const context: PromptContext = {
      intent: 'mrp_calculation',
      query: 'MRP?',
      data: {
        shortages: [
          { partNumber: 'PRT-001', partName: 'Part A', shortage: 50, safetyStock: 10, unit: 'pcs' },
        ],
        suggestions: [
          { partNumber: 'PRT-001', quantity: 100, unit: 'pcs', supplier: 'Supplier A', totalCost: 500000 },
        ],
      },
    };

    const messages = buildPrompt(context);
    const dataMessage = messages.find(m => m.content.includes('Kết quả MRP'));
    expect(dataMessage).toBeDefined();
  });

  it('includes purchase data context', () => {
    const context: PromptContext = {
      intent: 'purchase_suggestion',
      query: 'Cần mua gì?',
      data: {
        totalValue: 2000000,
        bySupplier: { 'Supplier A': { items: 3, total: 1000000 } },
        suggestions: [
          { partNumber: 'PRT-001', quantity: 50, unit: 'pcs', supplier: 'Supplier A', totalCost: 500000, priority: 'URGENT' },
        ],
      },
    };

    const messages = buildPrompt(context);
    const dataMessage = messages.find(m => m.content.includes('Đề xuất mua hàng'));
    expect(dataMessage).toBeDefined();
  });

  it('includes quality data context', () => {
    const context: PromptContext = {
      intent: 'quality_report',
      query: 'Chất lượng?',
      data: {
        summary: { passRate: 95, openNCRs: 3, inspectionsToday: 10 },
        ncrs: [{ ncrNumber: 'NCR-001', description: 'Defect found', status: 'open' }],
      },
    };

    const messages = buildPrompt(context);
    const dataMessage = messages.find(m => m.content.includes('Báo cáo chất lượng'));
    expect(dataMessage).toBeDefined();
  });

  it('includes analytics data context', () => {
    const context: PromptContext = {
      intent: 'analytics',
      query: 'Phân tích?',
      data: {
        revenue: { thisMonth: 5000000, lastMonth: 4000000, growth: 25 },
        trends: [{ period: '2025-01', value: 4000000 }, { period: '2025-02', value: 5000000 }],
      },
    };

    const messages = buildPrompt(context);
    const dataMessage = messages.find(m => m.content.includes('Phân tích'));
    expect(dataMessage).toBeDefined();
  });

  it('falls back to JSON for unknown intents with data', () => {
    const context: PromptContext = {
      intent: 'help',
      query: 'Help?',
      data: { someKey: 'someValue' },
    };

    const messages = buildPrompt(context);
    const dataMessage = messages.find(m => m.content.includes('someKey'));
    expect(dataMessage).toBeDefined();
  });

  it('does not add data context when no data provided', () => {
    const context: PromptContext = {
      intent: 'inventory_status',
      query: 'Tồn kho?',
    };

    const messages = buildPrompt(context);
    // Only system context + user query
    expect(messages).toHaveLength(2);
  });
});

// =============================================================================
// RESPONSE TEMPLATES
// =============================================================================

describe('RESPONSE_TEMPLATES', () => {
  it('has no_data template', () => {
    expect(RESPONSE_TEMPLATES.no_data).toBeTruthy();
    expect(RESPONSE_TEMPLATES.no_data).toContain('Xin lỗi');
  });

  it('has error template', () => {
    expect(RESPONSE_TEMPLATES.error).toBeTruthy();
    expect(RESPONSE_TEMPLATES.error).toContain('lỗi');
  });

  it('has help template', () => {
    expect(RESPONSE_TEMPLATES.help).toBeTruthy();
    expect(RESPONSE_TEMPLATES.help).toContain('Trợ lý AI');
  });

  it('has greeting template', () => {
    expect(RESPONSE_TEMPLATES.greeting).toBeTruthy();
    expect(RESPONSE_TEMPLATES.greeting).toContain('Xin chào');
  });
});
