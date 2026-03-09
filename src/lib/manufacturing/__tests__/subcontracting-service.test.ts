import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    supplier: {
      findUnique: vi.fn(),
    },
    warehouse: {
      findFirst: vi.fn(),
    },
    part: {
      findUnique: vi.fn(),
    },
    inventory: {
      findFirst: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    lotTransaction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import {
  sendToSubcontractor,
  receiveFromSubcontractor,
  getPendingSubcontractShipments,
  getSubcontractingSummary,
} from '../subcontracting-service';

describe('sendToSubcontractor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return error when supplier not found', async () => {
    mockPrisma.supplier.findUnique.mockResolvedValue(null);

    const result = await sendToSubcontractor({
      supplierId: 's-missing',
      items: [],
      userId: 'u-1',
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Supplier not found');
  });

  it('should send items and return success', async () => {
    mockPrisma.supplier.findUnique.mockResolvedValue({ id: 's-1', code: 'SUP01', name: 'Supplier One' });

    const txMock = {
      inventory: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'inv-1',
          quantity: 100,
          reservedQty: 0,
          part: { partNumber: 'P001' },
        }),
        update: vi.fn(),
      },
      lotTransaction: { create: vi.fn() },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(txMock);
    });

    const result = await sendToSubcontractor({
      supplierId: 's-1',
      items: [{ partId: 'p-1', warehouseId: 'wh-1', quantity: 50 }],
      userId: 'u-1',
    });

    expect(result.success).toBe(true);
    expect(result.itemsSent).toBe(1);
    expect(result.totalQuantity).toBe(50);
    expect(result.shipmentRef).toContain('SC-OUT-SUP01-');
  });

  it('should handle insufficient inventory', async () => {
    mockPrisma.supplier.findUnique.mockResolvedValue({ id: 's-1', code: 'SUP01', name: 'Supplier One' });

    const txMock = {
      inventory: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'inv-1',
          quantity: 20,
          reservedQty: 0,
          part: { partNumber: 'P001' },
        }),
        update: vi.fn(),
      },
      lotTransaction: { create: vi.fn() },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(txMock);
    });

    const result = await sendToSubcontractor({
      supplierId: 's-1',
      items: [{ partId: 'p-1', warehouseId: 'wh-1', quantity: 50 }],
      userId: 'u-1',
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Insufficient inventory');
  });

  it('should handle missing inventory record', async () => {
    mockPrisma.supplier.findUnique.mockResolvedValue({ id: 's-1', code: 'SUP01', name: 'Supplier One' });

    const txMock = {
      inventory: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      lotTransaction: { create: vi.fn() },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(txMock);
    });

    const result = await sendToSubcontractor({
      supplierId: 's-1',
      items: [{ partId: 'p-1', warehouseId: 'wh-1', quantity: 50 }],
      userId: 'u-1',
    });

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Inventory not found');
  });
});

describe('receiveFromSubcontractor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return error when supplier not found', async () => {
    mockPrisma.supplier.findUnique.mockResolvedValue(null);

    const result = await receiveFromSubcontractor({
      shipmentRef: 'SC-OUT-X',
      supplierId: 's-missing',
      items: [],
      warehouseId: 'wh-1',
      userId: 'u-1',
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Supplier not found');
  });

  it('should receive items into warehouse', async () => {
    mockPrisma.supplier.findUnique.mockResolvedValue({ id: 's-1', code: 'SUP01', name: 'Supplier One' });
    mockPrisma.warehouse.findFirst.mockResolvedValue(null);

    const txMock = {
      part: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'p-1',
          partNumber: 'P001',
          name: 'Part A',
          inspectionRequired: false,
        }),
      },
      inventory: { upsert: vi.fn() },
      lotTransaction: { create: vi.fn() },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(txMock);
    });

    const result = await receiveFromSubcontractor({
      shipmentRef: 'SC-OUT-SUP01-ABC',
      supplierId: 's-1',
      items: [{ partId: 'p-1', receivedQty: 50 }],
      warehouseId: 'wh-1',
      userId: 'u-1',
    });

    expect(result.success).toBe(true);
    expect(result.itemsReceived).toBe(1);
    expect(result.totalReceived).toBe(50);
    expect(result.toInspection).toBe(0);
  });

  it('should route to HOLD warehouse when inspection required', async () => {
    mockPrisma.supplier.findUnique.mockResolvedValue({ id: 's-1', code: 'SUP01', name: 'Supplier One' });
    mockPrisma.warehouse.findFirst.mockResolvedValue({ id: 'hold-wh', type: 'HOLD', status: 'active' });

    const txMock = {
      part: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'p-1',
          partNumber: 'P001',
          name: 'Part A',
          inspectionRequired: true,
        }),
      },
      inventory: { upsert: vi.fn() },
      lotTransaction: { create: vi.fn() },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(txMock);
    });

    const result = await receiveFromSubcontractor({
      shipmentRef: 'SC-OUT-SUP01-ABC',
      supplierId: 's-1',
      items: [{ partId: 'p-1', receivedQty: 30 }],
      warehouseId: 'wh-1',
      userId: 'u-1',
    });

    expect(result.toInspection).toBe(1);
    expect(txMock.inventory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          partId_warehouseId_lotNumber: expect.objectContaining({
            warehouseId: 'hold-wh',
          }),
        }),
      })
    );
  });

  it('should skip items with zero or negative receivedQty', async () => {
    mockPrisma.supplier.findUnique.mockResolvedValue({ id: 's-1', code: 'SUP01', name: 'Supplier One' });
    mockPrisma.warehouse.findFirst.mockResolvedValue(null);

    const txMock = {
      part: { findUnique: vi.fn() },
      inventory: { upsert: vi.fn() },
      lotTransaction: { create: vi.fn() },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(txMock);
    });

    const result = await receiveFromSubcontractor({
      shipmentRef: 'SC-OUT-SUP01-ABC',
      supplierId: 's-1',
      items: [{ partId: 'p-1', receivedQty: 0 }],
      warehouseId: 'wh-1',
      userId: 'u-1',
    });

    expect(result.success).toBe(false);
    expect(result.itemsReceived).toBe(0);
  });

  it('should handle part not found', async () => {
    mockPrisma.supplier.findUnique.mockResolvedValue({ id: 's-1', code: 'SUP01', name: 'Supplier One' });
    mockPrisma.warehouse.findFirst.mockResolvedValue(null);

    const txMock = {
      part: { findUnique: vi.fn().mockResolvedValue(null) },
      inventory: { upsert: vi.fn() },
      lotTransaction: { create: vi.fn() },
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(txMock);
    });

    const result = await receiveFromSubcontractor({
      shipmentRef: 'SC-OUT-SUP01-ABC',
      supplierId: 's-1',
      items: [{ partId: 'p-missing', receivedQty: 50 }],
      warehouseId: 'wh-1',
      userId: 'u-1',
    });

    expect(result.errors[0]).toContain('Part not found');
  });
});

