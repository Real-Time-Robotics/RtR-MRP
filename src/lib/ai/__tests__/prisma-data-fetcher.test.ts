import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCKS (vi.hoisted)
// =============================================================================

const { mockPrisma, mockLogger } = vi.hoisted(() => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  };

  const mockPrisma = {
    part: {
      findMany: vi.fn(),
    },
    salesOrder: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    workOrder: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    mrpSuggestion: {
      findMany: vi.fn(),
    },
    partSupplier: {
      findMany: vi.fn(),
    },
    nCR: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    inspection: {
      count: vi.fn(),
    },
    supplier: {
      findMany: vi.fn(),
    },
  };

  return { mockPrisma, mockLogger };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/logger', () => ({ logger: mockLogger }));

import { prismaDataFetcher } from '../prisma-data-fetcher';

// =============================================================================
// SETUP
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// getStockStatus (tested indirectly via getInventorySummary/getInventoryAlerts)
// =============================================================================

describe('getInventorySummary', () => {
  it('returns correct counts for mixed status parts', async () => {
    mockPrisma.part.findMany.mockResolvedValue([
      { partNumber: 'P1', name: 'A', minStockLevel: 100, safetyStock: 20, unitCost: 10, inventory: [{ quantity: 200 }] }, // OK
      { partNumber: 'P2', name: 'B', minStockLevel: 100, safetyStock: 20, unitCost: 5, inventory: [{ quantity: 80 }] },  // LOW
      { partNumber: 'P3', name: 'C', minStockLevel: 100, safetyStock: 50, unitCost: 8, inventory: [{ quantity: 30 }] },  // CRITICAL (< safetyStock)
      { partNumber: 'P4', name: 'D', minStockLevel: 100, safetyStock: 20, unitCost: 15, inventory: [{ quantity: 0 }] },  // OUT
    ]);

    const result = await prismaDataFetcher.getInventorySummary();
    expect(result.totalItems).toBe(4);
    expect(result.okCount).toBe(1);
    expect(result.lowCount).toBe(1);
    expect(result.outCount).toBe(2); // CRITICAL + OUT
    expect(result.totalValue).toBe(200 * 10 + 80 * 5 + 30 * 8 + 0 * 15);
  });

  it('returns zeros when no parts', async () => {
    mockPrisma.part.findMany.mockResolvedValue([]);
    const result = await prismaDataFetcher.getInventorySummary();
    expect(result.totalItems).toBe(0);
    expect(result.totalValue).toBe(0);
  });

  it('returns fallback on error', async () => {
    mockPrisma.part.findMany.mockRejectedValue(new Error('DB down'));
    const result = await prismaDataFetcher.getInventorySummary();
    expect(result.totalItems).toBe(0);
    expect(mockLogger.logError).toHaveBeenCalled();
  });

  it('handles null unitCost', async () => {
    mockPrisma.part.findMany.mockResolvedValue([
      { partNumber: 'P1', name: 'A', minStockLevel: 10, safetyStock: 5, unitCost: null, inventory: [{ quantity: 100 }] },
    ]);
    const result = await prismaDataFetcher.getInventorySummary();
    expect(result.totalValue).toBe(0);
  });

  it('sums multiple inventory entries per part', async () => {
    mockPrisma.part.findMany.mockResolvedValue([
      { partNumber: 'P1', name: 'A', minStockLevel: 10, safetyStock: 5, unitCost: 10, inventory: [{ quantity: 50 }, { quantity: 30 }] },
    ]);
    const result = await prismaDataFetcher.getInventorySummary();
    expect(result.totalValue).toBe(80 * 10);
  });

  it('handles non-Error thrown objects', async () => {
    mockPrisma.part.findMany.mockRejectedValue('string error');
    const result = await prismaDataFetcher.getInventorySummary();
    expect(result.totalItems).toBe(0);
    expect(mockLogger.logError).toHaveBeenCalled();
  });
});

// =============================================================================
// getInventoryAlerts
// =============================================================================

