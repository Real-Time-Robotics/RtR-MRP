import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted, so we must use vi.hoisted to create mocks that are
// referenced inside the factory functions.
const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      kPIDefinition: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      inventory: {
        aggregate: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      salesOrder: {
        aggregate: vi.fn(),
        count: vi.fn(),
      },
      workOrder: {
        aggregate: vi.fn(),
        count: vi.fn(),
      },
      inspection: {
        aggregate: vi.fn(),
        count: vi.fn(),
      },
      nCR: {
        count: vi.fn(),
      },
      cAPA: {
        count: vi.fn(),
      },
      purchaseOrder: {
        count: vi.fn(),
      },
      supplier: {
        aggregate: vi.fn(),
      },
      costVariance: {
        aggregate: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  },
}));

import { kpiService, SYSTEM_KPIS } from '../kpi-service';
import type { KPIDefinition } from '../types';

// Helper to create a mock KPI definition
function makeDef(overrides: Partial<KPIDefinition> = {}): KPIDefinition {
  return {
    id: 'def-1',
    code: 'TEST_KPI',
    name: 'Test KPI',
    nameVi: 'KPI test',
    category: 'inventory',
    formula: 'test',
    dataSource: 'inventory',
    aggregation: 'SUM',
    unit: 'items',
    format: 'number',
    precision: 0,
    thresholdDirection: 'higher_is_better',
    trendPeriod: 'month',
    isActive: true,
    isSystem: true,
    sortOrder: 1,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// SYSTEM_KPIS constant
// =============================================================================

describe('SYSTEM_KPIS', () => {
  it('should have 18 system KPI definitions', () => {
    expect(SYSTEM_KPIS).toHaveLength(18);
  });

  it('should have unique codes', () => {
    const codes = SYSTEM_KPIS.map(k => k.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('should include inventory KPIs', () => {
    const invKpis = SYSTEM_KPIS.filter(k => k.category === 'inventory');
    expect(invKpis.length).toBe(4);
    expect(invKpis.map(k => k.code)).toEqual(
      expect.arrayContaining(['INV_VALUE', 'INV_TURNOVER', 'INV_LOW_STOCK', 'INV_OUT_STOCK'])
    );
  });

  it('should include sales KPIs', () => {
    const salesKpis = SYSTEM_KPIS.filter(k => k.category === 'sales');
    expect(salesKpis.length).toBe(3);
  });

  it('should include production KPIs', () => {
    const prodKpis = SYSTEM_KPIS.filter(k => k.category === 'production');
    expect(prodKpis.length).toBe(3);
  });

  it('should include quality KPIs', () => {
    const qualKpis = SYSTEM_KPIS.filter(k => k.category === 'quality');
    expect(qualKpis.length).toBe(4);
  });

  it('should include supplier KPIs', () => {
    const suppKpis = SYSTEM_KPIS.filter(k => k.category === 'supplier');
    expect(suppKpis.length).toBe(2);
  });

  it('should include financial KPIs', () => {
    const finKpis = SYSTEM_KPIS.filter(k => k.category === 'financial');
    expect(finKpis.length).toBe(2);
  });

  it('should all have isActive true and isSystem true', () => {
    for (const kpi of SYSTEM_KPIS) {
      expect(kpi.isActive).toBe(true);
      expect(kpi.isSystem).toBe(true);
    }
  });

  it('should have sequential sortOrder values', () => {
    const orders = SYSTEM_KPIS.map(k => k.sortOrder);
    for (let i = 0; i < orders.length; i++) {
      expect(orders[i]).toBe(i + 1);
    }
  });
});

// =============================================================================
// getKPIDefinitions
// =============================================================================

describe('kpiService.getKPIDefinitions', () => {
  it('should return all active definitions when no category given', async () => {
    const defs = [makeDef({ code: 'A' }), makeDef({ code: 'B' })];
    mockPrisma.kPIDefinition.findMany.mockResolvedValue(defs);

    const result = await kpiService.getKPIDefinitions();

    expect(mockPrisma.kPIDefinition.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
    expect(result).toHaveLength(2);
  });

  it('should filter by category when provided', async () => {
    mockPrisma.kPIDefinition.findMany.mockResolvedValue([]);

    await kpiService.getKPIDefinitions('sales');

    expect(mockPrisma.kPIDefinition.findMany).toHaveBeenCalledWith({
      where: { category: 'sales', isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  });

  it('should return empty array when no definitions exist', async () => {
    mockPrisma.kPIDefinition.findMany.mockResolvedValue([]);
    const result = await kpiService.getKPIDefinitions();
    expect(result).toEqual([]);
  });
});

// =============================================================================
// getKPIDefinition
// =============================================================================

describe('kpiService.getKPIDefinition', () => {
  it('should find a definition by code', async () => {
    const def = makeDef({ code: 'INV_VALUE' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);

    const result = await kpiService.getKPIDefinition('INV_VALUE');

    expect(mockPrisma.kPIDefinition.findUnique).toHaveBeenCalledWith({
      where: { code: 'INV_VALUE' },
    });
    expect(result).toEqual(def);
  });

  it('should return null when code not found', async () => {
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(null);

    const result = await kpiService.getKPIDefinition('NONEXISTENT');
    expect(result).toBeNull();
  });
});

// =============================================================================
// seedSystemKPIs
// =============================================================================

describe('kpiService.seedSystemKPIs', () => {
  it('should upsert all system KPIs', async () => {
    mockPrisma.kPIDefinition.upsert.mockResolvedValue({});

    await kpiService.seedSystemKPIs();

    expect(mockPrisma.kPIDefinition.upsert).toHaveBeenCalledTimes(SYSTEM_KPIS.length);
  });

  it('should upsert with correct code for each KPI', async () => {
    mockPrisma.kPIDefinition.upsert.mockResolvedValue({});

    await kpiService.seedSystemKPIs();

    for (let i = 0; i < SYSTEM_KPIS.length; i++) {
      const call = mockPrisma.kPIDefinition.upsert.mock.calls[i][0];
      expect(call.where.code).toBe(SYSTEM_KPIS[i].code);
      expect(call.create.code).toBe(SYSTEM_KPIS[i].code);
    }
  });
});

// =============================================================================
// calculateKPI - INV_VALUE
// =============================================================================

describe('kpiService.calculateKPI', () => {
  it('should throw when KPI definition is not found', async () => {
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(null);

    await expect(kpiService.calculateKPI('NONEXISTENT')).rejects.toThrow(
      'KPI definition not found: NONEXISTENT'
    );
  });

  it('should calculate INV_VALUE correctly', async () => {
    const def = makeDef({
      code: 'INV_VALUE',
      format: 'currency',
      unit: 'VND',
      thresholdDirection: 'lower_is_better',
    });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.inventory.aggregate.mockResolvedValue({ _sum: { quantity: 100 } });
    mockPrisma.inventory.findMany.mockResolvedValue([
      { quantity: 10, part: { unitCost: 1000 } },
      { quantity: 5, part: { unitCost: 2000 } },
    ]);

    const result = await kpiService.calculateKPI('INV_VALUE');

    expect(result.code).toBe('INV_VALUE');
    expect(result.value).toBe(20000); // 10*1000 + 5*2000
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should calculate INV_VALUE as 0 when no inventory', async () => {
    const def = makeDef({ code: 'INV_VALUE', format: 'currency' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.inventory.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
    mockPrisma.inventory.findMany.mockResolvedValue([]);

    const result = await kpiService.calculateKPI('INV_VALUE');
    expect(result.value).toBe(0);
  });

  it('should handle inventory items with missing part cost', async () => {
    const def = makeDef({ code: 'INV_VALUE', format: 'currency' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.inventory.aggregate.mockResolvedValue({ _sum: { quantity: 10 } });
    mockPrisma.inventory.findMany.mockResolvedValue([
      { quantity: 10, part: null },
      { quantity: 5, part: { unitCost: 1000 } },
    ]);

    const result = await kpiService.calculateKPI('INV_VALUE');
    expect(result.value).toBe(5000); // 10*0 + 5*1000
  });
});

// =============================================================================
// calculateKPI - INV_TURNOVER
// =============================================================================

describe('kpiService.calculateKPI - INV_TURNOVER', () => {
  it('should return 0 when inventory value is 0', async () => {
    const def = makeDef({ code: 'INV_TURNOVER', format: 'decimal', precision: 2, unit: 'x' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    // inventory value = 0
    mockPrisma.inventory.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
    mockPrisma.inventory.findMany.mockResolvedValue([]);

    const result = await kpiService.calculateKPI('INV_TURNOVER');
    expect(result.value).toBe(0);
  });

  it('should calculate turnover as COGS / avg inventory value', async () => {
    const def = makeDef({ code: 'INV_TURNOVER', format: 'decimal', precision: 2, unit: 'x' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    // inventory value = 100000
    mockPrisma.inventory.aggregate.mockResolvedValue({ _sum: { quantity: 100 } });
    mockPrisma.inventory.findMany.mockResolvedValue([
      { quantity: 100, part: { unitCost: 1000 } },
    ]);
    // sales = 200000 => COGS = 200000 * 0.7 = 140000
    mockPrisma.salesOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 200000 } });

    const result = await kpiService.calculateKPI('INV_TURNOVER');
    expect(result.value).toBe(1.4); // 140000 / 100000
  });
});

// =============================================================================
// calculateKPI - INV_LOW_STOCK
// =============================================================================

describe('kpiService.calculateKPI - INV_LOW_STOCK', () => {
  it('should return count of low stock items', async () => {
    const def = makeDef({ code: 'INV_LOW_STOCK', warningThreshold: 10, criticalThreshold: 20, thresholdDirection: 'lower_is_better' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.inventory.count.mockResolvedValue(7);

    const result = await kpiService.calculateKPI('INV_LOW_STOCK');
    expect(result.value).toBe(7);
    expect(mockPrisma.inventory.count).toHaveBeenCalledWith({
      where: { quantity: { gt: 0, lte: 10 } },
    });
  });
});

// =============================================================================
// calculateKPI - INV_OUT_STOCK
// =============================================================================

describe('kpiService.calculateKPI - INV_OUT_STOCK', () => {
  it('should return count of out-of-stock items', async () => {
    const def = makeDef({ code: 'INV_OUT_STOCK', warningThreshold: 5, criticalThreshold: 10, thresholdDirection: 'lower_is_better' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.inventory.count.mockResolvedValue(3);

    const result = await kpiService.calculateKPI('INV_OUT_STOCK');
    expect(result.value).toBe(3);
    expect(mockPrisma.inventory.count).toHaveBeenCalledWith({
      where: { quantity: { lte: 0 } },
    });
  });
});

// =============================================================================
// calculateKPI - REVENUE_MTD
// =============================================================================

describe('kpiService.calculateKPI - REVENUE_MTD', () => {
  it('should aggregate sales order totals', async () => {
    const def = makeDef({ code: 'REVENUE_MTD', format: 'currency', unit: 'VND', category: 'sales' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 500000 } });

    const result = await kpiService.calculateKPI('REVENUE_MTD');
    expect(result.value).toBe(500000);
  });

  it('should return 0 when no sales orders', async () => {
    const def = makeDef({ code: 'REVENUE_MTD', format: 'currency' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });

    const result = await kpiService.calculateKPI('REVENUE_MTD');
    expect(result.value).toBe(0);
  });
});

// =============================================================================
// calculateKPI - ORDER_COUNT
// =============================================================================

describe('kpiService.calculateKPI - ORDER_COUNT', () => {
  it('should return order count', async () => {
    const def = makeDef({ code: 'ORDER_COUNT', category: 'sales' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.count.mockResolvedValue(42);

    const result = await kpiService.calculateKPI('ORDER_COUNT');
    expect(result.value).toBe(42);
  });
});

// =============================================================================
// calculateKPI - AVG_ORDER_VALUE
// =============================================================================

describe('kpiService.calculateKPI - AVG_ORDER_VALUE', () => {
  it('should return average order value', async () => {
    const def = makeDef({ code: 'AVG_ORDER_VALUE', format: 'currency', category: 'sales' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.aggregate.mockResolvedValue({ _avg: { totalAmount: 125000 } });

    const result = await kpiService.calculateKPI('AVG_ORDER_VALUE');
    expect(result.value).toBe(125000);
  });

  it('should return 0 when no orders', async () => {
    const def = makeDef({ code: 'AVG_ORDER_VALUE', format: 'currency' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.aggregate.mockResolvedValue({ _avg: { totalAmount: null } });

    const result = await kpiService.calculateKPI('AVG_ORDER_VALUE');
    expect(result.value).toBe(0);
  });
});

// =============================================================================
// calculateKPI - ON_TIME_DELIVERY
// =============================================================================

describe('kpiService.calculateKPI - ON_TIME_DELIVERY', () => {
  it('should return 100 when no orders delivered', async () => {
    const def = makeDef({ code: 'ON_TIME_DELIVERY', format: 'percent', category: 'production' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.count.mockResolvedValue(0);

    const result = await kpiService.calculateKPI('ON_TIME_DELIVERY');
    expect(result.value).toBe(100);
  });

  it('should calculate on-time delivery percentage', async () => {
    const def = makeDef({ code: 'ON_TIME_DELIVERY', format: 'percent', category: 'production' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    // total = 10, onTime = 10 => (10/10)*100 = 100
    mockPrisma.salesOrder.count.mockResolvedValueOnce(10).mockResolvedValueOnce(10);

    const result = await kpiService.calculateKPI('ON_TIME_DELIVERY');
    expect(result.value).toBe(100);
  });
});

// =============================================================================
// calculateKPI - PRODUCTION_EFFICIENCY
// =============================================================================

describe('kpiService.calculateKPI - PRODUCTION_EFFICIENCY', () => {
  it('should return 100 when no planned quantity', async () => {
    const def = makeDef({ code: 'PRODUCTION_EFFICIENCY', format: 'percent', category: 'production' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.workOrder.aggregate.mockResolvedValue({
      _sum: { quantity: 0, completedQty: 0 },
    });

    const result = await kpiService.calculateKPI('PRODUCTION_EFFICIENCY');
    expect(result.value).toBe(100);
  });

  it('should calculate efficiency ratio', async () => {
    const def = makeDef({ code: 'PRODUCTION_EFFICIENCY', format: 'percent', category: 'production' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.workOrder.aggregate.mockResolvedValue({
      _sum: { quantity: 100, completedQty: 85 },
    });

    const result = await kpiService.calculateKPI('PRODUCTION_EFFICIENCY');
    expect(result.value).toBe(85);
  });
});

// =============================================================================
// calculateKPI - ACTIVE_WORK_ORDERS
// =============================================================================

describe('kpiService.calculateKPI - ACTIVE_WORK_ORDERS', () => {
  it('should return count of active work orders', async () => {
    const def = makeDef({ code: 'ACTIVE_WORK_ORDERS', category: 'production' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.workOrder.count.mockResolvedValue(5);

    const result = await kpiService.calculateKPI('ACTIVE_WORK_ORDERS');
    expect(result.value).toBe(5);
    expect(mockPrisma.workOrder.count).toHaveBeenCalledWith({
      where: { status: { in: ['IN_PROGRESS', 'RELEASED'] } },
    });
  });
});

// =============================================================================
// calculateKPI - FIRST_PASS_YIELD
// =============================================================================

describe('kpiService.calculateKPI - FIRST_PASS_YIELD', () => {
  it('should return 100 when no inspections', async () => {
    const def = makeDef({ code: 'FIRST_PASS_YIELD', format: 'percent', category: 'quality' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.inspection.count.mockResolvedValue(0);

    const result = await kpiService.calculateKPI('FIRST_PASS_YIELD');
    expect(result.value).toBe(100);
  });

  it('should calculate pass rate', async () => {
    const def = makeDef({ code: 'FIRST_PASS_YIELD', format: 'percent', category: 'quality' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.inspection.count.mockResolvedValueOnce(20).mockResolvedValueOnce(18);

    const result = await kpiService.calculateKPI('FIRST_PASS_YIELD');
    expect(result.value).toBe(90); // 18/20 * 100
  });
});

// =============================================================================
// calculateKPI - DEFECT_RATE
// =============================================================================

describe('kpiService.calculateKPI - DEFECT_RATE', () => {
  it('should return 0 when no inspections', async () => {
    const def = makeDef({ code: 'DEFECT_RATE', format: 'percent', category: 'quality' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.inspection.aggregate
      .mockResolvedValueOnce({ _sum: { quantityInspected: 0 } })
      .mockResolvedValueOnce({ _sum: { quantityRejected: 0 } });

    const result = await kpiService.calculateKPI('DEFECT_RATE');
    expect(result.value).toBe(0);
  });

  it('should calculate defect rate', async () => {
    const def = makeDef({ code: 'DEFECT_RATE', format: 'percent', category: 'quality' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.inspection.aggregate
      .mockResolvedValueOnce({ _sum: { quantityInspected: 1000 } })
      .mockResolvedValueOnce({ _sum: { quantityRejected: 50 } });

    const result = await kpiService.calculateKPI('DEFECT_RATE');
    expect(result.value).toBe(5); // 50/1000 * 100
  });
});

// =============================================================================
// calculateKPI - OPEN_NCRS
// =============================================================================

describe('kpiService.calculateKPI - OPEN_NCRS', () => {
  it('should return count of open NCRs', async () => {
    const def = makeDef({ code: 'OPEN_NCRS', category: 'quality' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.nCR.count.mockResolvedValue(8);

    const result = await kpiService.calculateKPI('OPEN_NCRS');
    expect(result.value).toBe(8);
    expect(mockPrisma.nCR.count).toHaveBeenCalledWith({
      where: { status: { notIn: ['closed', 'voided'] } },
    });
  });
});

// =============================================================================
// calculateKPI - OPEN_CAPAS
// =============================================================================

describe('kpiService.calculateKPI - OPEN_CAPAS', () => {
  it('should return count of open CAPAs', async () => {
    const def = makeDef({ code: 'OPEN_CAPAS', category: 'quality' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.cAPA.count.mockResolvedValue(3);

    const result = await kpiService.calculateKPI('OPEN_CAPAS');
    expect(result.value).toBe(3);
    expect(mockPrisma.cAPA.count).toHaveBeenCalledWith({
      where: { status: { notIn: ['closed', 'cancelled'] } },
    });
  });
});

// =============================================================================
// calculateKPI - SUPPLIER_OTD
// =============================================================================

describe('kpiService.calculateKPI - SUPPLIER_OTD', () => {
  it('should return 100 when no POs', async () => {
    const def = makeDef({ code: 'SUPPLIER_OTD', format: 'percent', category: 'supplier' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.purchaseOrder.count.mockResolvedValue(0);

    const result = await kpiService.calculateKPI('SUPPLIER_OTD');
    expect(result.value).toBe(100);
  });

  it('should return 92 placeholder when POs exist', async () => {
    const def = makeDef({ code: 'SUPPLIER_OTD', format: 'percent', category: 'supplier' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.purchaseOrder.count.mockResolvedValue(10);

    const result = await kpiService.calculateKPI('SUPPLIER_OTD');
    expect(result.value).toBe(92);
  });
});

// =============================================================================
// calculateKPI - AVG_LEAD_TIME
// =============================================================================

describe('kpiService.calculateKPI - AVG_LEAD_TIME', () => {
  it('should return average lead time', async () => {
    const def = makeDef({ code: 'AVG_LEAD_TIME', format: 'number', category: 'supplier' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.supplier.aggregate.mockResolvedValue({ _avg: { leadTimeDays: 14.5 } });

    const result = await kpiService.calculateKPI('AVG_LEAD_TIME');
    expect(result.value).toBe(14.5);
  });

  it('should return 0 when no suppliers', async () => {
    const def = makeDef({ code: 'AVG_LEAD_TIME', format: 'number', category: 'supplier' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.supplier.aggregate.mockResolvedValue({ _avg: { leadTimeDays: null } });

    const result = await kpiService.calculateKPI('AVG_LEAD_TIME');
    expect(result.value).toBe(0);
  });
});

// =============================================================================
// calculateKPI - GROSS_MARGIN
// =============================================================================

describe('kpiService.calculateKPI - GROSS_MARGIN', () => {
  it('should return 0 when no revenue', async () => {
    const def = makeDef({ code: 'GROSS_MARGIN', format: 'percent', category: 'financial' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });

    const result = await kpiService.calculateKPI('GROSS_MARGIN');
    expect(result.value).toBe(0);
  });

  it('should calculate 30% margin (hardcoded 70% COGS)', async () => {
    const def = makeDef({ code: 'GROSS_MARGIN', format: 'percent', category: 'financial' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 1000000 } });

    const result = await kpiService.calculateKPI('GROSS_MARGIN');
    // (1000000 - 700000) / 1000000 * 100 = 30
    expect(result.value).toBeCloseTo(30, 5);
  });
});

// =============================================================================
// calculateKPI - COST_VARIANCE
// =============================================================================

describe('kpiService.calculateKPI - COST_VARIANCE', () => {
  it('should return absolute variance percentage', async () => {
    const def = makeDef({ code: 'COST_VARIANCE', format: 'percent', category: 'financial' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.costVariance.aggregate.mockResolvedValue({ _avg: { variancePercent: -3.5 } });

    const result = await kpiService.calculateKPI('COST_VARIANCE');
    expect(result.value).toBe(3.5);
  });

  it('should return 0 when no variance data', async () => {
    const def = makeDef({ code: 'COST_VARIANCE', format: 'percent', category: 'financial' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.costVariance.aggregate.mockResolvedValue({ _avg: { variancePercent: null } });

    const result = await kpiService.calculateKPI('COST_VARIANCE');
    expect(result.value).toBe(0);
  });
});

// =============================================================================
// calculateKPI - unknown code
// =============================================================================

describe('kpiService.calculateKPI - unknown KPI code', () => {
  it('should return 0 for unknown code', async () => {
    const def = makeDef({ code: 'UNKNOWN_KPI' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);

    const result = await kpiService.calculateKPI('UNKNOWN_KPI');
    expect(result.value).toBe(0);
  });
});

// =============================================================================
// determineKPIStatus (tested via calculateKPI)
// =============================================================================

describe('KPI status determination', () => {
  it('should return normal when no thresholds defined', async () => {
    const def = makeDef({
      code: 'INV_OUT_STOCK',
      warningThreshold: undefined,
      criticalThreshold: undefined,
    });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.inventory.count.mockResolvedValue(50);

    const result = await kpiService.calculateKPI('INV_OUT_STOCK');
    expect(result.status).toBe('normal');
  });

  it('should return critical for higher_is_better when value < criticalThreshold', async () => {
    const def = makeDef({
      code: 'ORDER_COUNT',
      thresholdDirection: 'higher_is_better',
      warningThreshold: 50,
      criticalThreshold: 20,
    });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.count.mockResolvedValue(10);

    const result = await kpiService.calculateKPI('ORDER_COUNT');
    expect(result.status).toBe('critical');
  });

  it('should return warning for higher_is_better when value < warningThreshold', async () => {
    const def = makeDef({
      code: 'ORDER_COUNT',
      thresholdDirection: 'higher_is_better',
      warningThreshold: 50,
      criticalThreshold: 20,
    });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.count.mockResolvedValue(30);

    const result = await kpiService.calculateKPI('ORDER_COUNT');
    expect(result.status).toBe('warning');
  });

  it('should return normal for higher_is_better when value >= warningThreshold', async () => {
    const def = makeDef({
      code: 'ORDER_COUNT',
      thresholdDirection: 'higher_is_better',
      warningThreshold: 50,
      criticalThreshold: 20,
    });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.count.mockResolvedValue(60);

    const result = await kpiService.calculateKPI('ORDER_COUNT');
    expect(result.status).toBe('normal');
  });

  it('should return critical for lower_is_better when value > criticalThreshold', async () => {
    const def = makeDef({
      code: 'INV_LOW_STOCK',
      thresholdDirection: 'lower_is_better',
      warningThreshold: 10,
      criticalThreshold: 20,
    });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.inventory.count.mockResolvedValue(25);

    const result = await kpiService.calculateKPI('INV_LOW_STOCK');
    expect(result.status).toBe('critical');
  });

  it('should return warning for lower_is_better when value > warningThreshold', async () => {
    const def = makeDef({
      code: 'INV_LOW_STOCK',
      thresholdDirection: 'lower_is_better',
      warningThreshold: 10,
      criticalThreshold: 20,
    });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.inventory.count.mockResolvedValue(15);

    const result = await kpiService.calculateKPI('INV_LOW_STOCK');
    expect(result.status).toBe('warning');
  });

  it('should return normal for lower_is_better when value <= warningThreshold', async () => {
    const def = makeDef({
      code: 'INV_LOW_STOCK',
      thresholdDirection: 'lower_is_better',
      warningThreshold: 10,
      criticalThreshold: 20,
    });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.inventory.count.mockResolvedValue(5);

    const result = await kpiService.calculateKPI('INV_LOW_STOCK');
    expect(result.status).toBe('normal');
  });
});

// =============================================================================
// formatKPIValue (tested via calculateKPI)
// =============================================================================

describe('KPI value formatting', () => {
  it('should format currency values', async () => {
    const def = makeDef({ code: 'REVENUE_MTD', format: 'currency', unit: 'VND', precision: 0 });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 1500000 } });

    const result = await kpiService.calculateKPI('REVENUE_MTD');
    // Intl currency formatting for vi-VN VND
    expect(result.formattedValue).toContain('1.500.000');
  });

  it('should format percent values', async () => {
    const def = makeDef({ code: 'FIRST_PASS_YIELD', format: 'percent', precision: 1 });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.inspection.count.mockResolvedValueOnce(100).mockResolvedValueOnce(95);

    const result = await kpiService.calculateKPI('FIRST_PASS_YIELD');
    expect(result.formattedValue).toBe('95.0%');
  });

  it('should format decimal values with unit', async () => {
    const def = makeDef({ code: 'INV_TURNOVER', format: 'decimal', precision: 2, unit: 'x' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.inventory.aggregate.mockResolvedValue({ _sum: { quantity: 100 } });
    mockPrisma.inventory.findMany.mockResolvedValue([{ quantity: 100, part: { unitCost: 1000 } }]);
    mockPrisma.salesOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 200000 } });

    const result = await kpiService.calculateKPI('INV_TURNOVER');
    expect(result.formattedValue).toBe('1.40 x');
  });

  it('should format number values with unit', async () => {
    const def = makeDef({ code: 'ORDER_COUNT', format: 'number', precision: 0, unit: 'orders' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.count.mockResolvedValue(42);

    const result = await kpiService.calculateKPI('ORDER_COUNT');
    expect(result.formattedValue).toBe('42 orders');
  });
});

// =============================================================================
// calculateKPI - target and targetPercent
// =============================================================================

describe('KPI target tracking', () => {
  it('should include target and targetPercent when targetValue is set', async () => {
    const def = makeDef({
      code: 'ORDER_COUNT',
      targetValue: 100,
    });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.count.mockResolvedValue(75);

    const result = await kpiService.calculateKPI('ORDER_COUNT');
    expect(result.target).toBe(100);
    expect(result.targetPercent).toBe(75);
  });

  it('should have undefined targetPercent when no targetValue', async () => {
    const def = makeDef({
      code: 'ORDER_COUNT',
      targetValue: undefined,
    });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.count.mockResolvedValue(50);

    const result = await kpiService.calculateKPI('ORDER_COUNT');
    expect(result.target).toBeUndefined();
    expect(result.targetPercent).toBeUndefined();
  });
});

// =============================================================================
// calculateKPIs
// =============================================================================

describe('kpiService.calculateKPIs', () => {
  it('should calculate multiple KPIs in parallel', async () => {
    const def1 = makeDef({ code: 'INV_OUT_STOCK' });
    const def2 = makeDef({ code: 'OPEN_NCRS', category: 'quality' });

    mockPrisma.kPIDefinition.findUnique
      .mockResolvedValueOnce(def1)
      .mockResolvedValueOnce(def2);
    mockPrisma.inventory.count.mockResolvedValue(2);
    mockPrisma.nCR.count.mockResolvedValue(5);

    const results = await kpiService.calculateKPIs(['INV_OUT_STOCK', 'OPEN_NCRS']);
    expect(results).toHaveLength(2);
    expect(results[0].code).toBe('INV_OUT_STOCK');
    expect(results[1].code).toBe('OPEN_NCRS');
  });
});

// =============================================================================
// getKPIWithTrend
// =============================================================================

describe('kpiService.getKPIWithTrend', () => {
  it('should call calculateKPI with trend params', async () => {
    const def = makeDef({ code: 'ORDER_COUNT', trendPeriod: 'month' });
    // Called once for the main calculation, then 6 times for trend periods
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.count.mockResolvedValue(10);

    const result = await kpiService.getKPIWithTrend('ORDER_COUNT', 6);
    expect(result.trend).toBeDefined();
    expect(result.trend!.data).toHaveLength(6);
    expect(result.trend!.direction).toBeDefined();
  });
});

// =============================================================================
// getAllKPIsByCategory
// =============================================================================

describe('kpiService.getAllKPIsByCategory', () => {
  it('should get definitions by category then calculate all', async () => {
    const defs = [makeDef({ code: 'ORDER_COUNT' }), makeDef({ code: 'REVENUE_MTD' })];
    mockPrisma.kPIDefinition.findMany.mockResolvedValue(defs);
    // For each calculate call
    mockPrisma.kPIDefinition.findUnique
      .mockResolvedValueOnce(makeDef({ code: 'ORDER_COUNT' }))
      .mockResolvedValueOnce(makeDef({ code: 'REVENUE_MTD', format: 'currency' }));
    mockPrisma.salesOrder.count.mockResolvedValue(10);
    mockPrisma.salesOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 500000 } });

    const results = await kpiService.getAllKPIsByCategory('sales');
    expect(results).toHaveLength(2);
  });
});

// =============================================================================
// getDateRange (tested via calculateKPI with params)
// =============================================================================

describe('KPI date range handling', () => {
  it('should use custom date range when provided', async () => {
    const def = makeDef({ code: 'ORDER_COUNT' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.count.mockResolvedValue(5);

    const dateFrom = new Date('2025-01-01');
    const dateTo = new Date('2025-01-31');

    await kpiService.calculateKPI('ORDER_COUNT', { dateFrom, dateTo });

    expect(mockPrisma.salesOrder.count).toHaveBeenCalledWith({
      where: {
        orderDate: { gte: dateFrom, lte: dateTo },
      },
    });
  });

  it('should use period-based date range for day period', async () => {
    const def = makeDef({ code: 'ORDER_COUNT' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.salesOrder.count.mockResolvedValue(5);

    await kpiService.calculateKPI('ORDER_COUNT', { period: 'day' });

    const call = mockPrisma.salesOrder.count.mock.calls[0][0];
    const dayMs = 24 * 60 * 60 * 1000;
    const diff = call.where.orderDate.lte.getTime() - call.where.orderDate.gte.getTime();
    // Should be approximately 1 day
    expect(diff).toBeGreaterThan(dayMs * 0.9);
    expect(diff).toBeLessThan(dayMs * 1.1);
  });
});

// =============================================================================
// calculateTrend (tested via getKPIWithTrend)
// =============================================================================

describe('KPI trend calculation', () => {
  it('should return stable trend when values are equal', async () => {
    const def = makeDef({ code: 'ACTIVE_WORK_ORDERS', trendPeriod: 'day' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    mockPrisma.workOrder.count.mockResolvedValue(5);

    const result = await kpiService.getKPIWithTrend('ACTIVE_WORK_ORDERS', 3);
    expect(result.trend!.direction).toBe('stable');
    expect(result.trend!.changePercent).toBe(0);
  });

  it('should include changePercent and previousValue when trend has data', async () => {
    const def = makeDef({ code: 'ORDER_COUNT', trendPeriod: 'month' });
    mockPrisma.kPIDefinition.findUnique.mockResolvedValue(def);
    // Return increasing values for trend
    let callCount = 0;
    mockPrisma.salesOrder.count.mockImplementation(() => {
      callCount++;
      // First call is for the main value, rest for trend
      return Promise.resolve(callCount * 10);
    });

    const result = await kpiService.getKPIWithTrend('ORDER_COUNT', 3);
    expect(result.trend).toBeDefined();
    expect(result.trend!.data).toHaveLength(3);
  });
});