describe('getPendingSubcontractShipments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return pending shipments not yet received', async () => {
    mockPrisma.lotTransaction.findMany.mockResolvedValue([
      {
        id: 'tx-1',
        partId: 'p-1',
        quantity: 100,
        transactionType: 'SHIPPED',
        notes: '[SUBCONTRACT SEND-OUT] To: SupplierA (SA) | Shipment: SC-OUT-SA-ABC | Expected return: 2024-06-01',
        createdAt: new Date('2024-01-01'),
        part: { partNumber: 'P001' },
      },
    ]);
    mockPrisma.lotTransaction.findFirst.mockResolvedValue(null); // not received

    const result = await getPendingSubcontractShipments();

    expect(result).toHaveLength(1);
    expect(result[0].shipmentRef).toBe('SC-OUT-SA-ABC');
    expect(result[0].supplierName).toBe('SupplierA');
    expect(result[0].expectedReturn).toBe('2024-06-01');
  });

  it('should exclude already received shipments', async () => {
    mockPrisma.lotTransaction.findMany.mockResolvedValue([
      {
        id: 'tx-1',
        partId: 'p-1',
        quantity: 100,
        notes: '[SUBCONTRACT SEND-OUT] To: SupplierA (SA) | Shipment: SC-OUT-SA-ABC',
        createdAt: new Date(),
        part: { partNumber: 'P001' },
      },
    ]);
    mockPrisma.lotTransaction.findFirst.mockResolvedValue({ id: 'tx-recv' }); // received

    const result = await getPendingSubcontractShipments();

    expect(result).toHaveLength(0);
  });

  it('should return empty when no shipments exist', async () => {
    mockPrisma.lotTransaction.findMany.mockResolvedValue([]);

    const result = await getPendingSubcontractShipments();

    expect(result).toHaveLength(0);
  });
});

describe('getSubcontractingSummary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should calculate summary from pending shipments', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    mockPrisma.lotTransaction.findMany.mockResolvedValue([
      {
        id: 'tx-1',
        partId: 'p-1',
        quantity: 100,
        notes: `[SUBCONTRACT SEND-OUT] To: Sup (S1) | Shipment: SC-OUT-S1-A | Expected return: ${pastDate.toISOString().split('T')[0]}`,
        createdAt: new Date(),
        part: { partNumber: 'P001' },
      },
      {
        id: 'tx-2',
        partId: 'p-2',
        quantity: 50,
        notes: '[SUBCONTRACT SEND-OUT] To: Sup (S1) | Shipment: SC-OUT-S1-B',
        createdAt: new Date(),
        part: { partNumber: 'P002' },
      },
    ]);
    mockPrisma.lotTransaction.findFirst.mockResolvedValue(null);

    const summary = await getSubcontractingSummary();

    expect(summary.totalPendingShipments).toBe(2);
    expect(summary.totalPendingQty).toBe(150);
    expect(summary.overdueReturns).toBe(1);
  });
});
