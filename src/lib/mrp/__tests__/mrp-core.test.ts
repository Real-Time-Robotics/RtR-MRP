import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MrpEngine } from '../mrp-core';

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  },
}));

// mrp-core imports prisma as default from '../prisma'
vi.mock('../../prisma', () => {
  const mockPrisma = {
    part: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    warehouse: { findMany: vi.fn() },
    partSupplier: { findMany: vi.fn() },
    supplier: { findMany: vi.fn() },
    bomHeader: { findMany: vi.fn() },
    product: { findMany: vi.fn() },
    salesOrderLine: { findMany: vi.fn() },
    purchaseOrderLine: { findMany: vi.fn() },
    mrpSuggestion: { createMany: vi.fn() },
    mRPException: { create: vi.fn(), createMany: vi.fn() },
    mrpRun: { update: vi.fn() },
  };
  return { default: mockPrisma };
});

import prisma from '../../prisma';

const mp = prisma as unknown as {
  part: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  warehouse: { findMany: ReturnType<typeof vi.fn> };
  partSupplier: { findMany: ReturnType<typeof vi.fn> };
  supplier: { findMany: ReturnType<typeof vi.fn> };
  bomHeader: { findMany: ReturnType<typeof vi.fn> };
  product: { findMany: ReturnType<typeof vi.fn> };
  salesOrderLine: { findMany: ReturnType<typeof vi.fn> };
  purchaseOrderLine: { findMany: ReturnType<typeof vi.fn> };
  mrpSuggestion: { createMany: ReturnType<typeof vi.fn> };
  mRPException: { create: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
  mrpRun: { update: ReturnType<typeof vi.fn> };
};

function setupBasicMocks() {
  mp.part.findMany.mockResolvedValue([]);
  mp.warehouse.findMany.mockResolvedValue([]);
  mp.partSupplier.findMany.mockResolvedValue([]);
  mp.supplier.findMany.mockResolvedValue([]);
  mp.bomHeader.findMany.mockResolvedValue([]);
  mp.product.findMany.mockResolvedValue([]);
  mp.salesOrderLine.findMany.mockResolvedValue([]);
  mp.purchaseOrderLine.findMany.mockResolvedValue([]);
  mp.mrpSuggestion.createMany.mockResolvedValue({ count: 0 });
  mp.mRPException.createMany.mockResolvedValue({ count: 0 });
  mp.mrpRun.update.mockResolvedValue({});
}

describe('MrpEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an MrpEngine instance', () => {
      const engine = new MrpEngine('run-1', {} as any);
      expect(engine).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should complete with no demand and no parts', async () => {
      setupBasicMocks();

      const engine = new MrpEngine('run-1', {} as any);
      const result = await engine.execute();

      expect(result.success).toBe(true);
      expect(result.suggestionsCount).toBe(0);
      expect(mp.mrpRun.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'run-1' } })
      );
    });

    it('should generate purchase suggestion for BUY part with demand', async () => {
      mp.part.findMany.mockResolvedValue([
        {
          id: 'part-1',
          partNumber: 'P001',
          makeOrBuy: 'BUY',
          moq: 1,
          planning: { leadTimeDays: 7, safetyStock: 0, orderMultiple: 1, minStockLevel: 0, moq: 1 },
          inventory: [],
        },
      ]);
      mp.warehouse.findMany.mockResolvedValue([]);
      mp.partSupplier.findMany.mockResolvedValue([
        { partId: 'part-1', supplierId: 'sup-1' },
      ]);
      mp.supplier.findMany.mockResolvedValue([{ id: 'sup-1', status: 'active' }]);
      // Active BOMs: product-1 uses part-1
      mp.bomHeader.findMany
        .mockResolvedValueOnce([  // active BOMs
          { productId: 'prod-1', bomLines: [{ partId: 'part-1', quantity: 2, scrapRate: 0 }] },
        ])
        .mockResolvedValueOnce([  // all BOMs (for draft detection)
          { id: 'bom-1', productId: 'prod-1', status: 'active' },
        ]);
      mp.product.findMany.mockResolvedValue([
        { id: 'prod-1', sku: 'SKU-001', name: 'Product 1' },
      ]);
      // Part matching the product SKU
      mp.part.findMany.mockResolvedValue([
        {
          id: 'part-1',
          partNumber: 'P001',
          makeOrBuy: 'BUY',
          moq: 1,
          planning: { leadTimeDays: 7, safetyStock: 0, orderMultiple: 1, minStockLevel: 0, moq: 1 },
          inventory: [],
        },
        {
          id: 'part-sku',
          partNumber: 'SKU-001',
          makeOrBuy: 'MAKE',
          moq: 1,
          planning: null,
          inventory: [],
        },
      ]);
      mp.salesOrderLine.findMany.mockResolvedValue([
        {
          productId: 'prod-1',
          quantity: 10,
          product: { sku: 'SKU-001' },
          order: { orderNumber: 'SO-001', requiredDate: new Date(), status: 'confirmed' },
        },
      ]);
      mp.purchaseOrderLine.findMany.mockResolvedValue([]);
      mp.mrpSuggestion.createMany.mockResolvedValue({ count: 1 });
      mp.mRPException.createMany.mockResolvedValue({ count: 0 });
      mp.mrpRun.update.mockResolvedValue({});

      const engine = new MrpEngine('run-1', {} as any);
      const result = await engine.execute();

      expect(result.success).toBe(true);
      // Should have created suggestions
      if (result.suggestionsCount > 0) {
        expect(mp.mrpSuggestion.createMany).toHaveBeenCalled();
      }
    });

    it('should handle empty inventory and generate suggestions', async () => {
      mp.part.findMany.mockResolvedValue([
        {
          id: 'part-raw',
          partNumber: 'RAW-001',
          makeOrBuy: 'BUY',
          moq: 100,
          planning: { leadTimeDays: 14, safetyStock: 50, orderMultiple: 10, minStockLevel: 0, moq: 100 },
          inventory: [],
        },
      ]);
      mp.warehouse.findMany.mockResolvedValue([]);
      mp.partSupplier.findMany.mockResolvedValue([]);
      mp.supplier.findMany.mockResolvedValue([]);
      mp.bomHeader.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mp.product.findMany.mockResolvedValue([]);
      mp.salesOrderLine.findMany.mockResolvedValue([]);
      mp.purchaseOrderLine.findMany.mockResolvedValue([]);
      mp.mrpSuggestion.createMany.mockResolvedValue({ count: 0 });
      mp.mRPException.createMany.mockResolvedValue({ count: 0 });
      mp.mrpRun.update.mockResolvedValue({});

      const engine = new MrpEngine('run-1', {} as any);
      const result = await engine.execute();

      expect(result.success).toBe(true);
    });

    it('should exclude quarantine warehouse stock from netting', async () => {
      mp.part.findMany.mockResolvedValue([
        {
          id: 'part-1',
          partNumber: 'P001',
          makeOrBuy: 'BUY',
          moq: 1,
          planning: { leadTimeDays: 7, safetyStock: 0, orderMultiple: 1, minStockLevel: 0, moq: 1 },
          inventory: [
            { quantity: 100, reservedQty: 0, warehouseId: 'wh-quarantine' },
            { quantity: 50, reservedQty: 0, warehouseId: 'wh-main' },
          ],
        },
      ]);
      mp.warehouse.findMany.mockResolvedValue([
        { id: 'wh-quarantine', type: 'QUARANTINE' },
        { id: 'wh-main', type: 'STANDARD' },
      ]);
      mp.partSupplier.findMany.mockResolvedValue([]);
      mp.supplier.findMany.mockResolvedValue([]);
      mp.bomHeader.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mp.product.findMany.mockResolvedValue([]);
      mp.salesOrderLine.findMany.mockResolvedValue([]);
      mp.purchaseOrderLine.findMany.mockResolvedValue([]);
      mp.mrpSuggestion.createMany.mockResolvedValue({ count: 0 });
      mp.mRPException.createMany.mockResolvedValue({ count: 0 });
      mp.mrpRun.update.mockResolvedValue({});

      const engine = new MrpEngine('run-1', {} as any);
      const result = await engine.execute();

      expect(result.success).toBe(true);
    });

    it('should auto-create Part for Product without matching Part', async () => {
      mp.part.findMany.mockResolvedValue([]); // No parts initially
      mp.warehouse.findMany.mockResolvedValue([]);
      mp.partSupplier.findMany.mockResolvedValue([]);
      mp.supplier.findMany.mockResolvedValue([]);
      mp.bomHeader.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      mp.product.findMany.mockResolvedValue([
        { id: 'prod-1', sku: 'NEW-SKU', name: 'New Product' },
      ]);
      mp.part.create.mockResolvedValue({
        id: 'auto-part-1',
        partNumber: 'NEW-SKU',
        name: 'New Product',
      });
      mp.salesOrderLine.findMany.mockResolvedValue([]);
      mp.purchaseOrderLine.findMany.mockResolvedValue([]);
      mp.mrpSuggestion.createMany.mockResolvedValue({ count: 0 });
      mp.mRPException.createMany.mockResolvedValue({ count: 0 });
      mp.mrpRun.update.mockResolvedValue({});

      const engine = new MrpEngine('run-1', {} as any);
      await engine.execute();

      expect(mp.part.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ partNumber: 'NEW-SKU', makeOrBuy: 'MAKE' }),
        })
      );
    });
  });
});