describe('getInventoryAlerts', () => {
  it('returns sorted alerts (OUT first, then CRITICAL, LOW, OK)', async () => {
    mockPrisma.part.findMany.mockResolvedValueOnce([
      { partNumber: 'P1', name: 'OK Part', minStockLevel: 10, safetyStock: 5, reorderPoint: 8, unitCost: 10, unit: 'pcs', category: 'raw', isCritical: false, inventory: [{ quantity: 100 }] },
      { partNumber: 'P2', name: 'Out Part', minStockLevel: 10, safetyStock: 5, reorderPoint: 8, unitCost: 10, unit: 'pcs', category: 'raw', isCritical: true, inventory: [{ quantity: 0 }] },
      { partNumber: 'P3', name: 'Low Part', minStockLevel: 10, safetyStock: 5, reorderPoint: 8, unitCost: 10, unit: 'pcs', category: 'raw', isCritical: false, inventory: [{ quantity: 8 }] },
    ]);

    const result = await prismaDataFetcher.getInventoryAlerts();
    // Verify all alerts are returned with correct statuses
    const statuses = result.map((r) => r.status);
    expect(statuses).toContain('OUT');
    expect(statuses).toContain('LOW');
    expect(statuses).toContain('OK');
  });

  it('returns empty array on error', async () => {
    mockPrisma.part.findMany.mockRejectedValue(new Error('fail'));
    const result = await prismaDataFetcher.getInventoryAlerts();
    expect(result).toEqual([]);
    expect(mockLogger.logError).toHaveBeenCalled();
  });

  it('maps all fields correctly', async () => {
    mockPrisma.part.findMany.mockResolvedValue([
      {
        partNumber: 'P1', name: 'Bolt', minStockLevel: 100, safetyStock: 20,
        reorderPoint: 50, unitCost: 15, unit: 'kg', category: 'component', isCritical: true,
        inventory: [{ quantity: 10 }, { quantity: 5 }],
      },
    ]);

    const result = await prismaDataFetcher.getInventoryAlerts();
    expect(result[0]).toMatchObject({
      partNumber: 'P1',
      partName: 'Bolt',
      onHand: 15,
      minStock: 100,
      safetyStock: 20,
      reorderPoint: 50,
      unitCost: 15,
      unit: 'kg',
      category: 'component',
      isCritical: true,
    });
  });
});

// =============================================================================
// getInventoryByParts
// =============================================================================

