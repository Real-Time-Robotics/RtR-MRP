import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    purchaseOrderLine: {
      findFirst: vi.fn(),
    },
    partSupplier: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { checkReceivingTolerance, checkAllLinesTolerances } from '../receiving-tolerance';

describe('checkReceivingTolerance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return "PO line not found" when line does not exist', async () => {
    mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue(null);

    const result = await checkReceivingTolerance('po-1', 1, 100);

    expect(result.withinTolerance).toBe(false);
    expect(result.message).toBe('PO line not found');
    expect(result.expectedQty).toBe(0);
  });

  it('should accept any quantity when no tolerance defined', async () => {
    mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue({
      partId: 'p-1',
      quantity: 100,
      receivedQty: 0,
      po: { supplierId: 's-1' },
    });
    mockPrisma.partSupplier.findUnique.mockResolvedValue(null);

    const result = await checkReceivingTolerance('po-1', 1, 150);

    expect(result.withinTolerance).toBe(true);
    expect(result.tolerance).toBeNull();
    expect(result.message).toContain('No tolerance defined');
  });

  it('should accept when within tolerance', async () => {
    mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue({
      partId: 'p-1',
      quantity: 100,
      receivedQty: 0,
      po: { supplierId: 's-1' },
    });
    mockPrisma.partSupplier.findUnique.mockResolvedValue({ receivingTolerance: 10 });

    const result = await checkReceivingTolerance('po-1', 1, 105);

    expect(result.withinTolerance).toBe(true);
    expect(result.variancePercent).toBe(5);
    expect(result.message).toContain('Within tolerance');
  });

  it('should reject when outside tolerance', async () => {
    mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue({
      partId: 'p-1',
      quantity: 100,
      receivedQty: 0,
      po: { supplierId: 's-1' },
    });
    mockPrisma.partSupplier.findUnique.mockResolvedValue({ receivingTolerance: 5 });

    const result = await checkReceivingTolerance('po-1', 1, 115);

    expect(result.withinTolerance).toBe(false);
    expect(result.message).toContain('OUTSIDE tolerance');
  });

  it('should account for previously received quantity', async () => {
    mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue({
      partId: 'p-1',
      quantity: 100,
      receivedQty: 80,
      po: { supplierId: 's-1' },
    });
    mockPrisma.partSupplier.findUnique.mockResolvedValue({ receivingTolerance: 10 });

    // Expected remaining = 100 - 80 = 20
    // Receiving 22 = 10% over
    const result = await checkReceivingTolerance('po-1', 1, 22);

    expect(result.expectedQty).toBe(20);
    expect(result.withinTolerance).toBe(true);
  });

  it('should handle under-delivery', async () => {
    mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue({
      partId: 'p-1',
      quantity: 100,
      receivedQty: 0,
      po: { supplierId: 's-1' },
    });
    mockPrisma.partSupplier.findUnique.mockResolvedValue({ receivingTolerance: 5 });

    const result = await checkReceivingTolerance('po-1', 1, 90);

    expect(result.withinTolerance).toBe(false);
    expect(result.variancePercent).toBe(-10);
  });

  it('should handle zero expected quantity', async () => {
    mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue({
      partId: 'p-1',
      quantity: 50,
      receivedQty: 50,
      po: { supplierId: 's-1' },
    });
    mockPrisma.partSupplier.findUnique.mockResolvedValue({ receivingTolerance: 10 });

    const result = await checkReceivingTolerance('po-1', 1, 5);

    expect(result.expectedQty).toBe(0);
    expect(result.variancePercent).toBe(0);
  });

  it('should handle null receivedQty on PO line', async () => {
    mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue({
      partId: 'p-1',
      quantity: 100,
      receivedQty: null,
      po: { supplierId: 's-1' },
    });
    mockPrisma.partSupplier.findUnique.mockResolvedValue(null);

    const result = await checkReceivingTolerance('po-1', 1, 100);

    expect(result.expectedQty).toBe(100);
    expect(result.withinTolerance).toBe(true);
  });
});

describe('checkAllLinesTolerances', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should check all lines and return summary', async () => {
    // Line 1: within tolerance
    mockPrisma.purchaseOrderLine.findFirst
      .mockResolvedValueOnce({
        partId: 'p-1',
        quantity: 100,
        receivedQty: 0,
        po: { supplierId: 's-1' },
      })
      .mockResolvedValueOnce({
        partId: 'p-2',
        quantity: 50,
        receivedQty: 0,
        po: { supplierId: 's-1' },
      });

    mockPrisma.partSupplier.findUnique
      .mockResolvedValueOnce({ receivingTolerance: 10 })
      .mockResolvedValueOnce({ receivingTolerance: 5 });

    const result = await checkAllLinesTolerances('po-1', [
      { lineNumber: 1, quantity: 105 },
      { lineNumber: 2, quantity: 55 },
    ]);

    expect(result.results).toHaveLength(2);
    expect(result.results[0].withinTolerance).toBe(true);
    expect(result.results[1].withinTolerance).toBe(false);
    expect(result.allWithinTolerance).toBe(false);
    expect(result.violations).toHaveLength(1);
  });

  it('should return all within tolerance when all pass', async () => {
    mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue({
      partId: 'p-1',
      quantity: 100,
      receivedQty: 0,
      po: { supplierId: 's-1' },
    });
    mockPrisma.partSupplier.findUnique.mockResolvedValue(null);

    const result = await checkAllLinesTolerances('po-1', [
      { lineNumber: 1, quantity: 100 },
    ]);

    expect(result.allWithinTolerance).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});
