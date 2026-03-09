import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    salesOrderLine: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    salesOrder: {
      findUnique: vi.fn(),
    },
    part: {
      findFirst: vi.fn(),
    },
    purchaseOrderLine: {
      findFirst: vi.fn(),
    },
    inventory: {
      aggregate: vi.fn(),
    },
    shipment: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import {
  detectBackorders,
  processBackorders,
  getBackorderSummary,
} from '../backorder-service';

describe('detectBackorders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should detect lines with shippedQty < quantity', async () => {
    mockPrisma.salesOrderLine.findMany.mockResolvedValue([
      {
        orderId: 'so-1',
        lineNumber: 1,
        productId: 'prod-1',
        quantity: 100,
        shippedQty: 60,
        order: { orderNumber: 'SO-001' },
        product: { name: 'Widget', sku: 'WDG-001' },
      },
      {
        orderId: 'so-1',
        lineNumber: 2,
        productId: 'prod-2',
        quantity: 50,
        shippedQty: 50,
        order: { orderNumber: 'SO-001' },
        product: { name: 'Gadget', sku: 'GDG-001' },
      },
    ]);
    mockPrisma.part.findFirst.mockResolvedValue({ id: 'p-1', leadTimeDays: 14 });
    mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue(null);

    const result = await detectBackorders();

    expect(result).toHaveLength(1);
    expect(result[0].backorderQty).toBe(40);
    expect(result[0].orderNumber).toBe('SO-001');
  });

  it('should estimate date from incoming PO when available', async () => {
    const expectedDate = new Date('2024-06-01');
    mockPrisma.salesOrderLine.findMany.mockResolvedValue([
      {
        orderId: 'so-1',
        lineNumber: 1,
        productId: 'prod-1',
        quantity: 100,
        shippedQty: 50,
        order: { orderNumber: 'SO-001' },
        product: { name: 'Widget', sku: 'WDG-001' },
      },
    ]);
    mockPrisma.part.findFirst.mockResolvedValue({ id: 'p-1', leadTimeDays: 14 });
    mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue({
      po: { expectedDate },
    });

    const result = await detectBackorders();

    expect(result[0].estimatedAvailableDate).toEqual(expectedDate);
  });

  it('should return empty array when no backorders', async () => {
    mockPrisma.salesOrderLine.findMany.mockResolvedValue([
      {
        orderId: 'so-1',
        lineNumber: 1,
        productId: 'prod-1',
        quantity: 100,
        shippedQty: 100,
        order: { orderNumber: 'SO-001' },
        product: { name: 'Widget', sku: 'WDG-001' },
      },
    ]);

    const result = await detectBackorders();

    expect(result).toHaveLength(0);
  });

  it('should handle part not found', async () => {
    mockPrisma.salesOrderLine.findMany.mockResolvedValue([
      {
        orderId: 'so-1',
        lineNumber: 1,
        productId: 'prod-1',
        quantity: 100,
        shippedQty: 50,
        order: { orderNumber: 'SO-001' },
        product: { name: 'Widget', sku: 'WDG-001' },
      },
    ]);
    mockPrisma.part.findFirst.mockResolvedValue(null);

    const result = await detectBackorders();

    expect(result).toHaveLength(1);
    expect(result[0].estimatedAvailableDate).toBeNull();
  });
});

describe('processBackorders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return empty when no backorders', async () => {
    mockPrisma.salesOrderLine.findMany.mockResolvedValue([]);

    const result = await processBackorders('u-1');

    expect(result.processed).toBe(0);
    expect(result.shipmentsCreated).toHaveLength(0);
  });

  it('should create shipments for fulfillable backorder lines', async () => {
    mockPrisma.salesOrderLine.findMany.mockResolvedValue([
      {
        orderId: 'so-1',
        lineNumber: 1,
        productId: 'prod-1',
        quantity: 100,
        shippedQty: 50,
        order: { orderNumber: 'SO-001' },
        product: { name: 'Widget', sku: 'WDG-001' },
      },
    ]);
    mockPrisma.part.findFirst.mockResolvedValue({ id: 'p-1', leadTimeDays: 14 });
    mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue(null);

    // For processBackorders, part lookup by productName
    mockPrisma.part.findFirst.mockResolvedValue({ id: 'p-1' });
    mockPrisma.inventory.aggregate.mockResolvedValue({
      _sum: { quantity: 30, reservedQty: 0 },
    });
    mockPrisma.salesOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      orderNumber: 'SO-001',
      customerId: 'c-1',
      shipments: [],
    });
    mockPrisma.shipment.create.mockResolvedValue({
      shipmentNumber: 'SHP-SO-001-001-BO',
    });

    const result = await processBackorders('u-1');

    expect(result.shipmentsCreated).toHaveLength(1);
    expect(result.processed).toBe(1);
  });

  it('should handle errors during shipment creation', async () => {
    mockPrisma.salesOrderLine.findMany.mockResolvedValue([
      {
        orderId: 'so-1',
        lineNumber: 1,
        productId: 'prod-1',
        quantity: 100,
        shippedQty: 50,
        order: { orderNumber: 'SO-001' },
        product: { name: 'Widget', sku: 'WDG-001' },
      },
    ]);
    mockPrisma.part.findFirst.mockResolvedValue({ id: 'p-1' });
    mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue(null);
    mockPrisma.inventory.aggregate.mockResolvedValue({
      _sum: { quantity: 30, reservedQty: 0 },
    });
    mockPrisma.salesOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      orderNumber: 'SO-001',
      customerId: 'c-1',
      shipments: [],
    });
    mockPrisma.shipment.create.mockRejectedValue(new Error('DB error'));

    const result = await processBackorders('u-1');

    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('getBackorderSummary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return summary grouped by customer', async () => {
    mockPrisma.salesOrderLine.findMany.mockResolvedValue([
      {
        orderId: 'so-1',
        lineNumber: 1,
        productId: 'prod-1',
        quantity: 100,
        shippedQty: 50,
        order: { orderNumber: 'SO-001' },
        product: { name: 'Widget', sku: 'WDG-001' },
      },
    ]);
    mockPrisma.part.findFirst.mockResolvedValue(null);
    mockPrisma.purchaseOrderLine.findFirst.mockResolvedValue(null);
    mockPrisma.salesOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      customerId: 'c-1',
      customer: { id: 'c-1', name: 'Customer A' },
    });
    mockPrisma.salesOrderLine.findFirst.mockResolvedValue({
      unitPrice: 10,
    });

    const summary = await getBackorderSummary();

    expect(summary.totalBackorderLines).toBe(1);
    expect(summary.totalBackorderQty).toBe(50);
    expect(summary.byCustomer).toHaveLength(1);
    expect(summary.byCustomer[0].customerName).toBe('Customer A');
    expect(summary.byCustomer[0].backorderValue).toBe(500);
  });

  it('should return empty summary when no backorders', async () => {
    mockPrisma.salesOrderLine.findMany.mockResolvedValue([]);

    const summary = await getBackorderSummary();

    expect(summary.totalBackorderLines).toBe(0);
    expect(summary.totalBackorderQty).toBe(0);
    expect(summary.byCustomer).toHaveLength(0);
  });
});
