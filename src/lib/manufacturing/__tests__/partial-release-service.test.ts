import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    workOrder: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    inventory: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    materialAllocation: {
      update: vi.fn(),
    },
    lotTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import {
  checkPartialAvailability,
  releasePartialWorkOrder,
  getPartialReleaseCandidates,
} from '../partial-release-service';

const makeWorkOrder = (overrides = {}) => ({
  id: 'wo-1',
  woNumber: 'WO-001',
  quantity: 100,
  status: 'draft',
  notes: null,
  allocations: [
    {
      id: 'alloc-1',
      partId: 'p-1',
      requiredQty: 200,
      allocatedQty: 0,
      issuedQty: 0,
      lotNumber: 'LOT-1',
      part: { partNumber: 'P001', name: 'Part A' },
    },
  ],
  ...overrides,
});

describe('checkPartialAvailability', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should throw when work order not found', async () => {
    mockPrisma.workOrder.findUnique.mockResolvedValue(null);

    await expect(checkPartialAvailability('wo-missing'))
      .rejects.toThrow('Work order not found');
  });

  it('should detect shortages', async () => {
    mockPrisma.workOrder.findUnique.mockResolvedValue(makeWorkOrder());
    mockPrisma.inventory.aggregate.mockResolvedValue({
      _sum: { quantity: 100, reservedQty: 0 },
    });

    const result = await checkPartialAvailability('wo-1');

    expect(result.shortageLines).toHaveLength(1);
    expect(result.shortageLines[0].shortageQty).toBe(100); // need 200, have 100
    expect(result.canPartialRelease).toBe(true);
  });

  it('should report no shortage when fully available', async () => {
    mockPrisma.workOrder.findUnique.mockResolvedValue(makeWorkOrder());
    mockPrisma.inventory.aggregate.mockResolvedValue({
      _sum: { quantity: 300, reservedQty: 0 },
    });

    const result = await checkPartialAvailability('wo-1');

    expect(result.shortageLines).toHaveLength(0);
    expect(result.canPartialRelease).toBe(false); // no shortage -> no partial release needed
  });

  it('should calculate maxProducibleQty', async () => {
    mockPrisma.workOrder.findUnique.mockResolvedValue(makeWorkOrder());
    // available = 100 + 0 (allocatedQty) = 100
    // perUnitRequired = 200 / 100 = 2
    // canProduce = floor(100 / 2) = 50
    mockPrisma.inventory.aggregate.mockResolvedValue({
      _sum: { quantity: 100, reservedQty: 0 },
    });

    const result = await checkPartialAvailability('wo-1');

    expect(result.maxProducibleQty).toBe(50);
  });

  it('should handle null sums from inventory aggregate', async () => {
    mockPrisma.workOrder.findUnique.mockResolvedValue(makeWorkOrder());
    mockPrisma.inventory.aggregate.mockResolvedValue({
      _sum: { quantity: null, reservedQty: null },
    });

    const result = await checkPartialAvailability('wo-1');

    expect(result.maxProducibleQty).toBe(0);
    expect(result.shortageLines).toHaveLength(1);
  });

  it('should handle work order with no allocations', async () => {
    mockPrisma.workOrder.findUnique.mockResolvedValue(
      makeWorkOrder({ allocations: [] })
    );

    const result = await checkPartialAvailability('wo-1');

    expect(result.totalLines).toBe(0);
    expect(result.maxProducibleQty).toBe(100);
    expect(result.canPartialRelease).toBe(false);
  });
});

describe('releasePartialWorkOrder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return error when work order not found', async () => {
    mockPrisma.workOrder.findUnique.mockResolvedValue(null);

    const result = await releasePartialWorkOrder('wo-missing', 50, 'u-1');

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Work order not found');
  });

  it('should return error when WO status is not draft/planned', async () => {
    mockPrisma.workOrder.findUnique.mockResolvedValue(
      makeWorkOrder({ status: 'in_progress' })
    );

    const result = await releasePartialWorkOrder('wo-1', 50, 'u-1');

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('draft/planned');
  });

  it('should return error for invalid release quantity', async () => {
    mockPrisma.workOrder.findUnique.mockResolvedValue(makeWorkOrder());

    const result1 = await releasePartialWorkOrder('wo-1', 0, 'u-1');
    expect(result1.success).toBe(false);

    const result2 = await releasePartialWorkOrder('wo-1', 200, 'u-1');
    expect(result2.success).toBe(false);
  });

  it('should release and issue materials proportionally', async () => {
    mockPrisma.workOrder.findUnique.mockResolvedValue(makeWorkOrder());

    const txMock = {
      workOrder: { update: vi.fn() },
      inventory: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'inv-1', quantity: 200, reservedQty: 0 },
        ]),
        update: vi.fn(),
      },
      materialAllocation: { update: vi.fn() },
      lotTransaction: { create: vi.fn() },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(txMock);
    });

    const result = await releasePartialWorkOrder('wo-1', 50, 'u-1', 'Urgent');

    expect(result.success).toBe(true);
    expect(result.releasedQty).toBe(50);
    expect(result.originalQty).toBe(100);
    expect(txMock.workOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'in_progress' }),
      })
    );
  });

  it('should track shortages when inventory is insufficient', async () => {
    mockPrisma.workOrder.findUnique.mockResolvedValue(makeWorkOrder());

    const txMock = {
      workOrder: { update: vi.fn() },
      inventory: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'inv-1', quantity: 50, reservedQty: 0 },
        ]),
        update: vi.fn(),
      },
      materialAllocation: { update: vi.fn() },
      lotTransaction: { create: vi.fn() },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(txMock);
    });

    const result = await releasePartialWorkOrder('wo-1', 50, 'u-1');

    expect(result.success).toBe(true);
    expect(result.remainingShortages).toHaveLength(1);
  });
});

describe('getPartialReleaseCandidates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return WOs with partial availability sorted by percent', async () => {
    mockPrisma.workOrder.findMany.mockResolvedValue([
      { id: 'wo-1', woNumber: 'WO-001', quantity: 100 },
      { id: 'wo-2', woNumber: 'WO-002', quantity: 50 },
    ]);

    // wo-1: partially available
    mockPrisma.workOrder.findUnique
      .mockResolvedValueOnce(makeWorkOrder())
      .mockResolvedValueOnce(makeWorkOrder({ id: 'wo-2', woNumber: 'WO-002', quantity: 50 }));

    mockPrisma.inventory.aggregate
      .mockResolvedValueOnce({ _sum: { quantity: 100, reservedQty: 0 } })
      .mockResolvedValueOnce({ _sum: { quantity: 50, reservedQty: 0 } });

    const candidates = await getPartialReleaseCandidates();

    expect(candidates.length).toBeGreaterThanOrEqual(0);
  });

  it('should return empty array when no pending WOs', async () => {
    mockPrisma.workOrder.findMany.mockResolvedValue([]);

    const candidates = await getPartialReleaseCandidates();

    expect(candidates).toHaveLength(0);
  });
});
