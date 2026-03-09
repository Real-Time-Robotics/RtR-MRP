import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    inventory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    lotTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { generateCycleCountList, recordCycleCount } from '../cycle-count-service';

describe('generateCycleCountList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return items scored and sorted by urgency', async () => {
    const now = new Date();
    const thirtyOneDaysAgo = new Date(now);
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

    mockPrisma.inventory.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        partId: 'p-1',
        quantity: 100,
        lotNumber: 'LOT-1',
        lastCountDate: thirtyOneDaysAgo,
        part: { partNumber: 'P001', name: 'Part A', abcClass: 'A' },
        warehouse: { code: 'WH-1' },
      },
      {
        id: 'inv-2',
        partId: 'p-2',
        quantity: 50,
        lotNumber: null,
        lastCountDate: null,
        part: { partNumber: 'P002', name: 'Part B', abcClass: 'C' },
        warehouse: { code: 'WH-1' },
      },
    ]);

    const list = await generateCycleCountList();

    expect(list).toHaveLength(2);
    // inv-2 (never counted, score=999/180=5.55) should be first
    // inv-1 (31 days/30 freq=1.03) should be second
    expect(list[0].inventoryId).toBe('inv-2');
    expect(list[1].inventoryId).toBe('inv-1');
    expect(list[0].daysSinceLastCount).toBeNull();
    expect(list[1].daysSinceLastCount).toBeGreaterThanOrEqual(31);
  });

  it('should filter by warehouseId when provided', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([]);

    await generateCycleCountList('wh-specific');

    expect(mockPrisma.inventory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ warehouseId: 'wh-specific' }),
      })
    );
  });

  it('should limit results to maxItems', async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `inv-${i}`,
      partId: `p-${i}`,
      quantity: 10,
      lotNumber: null,
      lastCountDate: null,
      part: { partNumber: `P${i}`, name: `Part ${i}`, abcClass: 'C' },
      warehouse: { code: 'WH-1' },
    }));
    mockPrisma.inventory.findMany.mockResolvedValue(items);

    const list = await generateCycleCountList(undefined, 3);

    expect(list).toHaveLength(3);
  });

  it('should default abcClass to C for parts without classification', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        partId: 'p-1',
        quantity: 10,
        lotNumber: null,
        lastCountDate: null,
        part: { partNumber: 'P001', name: 'Part A', abcClass: null },
        warehouse: { code: 'WH-1' },
      },
    ]);

    const list = await generateCycleCountList();

    expect(list).toHaveLength(1);
    expect(list[0].abcClass).toBeNull();
  });
});

describe('recordCycleCount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should throw if inventory not found', async () => {
    mockPrisma.inventory.findUnique.mockResolvedValue(null);

    await expect(recordCycleCount('inv-missing', 10, 'u-1'))
      .rejects.toThrow('Inventory record not found');
  });

  it('should return result with no adjustment when count matches', async () => {
    mockPrisma.inventory.findUnique.mockResolvedValue({
      id: 'inv-1',
      partId: 'p-1',
      quantity: 100,
      warehouseId: 'wh-1',
      lotNumber: 'LOT-1',
      part: { partNumber: 'P001' },
      warehouse: { code: 'WH-1' },
    });

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        inventory: { update: vi.fn() },
        lotTransaction: { create: vi.fn() },
      };
      await fn(tx);
    });

    const result = await recordCycleCount('inv-1', 100, 'u-1');

    expect(result.variance).toBe(0);
    expect(result.adjustmentCreated).toBe(false);
    expect(result.countedQty).toBe(100);
    expect(result.systemQty).toBe(100);
  });

  it('should create adjustment when variance exists', async () => {
    mockPrisma.inventory.findUnique.mockResolvedValue({
      id: 'inv-1',
      partId: 'p-1',
      quantity: 100,
      warehouseId: 'wh-1',
      lotNumber: 'LOT-1',
      part: { partNumber: 'P001' },
      warehouse: { code: 'WH-1' },
    });

    const txMock = {
      inventory: { update: vi.fn() },
      lotTransaction: { create: vi.fn() },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(txMock);
    });

    const result = await recordCycleCount('inv-1', 95, 'u-1', 'Missing items');

    expect(result.variance).toBe(-5);
    expect(result.variancePercent).toBe(-5);
    expect(result.adjustmentCreated).toBe(true);

    // Should update inventory quantity and create lot transaction
    expect(txMock.inventory.update).toHaveBeenCalledTimes(2); // lastCountDate + quantity
    expect(txMock.lotTransaction.create).toHaveBeenCalled();
  });

  it('should calculate variancePercent as 0 when systemQty is 0', async () => {
    mockPrisma.inventory.findUnique.mockResolvedValue({
      id: 'inv-1',
      partId: 'p-1',
      quantity: 0,
      warehouseId: 'wh-1',
      lotNumber: null,
      part: { partNumber: 'P001' },
      warehouse: { code: 'WH-1' },
    });

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        inventory: { update: vi.fn() },
        lotTransaction: { create: vi.fn() },
      };
      await fn(tx);
    });

    const result = await recordCycleCount('inv-1', 5, 'u-1');

    expect(result.variancePercent).toBe(0);
    expect(result.variance).toBe(5);
  });
});