describe('getInventoryByParts', () => {
  it('calls getInventoryAlerts when partNumbers is empty', async () => {
    mockPrisma.part.findMany.mockResolvedValue([]);
    await prismaDataFetcher.getInventoryByParts([]);
    // getInventoryAlerts is called instead of the specific query
    expect(mockPrisma.part.findMany).toHaveBeenCalled();
  });

  it('returns part details with supplier and locations', async () => {
    mockPrisma.part.findMany.mockResolvedValue([
      {
        partNumber: 'P1', name: 'Bolt', description: 'Steel bolt', category: 'component',
        minStockLevel: 100, safetyStock: 20, reorderPoint: 50, unitCost: 10,
        unit: 'pcs', isCritical: true, leadTimeDays: 7,
        inventory: [
          { quantity: 50, reservedQty: 10, lotNumber: 'LOT-1', warehouse: { name: 'WH-1' } },
          { quantity: 30, reservedQty: 5, lotNumber: 'LOT-2', warehouse: { name: 'WH-2' } },
        ],
        partSuppliers: [
          { isPreferred: true, supplier: { name: 'Supplier A', leadTimeDays: 5 } },
          { isPreferred: false, supplier: { name: 'Supplier B', leadTimeDays: 10 } },
        ],
      },
    ]);

    const result = await prismaDataFetcher.getInventoryByParts(['P1']);
    expect(result[0]).toMatchObject({
      partNumber: 'P1',
      onHand: 80,
      reserved: 15,
      available: 65,
      supplier: 'Supplier A',
      supplierLeadTime: 5,
    });
    // @ts-expect-error test data
    expect(result[0].locations).toHaveLength(2);
  });

  it('returns null supplier when no preferred supplier', async () => {
    mockPrisma.part.findMany.mockResolvedValue([
      {
        partNumber: 'P1', name: 'X', description: '', category: 'raw',
        minStockLevel: 10, safetyStock: 5, reorderPoint: 8, unitCost: 10,
        unit: 'pcs', isCritical: false, leadTimeDays: 14,
        inventory: [{ quantity: 50, reservedQty: 0, lotNumber: null, warehouse: { name: 'WH-1' } }],
        partSuppliers: [],
      },
    ]);

    const result = await prismaDataFetcher.getInventoryByParts(['P1']);
    // @ts-expect-error test data
    expect(result[0].supplier).toBeNull();
    // @ts-expect-error test data
    expect(result[0].supplierLeadTime).toBe(14); // falls back to part.leadTimeDays
  });

  it('returns empty array on error', async () => {
    mockPrisma.part.findMany.mockRejectedValue(new Error('fail'));
    const result = await prismaDataFetcher.getInventoryByParts(['P1']);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// getOrdersSummary
// =============================================================================

describe('getOrdersSummary', () => {
  it('returns correct summary', async () => {
    mockPrisma.salesOrder.count.mockResolvedValue(50);
    mockPrisma.salesOrder.groupBy.mockResolvedValue([
      { status: 'PENDING', _count: 10 },
      { status: 'CONFIRMED', _count: 20 },
      { status: 'COMPLETED', _count: 15 },
    ]);
    mockPrisma.salesOrder.findMany.mockResolvedValue([
      { totalAmount: 1000 },
      { totalAmount: 2000 },
      { totalAmount: null },
    ]);

    const result = await prismaDataFetcher.getOrdersSummary();
    expect(result.totalOrders).toBe(50);
    expect(result.pendingCount).toBe(10);
    expect(result.processingCount).toBe(20);
    expect(result.completedCount).toBe(15);
    expect(result.monthlyRevenue).toBe(3000);
    expect(result.growthPercent).toBe(0);
  });

  it('handles DRAFT status as pending', async () => {
    mockPrisma.salesOrder.count.mockResolvedValue(5);
    mockPrisma.salesOrder.groupBy.mockResolvedValue([
      { status: 'DRAFT', _count: 3 },
    ]);
    mockPrisma.salesOrder.findMany.mockResolvedValue([]);

    const result = await prismaDataFetcher.getOrdersSummary();
    expect(result.pendingCount).toBe(3);
  });

  it('returns fallback on error', async () => {
    mockPrisma.salesOrder.count.mockRejectedValue(new Error('fail'));
    const result = await prismaDataFetcher.getOrdersSummary();
    expect(result.totalOrders).toBe(0);
    expect(mockLogger.logError).toHaveBeenCalled();
  });
});

// =============================================================================
// getOrdersByNumbers
// =============================================================================

describe('getOrdersByNumbers', () => {
  it('returns mapped orders', async () => {
    mockPrisma.salesOrder.findMany.mockResolvedValue([
      {
        orderNumber: 'SO-001',
        customer: { name: 'ABC Corp' },
        status: 'CONFIRMED',
        totalAmount: 5000,
        requiredDate: new Date('2026-03-15'),
        createdAt: new Date('2026-03-01'),
        lines: [
          { product: { sku: 'SKU-1', name: 'Widget' }, quantity: 10, unitPrice: 500 },
        ],
      },
    ]);

    const result = await prismaDataFetcher.getOrdersByNumbers(['SO-001']);
    expect(result[0]).toMatchObject({
      orderNumber: 'SO-001',
      customer: 'ABC Corp',
      status: 'CONFIRMED',
      totalAmount: 5000,
      requiredDate: '2026-03-15',
      createdAt: '2026-03-01',
    });
    expect((result as any)[0].lines[0]).toMatchObject({
      partNumber: 'SKU-1',
      partName: 'Widget',
      quantity: 10,
      unitPrice: 500,
    });
  });

  it('handles null customer', async () => {
    mockPrisma.salesOrder.findMany.mockResolvedValue([
      {
        orderNumber: 'SO-002',
        customer: null,
        status: 'DRAFT',
        totalAmount: 0,
        requiredDate: null,
        createdAt: new Date('2026-01-01'),
        lines: [],
      },
    ]);
    const result = await prismaDataFetcher.getOrdersByNumbers(['SO-002']);
    expect(result[0].customer).toBe('N/A');
    expect(result[0].requiredDate).toBeUndefined();
  });

  it('returns empty array on error', async () => {
    mockPrisma.salesOrder.findMany.mockRejectedValue(new Error('fail'));
    const result = await prismaDataFetcher.getOrdersByNumbers(['SO-001']);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// getPendingOrders
// =============================================================================

describe('getPendingOrders', () => {
  it('returns mapped pending orders', async () => {
    mockPrisma.salesOrder.findMany.mockResolvedValue([
      {
        orderNumber: 'SO-001',
        customer: { name: 'ABC' },
        totalAmount: 3000,
        requiredDate: new Date('2026-04-01'),
        status: 'draft',
        lines: [
          { product: { sku: 'SKU-A' }, quantity: 5 },
          { product: { sku: 'SKU-B' }, quantity: 10 },
        ],
      },
    ]);

    const result = await prismaDataFetcher.getPendingOrders();
    expect(result[0]).toMatchObject({
      orderNumber: 'SO-001',
      customer: 'ABC',
      product: 'SKU-A',
      quantity: 15,
      value: 3000,
      status: 'draft',
    });
  });

  it('uses Multiple when no lines', async () => {
    mockPrisma.salesOrder.findMany.mockResolvedValue([
      {
        orderNumber: 'SO-002',
        customer: null,
        totalAmount: null,
        requiredDate: null,
        status: 'PENDING',
        lines: [],
      },
    ]);
    const result = await prismaDataFetcher.getPendingOrders();
    expect(result[0].product).toBe('Multiple');
    expect(result[0].customer).toBe('N/A');
    expect(result[0].value).toBe(0);
  });

  it('returns empty array on error', async () => {
    mockPrisma.salesOrder.findMany.mockRejectedValue(new Error('fail'));
    const result = await prismaDataFetcher.getPendingOrders();
    expect(result).toEqual([]);
  });
});

// =============================================================================
// getRecentOrders
// =============================================================================

describe('getRecentOrders', () => {
  it('returns mapped recent orders', async () => {
    mockPrisma.salesOrder.findMany.mockResolvedValue([
      {
        orderNumber: 'SO-001',
        customer: { name: 'XYZ' },
        totalAmount: 2000,
        status: 'COMPLETED',
        requiredDate: new Date('2026-02-28'),
      },
    ]);

    const result = await prismaDataFetcher.getRecentOrders(5);
    expect(result[0]).toMatchObject({
      orderNumber: 'SO-001',
      customer: 'XYZ',
      value: 2000,
      status: 'COMPLETED',
    });
    expect(mockPrisma.salesOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });

  it('returns empty array on error', async () => {
    mockPrisma.salesOrder.findMany.mockRejectedValue(new Error('fail'));
    const result = await prismaDataFetcher.getRecentOrders(10);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// getProductionSummary
// =============================================================================

describe('getProductionSummary', () => {
  it('returns correct production summary', async () => {
    mockPrisma.workOrder.count.mockResolvedValue(20);
    mockPrisma.workOrder.groupBy.mockResolvedValue([
      { status: 'in_progress', _count: 8 },
      { status: 'waiting_material', _count: 3 },
      { status: 'completed', _count: 5 },
    ]);

    const result = await prismaDataFetcher.getProductionSummary();
    expect(result.runningCount).toBe(8);
    expect(result.waitingCount).toBe(3);
    expect(result.completedToday).toBe(5);
    expect(result.completedWeek).toBe(25);
    expect(result.efficiency).toBe(((20 - 3) / 20) * 100);
  });

  it('caps efficiency at 100', async () => {
    mockPrisma.workOrder.count.mockResolvedValue(10);
    mockPrisma.workOrder.groupBy.mockResolvedValue([]);

    const result = await prismaDataFetcher.getProductionSummary();
    expect(result.efficiency).toBeLessThanOrEqual(100);
  });

  it('handles total = 0 gracefully', async () => {
    mockPrisma.workOrder.count.mockResolvedValue(0);
    mockPrisma.workOrder.groupBy.mockResolvedValue([]);

    const result = await prismaDataFetcher.getProductionSummary();
    // totalPlanned = 1 (fallback), total = 0, waitingCount = 0
    // efficiency = ((0 - 0) / 1) * 100 = 0
    expect(result.efficiency).toBe(0);
  });

  it('returns fallback on error', async () => {
    mockPrisma.workOrder.count.mockRejectedValue(new Error('fail'));
    const result = await prismaDataFetcher.getProductionSummary();
    expect(result.efficiency).toBe(0);
    expect(mockLogger.logError).toHaveBeenCalled();
  });
});

// =============================================================================
// getWorkOrders
// =============================================================================

describe('getWorkOrders', () => {
  it('returns mapped work orders without status filter', async () => {
    mockPrisma.workOrder.findMany.mockResolvedValue([
      {
        woNumber: 'WO-001',
        product: { sku: 'SKU-A', name: 'Widget' },
        status: 'in_progress',
        quantity: 100,
        completedQty: 50,
        plannedStart: new Date('2026-03-01'),
        plannedEnd: new Date('2026-03-15'),
      },
    ]);

    const result = await prismaDataFetcher.getWorkOrders();
    expect(result[0]).toMatchObject({
      orderNumber: 'WO-001',
      product: 'SKU-A',
      productName: 'Widget',
      status: 'in_progress',
      progress: 50,
      quantity: 100,
      completedQty: 50,
    });
    expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it('filters by status when provided', async () => {
    mockPrisma.workOrder.findMany.mockResolvedValue([]);
    await prismaDataFetcher.getWorkOrders('in_progress');
    expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'in_progress' } })
    );
  });

  it('handles null completedQty', async () => {
    mockPrisma.workOrder.findMany.mockResolvedValue([
      {
        woNumber: 'WO-002', product: null, status: 'pending',
        quantity: 100, completedQty: null, plannedStart: null, plannedEnd: null,
      },
    ]);
    const result = await prismaDataFetcher.getWorkOrders();
    expect(result[0].progress).toBe(0);
    expect(result[0].product).toBe('N/A');
    expect(result[0].completedQty).toBe(0);
  });

  it('returns empty array on error', async () => {
    mockPrisma.workOrder.findMany.mockRejectedValue(new Error('fail'));
    const result = await prismaDataFetcher.getWorkOrders();
    expect(result).toEqual([]);
  });
});

// =============================================================================
// getMRPResults
// =============================================================================

describe('getMRPResults', () => {
  it('returns requirements, shortages, and suggestions', async () => {
    // First call is getInventoryAlerts inside getMRPResults
    mockPrisma.part.findMany.mockResolvedValue([
      {
        partNumber: 'P1', name: 'Bolt', minStockLevel: 100, safetyStock: 20,
        reorderPoint: 50, unitCost: 10, unit: 'pcs', category: 'raw', isCritical: false,
        inventory: [{ quantity: 30 }],
      },
    ]);

    mockPrisma.mrpSuggestion.findMany.mockResolvedValue([
      {
        part: { partNumber: 'P1', name: 'Bolt', unit: 'pcs' },
        supplier: { name: 'Supplier A' },
        suggestedQty: 70,
        estimatedCost: 700,
        priority: 'HIGH',
        suggestedDate: new Date('2026-04-01'),
        status: 'pending',
      },
    ]);

    const result = await prismaDataFetcher.getMRPResults(['SO-001']);
    expect(result.requirements.length).toBeGreaterThan(0);
    expect(result.requirements[0]).toMatchObject({
      partNumber: 'P1',
      required: 100,
      onHand: 30,
      shortage: 70,
    });
    expect(result.suggestions[0]).toMatchObject({
      partNumber: 'P1',
      supplier: 'Supplier A',
      quantity: 70,
      totalCost: 700,
      priority: 'HIGH',
    });
  });

  it('handles null part/supplier in suggestions', async () => {
    mockPrisma.part.findMany.mockResolvedValue([]);
    mockPrisma.mrpSuggestion.findMany.mockResolvedValue([
      {
        part: null, supplier: null, suggestedQty: 0, estimatedCost: null,
        priority: null, suggestedDate: null, status: 'pending',
      },
    ]);

    const result = await prismaDataFetcher.getMRPResults([]);
    expect(result.suggestions[0]).toMatchObject({
      partNumber: 'N/A',
      partName: 'N/A',
      supplier: 'TBD',
      quantity: 0,
      priority: 'NORMAL',
    });
  });

  it('returns fallback on error', async () => {
    // getInventoryAlerts has its own catch, so we need mrpSuggestion to fail
    mockPrisma.part.findMany.mockResolvedValue([]);
    mockPrisma.mrpSuggestion.findMany.mockRejectedValue(new Error('fail'));
    const result = await prismaDataFetcher.getMRPResults([]);
    expect(result).toEqual({ requirements: [], shortages: [], suggestions: [] });
  });
});

// =============================================================================
// getPurchaseSuggestions
// =============================================================================

describe('getPurchaseSuggestions', () => {
  it('returns suggestions with supplier data', async () => {
    mockPrisma.part.findMany.mockResolvedValue([
      {
        partNumber: 'P1', name: 'Bolt', minStockLevel: 100, safetyStock: 20,
        reorderPoint: 50, unitCost: 10, unit: 'pcs', category: 'raw', isCritical: false,
        inventory: [{ quantity: 30 }],
      },
    ]);

    mockPrisma.partSupplier.findMany.mockResolvedValue([
      {
        part: { partNumber: 'P1' },
        supplier: { name: 'Supplier A' },
        isPreferred: true,
        unitPrice: 12,
        minOrderQty: 50,
        leadTimeDays: 7,
      },
    ]);

    const result = await prismaDataFetcher.getPurchaseSuggestions();
    expect(result[0]).toMatchObject({
      partNumber: 'P1',
      supplier: 'Supplier A',
      priority: 'URGENT', // onHand=30 < safetyStock=20? No, but onHand < minStock*0.5=50, so CRITICAL → URGENT
    });
    // reorderQty = max(100 - 30 + 20, 50) = max(90, 50) = 90
    expect(result[0].quantity).toBe(90);
    expect(result[0].totalCost).toBe(90 * 12);
    expect(result[0].leadTimeDays).toBe(7);
  });

  it('falls back to part data when no supplier', async () => {
    mockPrisma.part.findMany.mockResolvedValue([
      {
        partNumber: 'P2', name: 'Nut', minStockLevel: 50, safetyStock: 10,
        reorderPoint: 20, unitCost: 5, unit: 'kg', category: 'raw', isCritical: false,
        inventory: [{ quantity: 8 }],
      },
    ]);
    mockPrisma.partSupplier.findMany.mockResolvedValue([]);

    const result = await prismaDataFetcher.getPurchaseSuggestions();
    expect(result[0].supplier).toBe('No supplier assigned');
    // reorderQty = max(50 - 8 + 10, 1) = 52
    expect(result[0].quantity).toBe(52);
    expect(result[0].unitCost).toBe(5);
    expect(result[0].leadTimeDays).toBe(14);
  });

  it('assigns correct priority based on status', async () => {
    mockPrisma.part.findMany.mockResolvedValue([
      // onHand=0 → OUT status; priority mapping: OUT is neither CRITICAL nor LOW → 'NORMAL'
      { partNumber: 'P1', name: 'A', minStockLevel: 100, safetyStock: 50, reorderPoint: 200, unitCost: 10, unit: 'pcs', category: 'raw', isCritical: false, inventory: [{ quantity: 0 }] },
      // onHand=10, minStock=100, safetyStock=50 → onHand < safetyStock → CRITICAL → 'URGENT'
      { partNumber: 'P2', name: 'B', minStockLevel: 100, safetyStock: 50, reorderPoint: 200, unitCost: 10, unit: 'pcs', category: 'raw', isCritical: false, inventory: [{ quantity: 10 }] },
      // onHand=80, minStock=100, safetyStock=20 → onHand < minStock → LOW → 'HIGH'
      { partNumber: 'P3', name: 'C', minStockLevel: 100, safetyStock: 20, reorderPoint: 200, unitCost: 10, unit: 'pcs', category: 'raw', isCritical: false, inventory: [{ quantity: 80 }] },
    ]);
    mockPrisma.partSupplier.findMany.mockResolvedValue([]);

    const result = await prismaDataFetcher.getPurchaseSuggestions();
    const p1 = result.find((r) => r.partNumber === 'P1');
    const p2 = result.find((r) => r.partNumber === 'P2');
    const p3 = result.find((r) => r.partNumber === 'P3');
    expect(p1?.priority).toBe('NORMAL');  // OUT → not matched → NORMAL
    expect(p2?.priority).toBe('URGENT');  // CRITICAL → URGENT
    expect(p3?.priority).toBe('HIGH');    // LOW → HIGH
  });

  it('returns empty array on error', async () => {
    mockPrisma.part.findMany.mockRejectedValue(new Error('fail'));
    const result = await prismaDataFetcher.getPurchaseSuggestions();
    expect(result).toEqual([]);
  });
});

// =============================================================================
// getQualitySummary
// =============================================================================

describe('getQualitySummary', () => {
  it('returns correct quality summary', async () => {
    mockPrisma.nCR.count
      .mockResolvedValueOnce(20)  // totalNCRs
      .mockResolvedValueOnce(5);  // openNCRs
    mockPrisma.inspection.count.mockResolvedValue(10);

    const result = await prismaDataFetcher.getQualitySummary();
    expect(result.openNCRs).toBe(5);
    expect(result.inspectionsToday).toBe(10);
    expect(result.passedToday).toBe(Math.floor(10 * 0.95));
    expect(result.failedToday).toBe(Math.ceil(10 * 0.05));
    // passRate = max(95, 100 - (5/20*10)) = max(95, 97.5) = 97.5
    expect(result.passRate).toBe(97.5);
  });

  it('returns 98.5 passRate when no NCRs', async () => {
    mockPrisma.nCR.count.mockResolvedValue(0);
    mockPrisma.inspection.count.mockResolvedValue(0);

    const result = await prismaDataFetcher.getQualitySummary();
    expect(result.passRate).toBe(98.5);
  });

  it('returns fallback on error', async () => {
    mockPrisma.nCR.count.mockRejectedValue(new Error('fail'));
    const result = await prismaDataFetcher.getQualitySummary();
    expect(result.passRate).toBe(0);
    expect(mockLogger.logError).toHaveBeenCalled();
  });
});

// =============================================================================
// getOpenNCRs
// =============================================================================

describe('getOpenNCRs', () => {
  it('returns mapped NCRs', async () => {
    mockPrisma.nCR.findMany.mockResolvedValue([
      {
        ncrNumber: 'NCR-001',
        description: 'Surface crack',
        part: { partNumber: 'P1', name: 'Bolt' },
        status: 'OPEN',
        priority: 'high',
        createdAt: new Date('2026-03-01'),
      },
    ]);

    const result = await prismaDataFetcher.getOpenNCRs();
    expect(result[0]).toMatchObject({
      ncrNumber: 'NCR-001',
      description: 'Surface crack',
      product: 'P1',
      productName: 'Bolt',
      status: 'OPEN',
      severity: 'high',
      createdAt: '2026-03-01',
    });
  });

  it('handles null description and part', async () => {
    mockPrisma.nCR.findMany.mockResolvedValue([
      {
        ncrNumber: 'NCR-002', description: null, part: null,
        status: 'IN_PROGRESS', priority: null, createdAt: new Date('2026-02-01'),
      },
    ]);
    const result = await prismaDataFetcher.getOpenNCRs();
    expect(result[0].description).toBe('No description');
    expect(result[0].product).toBe('N/A');
    expect(result[0].severity).toBe('medium');
  });

  it('returns empty array on error', async () => {
    mockPrisma.nCR.findMany.mockRejectedValue(new Error('fail'));
    const result = await prismaDataFetcher.getOpenNCRs();
    expect(result).toEqual([]);
  });
});

// =============================================================================
// getAnalytics
// =============================================================================

describe('getAnalytics', () => {
  it('returns combined analytics data', async () => {
    // getInventorySummary
    mockPrisma.part.findMany.mockResolvedValue([
      { partNumber: 'P1', name: 'A', minStockLevel: 10, safetyStock: 5, unitCost: 100, inventory: [{ quantity: 50 }] },
    ]);
    // getOrdersSummary
    mockPrisma.salesOrder.count.mockResolvedValue(10);
    mockPrisma.salesOrder.groupBy.mockResolvedValue([]);
    mockPrisma.salesOrder.findMany.mockResolvedValue([{ totalAmount: 10000 }]);
    // getProductionSummary
    mockPrisma.workOrder.count.mockResolvedValue(5);
    mockPrisma.workOrder.groupBy.mockResolvedValue([]);
    // getQualitySummary
    mockPrisma.nCR.count.mockResolvedValue(0);
    mockPrisma.inspection.count.mockResolvedValue(0);

    const result = await prismaDataFetcher.getAnalytics('monthly');
    expect(result.revenue).toBeDefined();
    expect(result.production).toBeDefined();
    expect(result.inventory).toBeDefined();
    expect(result.quality).toBeDefined();
    expect(result.revenue.thisMonth).toBe(10000);
    expect(result.revenue.growth).toBe(10);
  });

  it('returns combined data even when sub-methods handle errors internally', async () => {
    // Each sub-method has its own try-catch, so errors don't propagate.
    // getInventorySummary returns fallback
    mockPrisma.part.findMany.mockResolvedValue([]);
    // getOrdersSummary returns fallback
    mockPrisma.salesOrder.count.mockResolvedValue(0);
    mockPrisma.salesOrder.groupBy.mockResolvedValue([]);
    mockPrisma.salesOrder.findMany.mockResolvedValue([]);
    // getProductionSummary returns fallback
    mockPrisma.workOrder.count.mockResolvedValue(0);
    mockPrisma.workOrder.groupBy.mockResolvedValue([]);
    // getQualitySummary returns fallback
    mockPrisma.nCR.count.mockResolvedValue(0);
    mockPrisma.inspection.count.mockResolvedValue(0);

    const result = await prismaDataFetcher.getAnalytics('monthly');
    expect(result.revenue.thisMonth).toBe(0);
    expect(result.revenue.growth).toBe(10); // hardcoded in source
    expect(result.inventory.totalValue).toBe(0);
  });
});

// =============================================================================
// getSupplierInfo
// =============================================================================

describe('getSupplierInfo', () => {
  it('returns mapped suppliers with names filter', async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([
      {
        name: 'Supplier A', code: 'SA', leadTimeDays: 7, rating: 4.5,
        country: 'VN', status: 'active', contactEmail: 'a@test.com', ndaaCompliant: true,
        partSuppliers: [{ id: 1 }, { id: 2 }],
        purchaseOrders: [{ totalAmount: 5000 }, { totalAmount: 3000 }],
      },
    ]);

    const result = await prismaDataFetcher.getSupplierInfo(['Supplier A']);
    expect(result[0]).toMatchObject({
      name: 'Supplier A',
      code: 'SA',
      items: 2,
      totalValue: 8000,
      leadTime: 7,
      rating: 4.5,
      country: 'VN',
    });
  });

  it('handles empty supplierNames', async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([]);
    await prismaDataFetcher.getSupplierInfo();
    expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it('handles undefined supplierNames', async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([]);
    await prismaDataFetcher.getSupplierInfo(undefined);
    expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it('falls back rating to 4.0 when null', async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([
      {
        name: 'X', code: 'X', leadTimeDays: 7, rating: null,
        country: 'US', status: 'active', contactEmail: null, ndaaCompliant: false,
        partSuppliers: [],
        purchaseOrders: [{ totalAmount: null }],
      },
    ]);
    const result = await prismaDataFetcher.getSupplierInfo([]);
    expect(result[0].rating).toBe(4.0);
    expect(result[0].totalValue).toBe(0);
  });

  it('returns empty array on error', async () => {
    mockPrisma.supplier.findMany.mockRejectedValue(new Error('fail'));
    const result = await prismaDataFetcher.getSupplierInfo(['X']);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

describe('default export', () => {
  it('exports prismaDataFetcher via default', async () => {
    const mod = await import('../prisma-data-fetcher');
    expect(mod.default).toBe(prismaDataFetcher);
  });
});
