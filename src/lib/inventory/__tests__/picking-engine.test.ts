import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    part: {
      findUnique: vi.fn(),
    },
    inventory: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { allocateByStrategy, getSortedInventory } from '../picking-engine';

describe('allocateByStrategy', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should allocate from a single record with ANY strategy', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      { id: 'inv-1', lotNumber: 'LOT-1', quantity: 100, reservedQty: 0, expiryDate: null },
    ]);

    const result = await allocateByStrategy({
      partId: 'p-1',
      warehouseId: 'wh-1',
      requiredQty: 50,
      strategy: 'ANY',
    });

    expect(result.success).toBe(true);
    expect(result.totalAllocated).toBe(50);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].quantity).toBe(50);
    expect(result.errors).toHaveLength(0);
  });

  it('should allocate across multiple records', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      { id: 'inv-1', lotNumber: 'LOT-1', quantity: 30, reservedQty: 0, expiryDate: null },
      { id: 'inv-2', lotNumber: 'LOT-2', quantity: 40, reservedQty: 0, expiryDate: null },
    ]);

    const result = await allocateByStrategy({
      partId: 'p-1',
      warehouseId: 'wh-1',
      requiredQty: 50,
      strategy: 'ANY',
    });

    expect(result.success).toBe(true);
    expect(result.totalAllocated).toBe(50);
    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0].quantity).toBe(30);
    expect(result.allocations[1].quantity).toBe(20);
  });

  it('should return failure when insufficient inventory', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      { id: 'inv-1', lotNumber: 'LOT-1', quantity: 20, reservedQty: 0, expiryDate: null },
    ]);

    const result = await allocateByStrategy({
      partId: 'p-1',
      warehouseId: 'wh-1',
      requiredQty: 50,
      strategy: 'ANY',
    });

    expect(result.success).toBe(false);
    expect(result.totalAllocated).toBe(20);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Insufficient inventory');
  });

  it('should return failure when no inventory exists', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([]);

    const result = await allocateByStrategy({
      partId: 'p-1',
      warehouseId: 'wh-1',
      requiredQty: 10,
      strategy: 'ANY',
    });

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('No inventory found');
  });

  it('should respect reservedQty', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      { id: 'inv-1', lotNumber: 'LOT-1', quantity: 100, reservedQty: 80, expiryDate: null },
    ]);

    const result = await allocateByStrategy({
      partId: 'p-1',
      warehouseId: 'wh-1',
      requiredQty: 30,
      strategy: 'ANY',
    });

    expect(result.success).toBe(false);
    expect(result.totalAllocated).toBe(20);
  });

  it('should skip records with no available quantity', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      { id: 'inv-1', lotNumber: 'LOT-1', quantity: 50, reservedQty: 50, expiryDate: null },
      { id: 'inv-2', lotNumber: 'LOT-2', quantity: 30, reservedQty: 0, expiryDate: null },
    ]);

    const result = await allocateByStrategy({
      partId: 'p-1',
      warehouseId: 'wh-1',
      requiredQty: 25,
      strategy: 'ANY',
    });

    expect(result.success).toBe(true);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].inventoryId).toBe('inv-2');
  });

  it('should use FIFO strategy ordering', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      { id: 'inv-1', lotNumber: 'LOT-1', quantity: 50, reservedQty: 0, expiryDate: null, createdAt: new Date('2024-01-01') },
      { id: 'inv-2', lotNumber: 'LOT-2', quantity: 50, reservedQty: 0, expiryDate: null, createdAt: new Date('2024-06-01') },
    ]);

    const result = await allocateByStrategy({
      partId: 'p-1',
      warehouseId: 'wh-1',
      requiredQty: 30,
      strategy: 'FIFO',
    });

    expect(result.success).toBe(true);
    expect(result.allocations[0].inventoryId).toBe('inv-1');
  });

  it('should use FEFO strategy and sort nulls last', async () => {
    const earlyExpiry = new Date('2024-03-01');
    const lateExpiry = new Date('2024-12-01');

    mockPrisma.inventory.findMany.mockResolvedValue([
      { id: 'inv-1', lotNumber: 'LOT-1', quantity: 50, reservedQty: 0, expiryDate: null },
      { id: 'inv-2', lotNumber: 'LOT-2', quantity: 50, reservedQty: 0, expiryDate: lateExpiry },
      { id: 'inv-3', lotNumber: 'LOT-3', quantity: 50, reservedQty: 0, expiryDate: earlyExpiry },
    ]);

    const result = await allocateByStrategy({
      partId: 'p-1',
      warehouseId: 'wh-1',
      requiredQty: 30,
      strategy: 'FEFO',
    });

    expect(result.success).toBe(true);
    // Should pick earliest expiry first (inv-3)
    expect(result.allocations[0].inventoryId).toBe('inv-3');
  });

  it('should look up part default strategy when none specified', async () => {
    mockPrisma.part.findUnique.mockResolvedValue({ pickingStrategy: 'FIFO' });
    mockPrisma.inventory.findMany.mockResolvedValue([
      { id: 'inv-1', lotNumber: 'LOT-1', quantity: 50, reservedQty: 0, expiryDate: null },
    ]);

    const result = await allocateByStrategy({
      partId: 'p-1',
      warehouseId: 'wh-1',
      requiredQty: 10,
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.part.findUnique).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      select: { pickingStrategy: true },
    });
  });

  it('should default to ANY when part has no strategy', async () => {
    mockPrisma.part.findUnique.mockResolvedValue({ pickingStrategy: null });
    mockPrisma.inventory.findMany.mockResolvedValue([
      { id: 'inv-1', lotNumber: 'LOT-1', quantity: 50, reservedQty: 0, expiryDate: null },
    ]);

    const result = await allocateByStrategy({
      partId: 'p-1',
      warehouseId: 'wh-1',
      requiredQty: 10,
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.inventory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ quantity: 'desc' }],
      })
    );
  });
});

describe('getSortedInventory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return inventory sorted by strategy', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      { id: 'inv-1', quantity: 50, expiryDate: null },
    ]);

    const result = await getSortedInventory('p-1', 'wh-1', 'FIFO');

    expect(result).toHaveLength(1);
    expect(mockPrisma.inventory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'asc' }],
      })
    );
  });

  it('should look up part default when no strategy provided', async () => {
    mockPrisma.part.findUnique.mockResolvedValue({ pickingStrategy: 'FEFO' });
    mockPrisma.inventory.findMany.mockResolvedValue([]);

    await getSortedInventory('p-1', 'wh-1');

    expect(mockPrisma.part.findUnique).toHaveBeenCalled();
  });

  it('should sort FEFO with null expiry dates last', async () => {
    const early = new Date('2024-01-01');
    const late = new Date('2024-12-01');

    mockPrisma.inventory.findMany.mockResolvedValue([
      { id: 'inv-1', expiryDate: null },
      { id: 'inv-2', expiryDate: late },
      { id: 'inv-3', expiryDate: early },
    ]);

    const result = await getSortedInventory('p-1', 'wh-1', 'FEFO');

    expect(result[0].id).toBe('inv-3');
    expect(result[1].id).toBe('inv-2');
    expect(result[2].id).toBe('inv-1');
  });
});
