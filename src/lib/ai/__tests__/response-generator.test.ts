import { describe, it, expect } from 'vitest';
import {
  generateStructuredResponse,
  StructuredResponse,
  AIAction,
} from '../response-generator';
import { DetectedIntent, QueryIntent } from '../prompts';

// =============================================================================
// HELPERS
// =============================================================================

function makeIntent(intent: QueryIntent, confidence = 0.9): DetectedIntent {
  return {
    intent,
    confidence,
    entities: {},
  };
}

// =============================================================================
// INVENTORY ACTIONS
// =============================================================================

describe('generateStructuredResponse — inventory_status', () => {
  it('generates critical item actions when CRITICAL items exist', () => {
    const data = {
      alerts: [
        { partNumber: 'P001', partName: 'Bolt', onHand: 0, minStock: 100, safetyStock: 20, status: 'CRITICAL' },
        { partNumber: 'P002', partName: 'Nut', onHand: 5, minStock: 50, safetyStock: 10, status: 'OUT' },
      ],
      summary: { totalItems: 10, okCount: 8, lowCount: 0, outCount: 2, totalValue: 50000 },
    };
    const res = generateStructuredResponse(makeIntent('inventory_status'), data);

    expect(res.actions.some((a) => a.id === 'create-pr-critical')).toBe(true);
    expect(res.actions.some((a) => a.id === 'view-critical')).toBe(true);
    expect(res.actions.some((a) => a.id === 'export-inventory')).toBe(true);
  });

  it('generates low stock actions when LOW items exist', () => {
    const data = {
      alerts: [
        { partNumber: 'P003', partName: 'Washer', onHand: 30, minStock: 50, status: 'LOW' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('inventory_status'), data);
    expect(res.actions.some((a) => a.id === 'create-pr-low')).toBe(true);
  });

  it('always includes export-inventory action', () => {
    const res = generateStructuredResponse(makeIntent('inventory_status'), {});
    expect(res.actions.some((a) => a.id === 'export-inventory')).toBe(true);
  });

  it('uses items fallback when alerts is undefined', () => {
    const data = {
      items: [
        { partNumber: 'P001', partName: 'Bolt', onHand: 0, minStock: 100, safetyStock: 20, status: 'OUT' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('inventory_status'), data);
    expect(res.actions.some((a) => a.id === 'create-pr-critical')).toBe(true);
  });

  it('calculates correct PR quantity for critical items', () => {
    const data = {
      alerts: [
        { partNumber: 'P001', partName: 'Bolt', onHand: 10, minStock: 100, safetyStock: 20, status: 'CRITICAL' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('inventory_status'), data);
    const prAction = res.actions.find((a) => a.id === 'create-pr-critical');
    const items = prAction?.payload.items as Array<{ partNumber: string; quantity: number }>;
    // quantity = max(100 - 10 + 20, 1) = 110
    expect(items[0].quantity).toBe(110);
  });

  it('calculates correct PR quantity for low stock items', () => {
    const data = {
      alerts: [
        { partNumber: 'P003', partName: 'Washer', onHand: 30, minStock: 50, status: 'LOW' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('inventory_shortage'), data);
    const prAction = res.actions.find((a) => a.id === 'create-pr-low');
    const items = prAction?.payload.items as Array<{ partNumber: string; quantity: number }>;
    // quantity = max(50 - 30, 1) = 20
    expect(items[0].quantity).toBe(20);
  });

  it('ensures minimum quantity of 1 for critical items', () => {
    const data = {
      alerts: [
        { partNumber: 'P001', partName: 'X', onHand: 200, minStock: 100, safetyStock: 0, status: 'CRITICAL' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('inventory_status'), data);
    const prAction = res.actions.find((a) => a.id === 'create-pr-critical');
    const items = prAction?.payload.items as Array<{ partNumber: string; quantity: number }>;
    // max(100 - 200 + 0, 1) = max(-100, 1) = 1
    expect(items[0].quantity).toBe(1);
  });
});

// =============================================================================
// ORDER ACTIONS
// =============================================================================

describe('generateStructuredResponse — order_status / order_summary', () => {
  it('generates pending order actions when pending orders exist', () => {
    const data = {
      pending: [
        { orderNumber: 'SO-001', customer: 'ABC', value: 1000, status: 'PENDING' },
        { orderNumber: 'SO-002', customer: 'XYZ', value: 2000, status: 'PENDING' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('order_status'), data);
    expect(res.actions.some((a) => a.id === 'view-pending-orders')).toBe(true);
    expect(res.actions.some((a) => a.id === 'process-orders')).toBe(true);
    expect(res.actions.some((a) => a.id === 'create-order')).toBe(true);
  });

  it('always includes create-order action even without pending', () => {
    const res = generateStructuredResponse(makeIntent('order_summary'), {});
    expect(res.actions.some((a) => a.id === 'create-order')).toBe(true);
    expect(res.actions.some((a) => a.id === 'view-pending-orders')).toBe(false);
  });

  it('process-orders payload includes order numbers', () => {
    const data = {
      pending: [{ orderNumber: 'SO-001' }, { orderNumber: 'SO-002' }],
    };
    const res = generateStructuredResponse(makeIntent('order_status'), data);
    const processAction = res.actions.find((a) => a.id === 'process-orders');
    expect(processAction?.payload.orderIds).toEqual(['SO-001', 'SO-002']);
  });
});

// =============================================================================
// PRODUCTION ACTIONS
// =============================================================================

describe('generateStructuredResponse — production_status', () => {
  it('generates material resolve action for waiting orders', () => {
    const data = {
      workOrders: [
        { orderNumber: 'WO-001', product: 'SKU-A', status: 'Waiting Material', progress: 0 },
        { orderNumber: 'WO-002', product: 'SKU-B', status: 'waiting_material', progress: 0 },
      ],
    };
    const res = generateStructuredResponse(makeIntent('production_status'), data);
    expect(res.actions.some((a) => a.id === 'resolve-material')).toBe(true);
    const resolveAction = res.actions.find((a) => a.id === 'resolve-material');
    expect(resolveAction?.payload.woNumbers).toEqual(['WO-001', 'WO-002']);
  });

  it('always includes view-schedule action', () => {
    const res = generateStructuredResponse(makeIntent('production_status'), {});
    expect(res.actions.some((a) => a.id === 'view-schedule')).toBe(true);
  });

  it('does not include resolve-material when no waiting orders', () => {
    const data = {
      workOrders: [
        { orderNumber: 'WO-001', product: 'SKU-A', status: 'in_progress', progress: 50 },
      ],
    };
    const res = generateStructuredResponse(makeIntent('production_status'), data);
    expect(res.actions.some((a) => a.id === 'resolve-material')).toBe(false);
  });
});

// =============================================================================
// PURCHASE ACTIONS
// =============================================================================

describe('generateStructuredResponse — purchase_suggestion / mrp_calculation', () => {
  it('generates urgent PO action for urgent suggestions', () => {
    const data = {
      suggestions: [
        { partNumber: 'P001', quantity: 100, unit: 'pcs', supplier: 'S1', totalCost: 5000, priority: 'URGENT' },
        { partNumber: 'P002', quantity: 50, unit: 'kg', supplier: 'S2', totalCost: 2000, priority: 'HIGH' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('purchase_suggestion'), data);
    expect(res.actions.some((a) => a.id === 'create-po-urgent')).toBe(true);
    expect(res.actions.some((a) => a.id === 'review-suggestions')).toBe(true);
  });

  it('does not create urgent PO when no urgent suggestions', () => {
    const data = {
      suggestions: [
        { partNumber: 'P002', quantity: 50, unit: 'kg', supplier: 'S2', totalCost: 2000, priority: 'HIGH' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('mrp_calculation'), data);
    expect(res.actions.some((a) => a.id === 'create-po-urgent')).toBe(false);
    expect(res.actions.some((a) => a.id === 'review-suggestions')).toBe(true);
  });

  it('returns empty actions when no suggestions', () => {
    const res = generateStructuredResponse(makeIntent('purchase_suggestion'), {});
    expect(res.actions).toHaveLength(0);
  });
});

// =============================================================================
// QUALITY ACTIONS
// =============================================================================

describe('generateStructuredResponse — quality_report', () => {
  it('generates critical NCR action for high severity', () => {
    const data = {
      ncrs: [
        { ncrNumber: 'NCR-001', description: 'Crack', status: 'OPEN', severity: 'critical' },
        { ncrNumber: 'NCR-002', description: 'Dent', status: 'OPEN', severity: 'high' },
        { ncrNumber: 'NCR-003', description: 'Scratch', status: 'OPEN', severity: 'low' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('quality_report'), data);
    expect(res.actions.some((a) => a.id === 'view-critical-ncrs')).toBe(true);
    expect(res.actions.some((a) => a.id === 'create-capa')).toBe(true);
  });

  it('does not generate critical NCR action when no high severity', () => {
    const data = {
      ncrs: [
        { ncrNumber: 'NCR-003', description: 'Scratch', status: 'OPEN', severity: 'low' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('quality_report'), data);
    expect(res.actions.some((a) => a.id === 'view-critical-ncrs')).toBe(false);
    expect(res.actions.some((a) => a.id === 'create-capa')).toBe(true);
  });

  it('returns empty actions when no ncrs', () => {
    const res = generateStructuredResponse(makeIntent('quality_report'), {});
    expect(res.actions).toHaveLength(0);
  });
});

// =============================================================================
// DEFAULT / GENERAL ACTIONS
// =============================================================================

describe('generateStructuredResponse — default intents', () => {
  it('returns dashboard action for general intent', () => {
    const res = generateStructuredResponse(makeIntent('general'), {});
    expect(res.actions).toHaveLength(1);
    expect(res.actions[0].id).toBe('view-dashboard');
    expect(res.actions[0].href).toBe('/dashboard');
  });

  it('returns dashboard action for help intent', () => {
    const res = generateStructuredResponse(makeIntent('help'), {});
    expect(res.actions[0].id).toBe('view-dashboard');
  });

  it('returns dashboard action for supplier_info intent', () => {
    const res = generateStructuredResponse(makeIntent('supplier_info'), {});
    expect(res.actions[0].id).toBe('view-dashboard');
  });

  it('returns dashboard action for analytics intent', () => {
    const res = generateStructuredResponse(makeIntent('analytics'), {});
    expect(res.actions[0].id).toBe('view-dashboard');
  });
});

// =============================================================================
// ACTION LIMIT
// =============================================================================

describe('generateStructuredResponse — action limit', () => {
  it('limits actions to 4', () => {
    // inventory_status with both critical + low + export = 4 actions
    const data = {
      alerts: [
        { partNumber: 'P001', partName: 'A', onHand: 0, minStock: 100, safetyStock: 10, status: 'CRITICAL' },
        { partNumber: 'P002', partName: 'B', onHand: 30, minStock: 50, status: 'LOW' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('inventory_status'), data);
    expect(res.actions.length).toBeLessThanOrEqual(4);
  });
});

// =============================================================================
// ALERTS
// =============================================================================

describe('generateStructuredResponse — alerts', () => {
  it('generates critical alert for inventory with CRITICAL items', () => {
    const data = {
      alerts: [
        { partNumber: 'P001', partName: 'Bolt', onHand: 0, minStock: 100, status: 'CRITICAL' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('inventory_status'), data);
    expect(res.alerts.some((a) => a.type === 'critical')).toBe(true);
    expect(res.alerts[0].action).toBeDefined();
    expect(res.alerts[0].action?.id).toBe('quick-pr');
  });

  it('generates warning alert for LOW inventory items', () => {
    const data = {
      alerts: [
        { partNumber: 'P003', partName: 'Washer', onHand: 30, minStock: 50, status: 'LOW' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('inventory_shortage'), data);
    expect(res.alerts.some((a) => a.type === 'warning')).toBe(true);
  });

  it('generates warning alert for order_status with >5 pending', () => {
    const pending = Array.from({ length: 6 }, (_, i) => ({
      orderNumber: `SO-${i}`,
      customer: `C${i}`,
      value: 1000,
    }));
    const data = { pending };
    const res = generateStructuredResponse(makeIntent('order_status'), data);
    expect(res.alerts.some((a) => a.type === 'warning')).toBe(true);
  });

  it('does not generate alert for order_status with <=5 pending', () => {
    const data = {
      pending: [{ orderNumber: 'SO-1' }, { orderNumber: 'SO-2' }],
    };
    const res = generateStructuredResponse(makeIntent('order_status'), data);
    expect(res.alerts).toHaveLength(0);
  });

  it('generates warning for production waiting count', () => {
    const data = {
      summary: { waitingCount: 3, efficiency: 90, runningCount: 5 },
    };
    const res = generateStructuredResponse(makeIntent('production_status'), data);
    expect(res.alerts.some((a) => a.type === 'warning')).toBe(true);
  });

  it('generates info alert for low production efficiency', () => {
    const data = {
      summary: { waitingCount: 0, efficiency: 70, runningCount: 5 },
    };
    const res = generateStructuredResponse(makeIntent('production_status'), data);
    expect(res.alerts.some((a) => a.type === 'info')).toBe(true);
    expect(res.alerts[0].message).toContain('70.0%');
  });

  it('no production alert if efficiency >= 80 and waitingCount = 0', () => {
    const data = {
      summary: { waitingCount: 0, efficiency: 85, runningCount: 5 },
    };
    const res = generateStructuredResponse(makeIntent('production_status'), data);
    expect(res.alerts).toHaveLength(0);
  });

  it('generates warning for quality with > 5 open NCRs', () => {
    const data = {
      summary: { openNCRs: 10, passRate: 98 },
    };
    const res = generateStructuredResponse(makeIntent('quality_report'), data);
    expect(res.alerts.some((a) => a.type === 'warning')).toBe(true);
  });

  it('generates critical alert for quality with passRate < 95', () => {
    const data = {
      summary: { openNCRs: 1, passRate: 90 },
    };
    const res = generateStructuredResponse(makeIntent('quality_report'), data);
    expect(res.alerts.some((a) => a.type === 'critical')).toBe(true);
    expect(res.alerts[0].message).toContain('90.0%');
  });

  it('no quality alert if passRate >= 95 and openNCRs <= 5', () => {
    const data = {
      summary: { openNCRs: 3, passRate: 97 },
    };
    const res = generateStructuredResponse(makeIntent('quality_report'), data);
    expect(res.alerts).toHaveLength(0);
  });

  it('both quality alerts when openNCRs > 5 AND passRate < 95', () => {
    const data = {
      summary: { openNCRs: 10, passRate: 90 },
    };
    const res = generateStructuredResponse(makeIntent('quality_report'), data);
    expect(res.alerts).toHaveLength(2);
  });
});

// =============================================================================
// SUMMARY GENERATION
// =============================================================================

describe('generateStructuredResponse — summary', () => {
  it('generates inventory_status summary with stats', () => {
    const data = {
      summary: { totalItems: 100, okCount: 80, lowCount: 15, outCount: 5, totalValue: 1000000 },
    };
    const res = generateStructuredResponse(makeIntent('inventory_status'), data);
    expect(res.summary).toContain('100');
    expect(res.summary).toContain('80');
    expect(res.summary).toContain('15');
    expect(res.summary).toContain('5');
  });

  it('returns fallback summary when no inventory data', () => {
    const res = generateStructuredResponse(makeIntent('inventory_status'), {});
    expect(res.summary).toBe('Không có dữ liệu tồn kho.');
  });

  it('generates inventory_shortage summary', () => {
    const data = {
      critical: [{ partNumber: 'P1' }, { partNumber: 'P2' }],
      low: [{ partNumber: 'P3' }],
    };
    const res = generateStructuredResponse(makeIntent('inventory_shortage'), data);
    expect(res.summary).toContain('2');
    expect(res.summary).toContain('1');
  });

  it('generates order summary', () => {
    const data = {
      summary: { totalOrders: 50, pendingCount: 10, processingCount: 20, completedCount: 20 },
    };
    const res = generateStructuredResponse(makeIntent('order_status'), data);
    expect(res.summary).toContain('50');
  });

  it('returns fallback order summary when no data', () => {
    const res = generateStructuredResponse(makeIntent('order_summary'), {});
    expect(res.summary).toBe('Không có dữ liệu đơn hàng.');
  });

  it('generates production summary', () => {
    const data = {
      summary: { efficiency: 85.5, runningCount: 10, waitingCount: 2 },
    };
    const res = generateStructuredResponse(makeIntent('production_status'), data);
    expect(res.summary).toContain('85.5%');
  });

  it('returns fallback production summary when no data', () => {
    const res = generateStructuredResponse(makeIntent('production_status'), {});
    expect(res.summary).toBe('Không có dữ liệu sản xuất.');
  });

  it('generates quality summary', () => {
    const data = {
      summary: { passRate: 97.3, openNCRs: 4, inspectionsToday: 15 },
    };
    const res = generateStructuredResponse(makeIntent('quality_report'), data);
    expect(res.summary).toContain('97.3%');
    expect(res.summary).toContain('4');
    expect(res.summary).toContain('15');
  });

  it('returns fallback quality summary when no data', () => {
    const res = generateStructuredResponse(makeIntent('quality_report'), {});
    expect(res.summary).toBe('Không có dữ liệu chất lượng.');
  });

  it('returns default summary for general intent', () => {
    const res = generateStructuredResponse(makeIntent('general'), {});
    expect(res.summary).toBe('Đây là kết quả phân tích từ hệ thống.');
  });
});

// =============================================================================
// DETAIL SECTIONS
// =============================================================================

describe('generateStructuredResponse — detail sections', () => {
  it('generates stats and table sections for inventory_status', () => {
    const data = {
      summary: { totalItems: 10, okCount: 7, lowCount: 2, outCount: 1, totalValue: 500000 },
      alerts: [
        { partNumber: 'P001', partName: 'Bolt', onHand: 0, minStock: 100, status: 'CRITICAL' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('inventory_status'), data);
    expect(res.details.length).toBeGreaterThanOrEqual(2);
    expect(res.details[0].type).toBe('stats');
    expect(res.details[1].type).toBe('table');
  });

  it('generates table section for order_status with pending', () => {
    const data = {
      pending: [
        { orderNumber: 'SO-001', customer: 'ABC', value: 1000, requiredDate: '2026-03-15' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('order_status'), data);
    expect(res.details.some((d) => d.type === 'table')).toBe(true);
  });

  it('limits pending orders table to 5 items', () => {
    const pending = Array.from({ length: 10 }, (_, i) => ({
      orderNumber: `SO-${i}`,
      customer: `C${i}`,
      value: 1000,
    }));
    const res = generateStructuredResponse(makeIntent('order_summary'), { pending });
    const tableSection = res.details.find((d) => d.type === 'table');
    expect(tableSection).toBeDefined();
    expect(Array.isArray(tableSection?.data) && tableSection.data.length).toBe(5);
  });

  it('generates purchase suggestion sections', () => {
    const data = {
      totalValue: 50000,
      suggestions: [
        { partNumber: 'P001', quantity: 100, unit: 'pcs', supplier: 'S1', totalCost: 5000, priority: 'URGENT' },
      ],
    };
    const res = generateStructuredResponse(makeIntent('purchase_suggestion'), data);
    expect(res.details.length).toBe(2);
    expect(res.details[0].type).toBe('stats');
    expect(res.details[1].type).toBe('table');
  });

  it('returns empty details for general intent', () => {
    const res = generateStructuredResponse(makeIntent('general'), {});
    expect(res.details).toHaveLength(0);
  });

  it('returns empty details for production_status', () => {
    const res = generateStructuredResponse(makeIntent('production_status'), {});
    expect(res.details).toHaveLength(0);
  });

  it('limits critical items table to 10 items', () => {
    const alerts = Array.from({ length: 15 }, (_, i) => ({
      partNumber: `P-${i}`,
      partName: `Part ${i}`,
      onHand: 0,
      minStock: 100,
      status: 'CRITICAL',
    }));
    const res = generateStructuredResponse(makeIntent('inventory_shortage'), { alerts });
    const tableSection = res.details.find((d) => d.type === 'table');
    expect(Array.isArray(tableSection?.data) && tableSection.data.length).toBe(10);
  });
});

// =============================================================================
// RELATED QUERIES
// =============================================================================

describe('generateStructuredResponse — relatedQueries', () => {
  const intents: QueryIntent[] = [
    'inventory_status',
    'inventory_shortage',
    'order_status',
    'order_summary',
    'production_status',
    'mrp_calculation',
    'purchase_suggestion',
    'quality_report',
    'supplier_info',
    'analytics',
    'help',
    'general',
  ];

  intents.forEach((intent) => {
    it(`returns 3 related queries for ${intent}`, () => {
      const res = generateStructuredResponse(makeIntent(intent), {});
      expect(res.relatedQueries).toHaveLength(3);
      res.relatedQueries.forEach((q) => expect(typeof q).toBe('string'));
    });
  });
});

// =============================================================================
// CONFIDENCE PASSTHROUGH
// =============================================================================

describe('generateStructuredResponse — confidence', () => {
  it('passes through confidence from intent', () => {
    const res = generateStructuredResponse(makeIntent('general', 0.42), {});
    expect(res.confidence).toBe(0.42);
  });
});

// =============================================================================
// STRUCTURED RESPONSE SHAPE
// =============================================================================

describe('generateStructuredResponse — response shape', () => {
  it('returns all required fields', () => {
    const res = generateStructuredResponse(makeIntent('general'), {});
    expect(res).toHaveProperty('summary');
    expect(res).toHaveProperty('details');
    expect(res).toHaveProperty('actions');
    expect(res).toHaveProperty('alerts');
    expect(res).toHaveProperty('relatedQueries');
    expect(res).toHaveProperty('confidence');
    expect(Array.isArray(res.details)).toBe(true);
    expect(Array.isArray(res.actions)).toBe(true);
    expect(Array.isArray(res.alerts)).toBe(true);
    expect(Array.isArray(res.relatedQueries)).toBe(true);
  });
});

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

describe('default export', () => {
  it('exports generateStructuredResponse via default', async () => {
    const mod = await import('../response-generator');
    expect(mod.default.generateStructuredResponse).toBe(generateStructuredResponse);
  });
});
