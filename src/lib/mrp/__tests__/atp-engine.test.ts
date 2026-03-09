import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateATP,
  checkBatchATP,
  updateATPRecords,
} from '../atp-engine';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    part: { findUnique: vi.fn() },
    purchaseOrderLine: { findMany: vi.fn() },
    plannedOrder: { findMany: vi.fn() },
    salesOrderLine: { findMany: vi.fn() },
    bomLine: { findMany: vi.fn() },
    bomHeader: { findFirst: vi.fn() },
    product: { findFirst: vi.fn() },
    aTPRecord: { deleteMany: vi.fn(), create: vi.fn() },
  },
}));

import { prisma } from '@/lib/prisma';

const mp = prisma as unknown as {
  part: { findUnique: ReturnType<typeof vi.fn> };
  purchaseOrderLine: { findMany: ReturnType<typeof vi.fn> };
  plannedOrder: { findMany: ReturnType<typeof vi.fn> };
  salesOrderLine: { findMany: ReturnType<typeof vi.fn> };
  bomLine: { findMany: ReturnType<typeof vi.fn> };
  bomHeader: { findFirst: ReturnType<typeof vi.fn> };
  product: { findFirst: ReturnType<typeof vi.fn> };
  aTPRecord: { deleteMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
};

function setupDefaultMocks() {
  mp.purchaseOrderLine.findMany.mockResolvedValue([]);
  mp.plannedOrder.findMany.mockResolvedValue([]);
  mp.salesOrderLine.findMany.mockResolvedValue([]);
  mp.bomLine.findMany.mockResolvedValue([]);
  mp.bomHeader.findFirst.mockResolvedValue(null);
  mp.product.findFirst.mockResolvedValue(null);
}

describe('ATP Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateATP', () => {
    it('should throw if part not found', async () => {
      mp.part.findUnique.mockResolvedValue(null);
      await expect(calculateATP('bad', 10, new Date())).rejects.toThrow('Part not found');
    });

    it('should return ATP from current inventory when sufficient', async () => {
      mp.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'P001',
        inventory: [
          { quantity: 100, reservedQty: 20 }, // available = 80
        ],
      });
      setupDefaultMocks();
      // For CTP: part lookup
      mp.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'P001',
        inventory: [{ quantity: 100, reservedQty: 20 }],
      });

      const result = await calculateATP('part-1', 50, new Date());

      expect(result.partId).toBe('part-1');
      expect(result.partNumber).toBe('P001');
      expect(result.requestedQty).toBe(50);
      expect(result.atpQty).toBe(50); // 80 available >= 50 requested
      expect(result.atpDate).toBeDefined();
      expect(result.grid).toBeDefined();
      expect(result.grid.length).toBeGreaterThan(0);
    });

    it('should return 0 ATP when inventory is insufficient and no supply', async () => {
      mp.part.findUnique
        .mockResolvedValueOnce({
          id: 'part-1',
          partNumber: 'P001',
          inventory: [
            { quantity: 10, reservedQty: 5 }, // available = 5
          ],
        })
        // CTP calls findUnique for part
        .mockResolvedValueOnce({
          id: 'part-1',
          partNumber: 'P001',
        });
      setupDefaultMocks();

      const result = await calculateATP('part-1', 50, new Date());

      // Only 5 available, no supply coming, ATP should be 0
      expect(result.atpQty).toBe(0);
      expect(result.atpDate).toBeNull();
    });

    it('should calculate CTP when ATP insufficient', async () => {
      mp.part.findUnique
        .mockResolvedValueOnce({
          id: 'part-1',
          partNumber: 'P001',
          inventory: [{ quantity: 5, reservedQty: 0 }], // only 5 available
        })
        .mockResolvedValueOnce({
          id: 'part-1',
          partNumber: 'P001',
        });
      setupDefaultMocks();
      // CTP: BOM lookup
      mp.bomHeader.findFirst.mockResolvedValue({
        bomLines: [
          {
            partId: 'comp-1',
            quantity: 2,
            part: {
              partNumber: 'COMP-001',
              inventory: [{ quantity: 100, reservedQty: 0 }],
            },
          },
        ],
      });
      mp.product.findFirst.mockResolvedValue({
        assemblyHours: 2,
        testingHours: 1,
      });

      const result = await calculateATP('part-1', 50, new Date());

      // CTP should be calculated since ATP < requested
      expect(result.ctpDetails).toBeDefined();
      if (result.ctpDetails?.canProduce) {
        expect(result.ctpQty).toBeGreaterThan(0);
        expect(result.ctpDate).toBeDefined();
      }
    });

    it('should include grid buckets in result', async () => {
      mp.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'P001',
        inventory: [{ quantity: 100, reservedQty: 0 }],
      });
      setupDefaultMocks();

      const result = await calculateATP('part-1', 10, new Date(), undefined, 28);

      expect(result.grid).toBeDefined();
      expect(result.grid.length).toBe(4); // 28 days / 7 = 4 weeks
      expect(result.grid[0].beginningQty).toBe(100);
    });

    it('should factor in supply from POs', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      mp.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'P001',
        inventory: [{ quantity: 10, reservedQty: 0 }], // only 10 on hand
      });
      mp.purchaseOrderLine.findMany.mockResolvedValue([
        {
          partId: 'part-1',
          quantity: 100,
          receivedQty: 0,
          po: { expectedDate: futureDate, status: 'approved' },
        },
      ]);
      mp.plannedOrder.findMany.mockResolvedValue([]);
      mp.salesOrderLine.findMany.mockResolvedValue([]);
      mp.bomLine.findMany.mockResolvedValue([]);

      const result = await calculateATP('part-1', 50, new Date());

      // With 10 on hand and 100 on PO, cumulative should exceed 50
      expect(result.atpQty).toBe(50);
    });
  });

  describe('checkBatchATP', () => {
    it('should check ATP for multiple items', async () => {
      mp.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'P001',
        inventory: [{ quantity: 100, reservedQty: 0 }],
      });
      setupDefaultMocks();

      const results = await checkBatchATP([
        { partId: 'part-1', quantity: 10, requiredDate: new Date() },
        { partId: 'part-1', quantity: 200, requiredDate: new Date() },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].partId).toBe('part-1');
      expect(results[0].available).toBe(true); // 100 >= 10
      expect(results[1].available).toBe(false); // 100 < 200
    });

    it('should return empty array for empty input', async () => {
      const results = await checkBatchATP([]);
      expect(results).toEqual([]);
    });
  });

  describe('updateATPRecords', () => {
    it('should delete existing records and create new ones', async () => {
      mp.aTPRecord.deleteMany.mockResolvedValue({ count: 5 });
      mp.aTPRecord.create.mockResolvedValue({});

      const grid = [
        {
          periodStart: new Date('2026-03-01'),
          periodEnd: new Date('2026-03-07'),
          beginningQty: 100,
          supplyQty: 0,
          demandQty: 20,
          atpQty: 80,
          cumulativeATP: 80,
        },
        {
          periodStart: new Date('2026-03-08'),
          periodEnd: new Date('2026-03-14'),
          beginningQty: 80,
          supplyQty: 50,
          demandQty: 10,
          atpQty: 120,
          cumulativeATP: 120,
        },
      ];

      await updateATPRecords('part-1', grid);

      expect(mp.aTPRecord.deleteMany).toHaveBeenCalledWith({
        where: { partId: 'part-1', siteId: null },
      });
      expect(mp.aTPRecord.create).toHaveBeenCalledTimes(2);
    });

    it('should pass siteId to delete and create', async () => {
      mp.aTPRecord.deleteMany.mockResolvedValue({ count: 0 });
      mp.aTPRecord.create.mockResolvedValue({});

      await updateATPRecords('part-1', [
        {
          periodStart: new Date(),
          periodEnd: new Date(),
          beginningQty: 0,
          supplyQty: 0,
          demandQty: 0,
          atpQty: 0,
          cumulativeATP: 0,
        },
      ], 'site-1');

      expect(mp.aTPRecord.deleteMany).toHaveBeenCalledWith({
        where: { partId: 'part-1', siteId: 'site-1' },
      });
      const createData = mp.aTPRecord.create.mock.calls[0][0].data;
      expect(createData.siteId).toBe('site-1');
    });

    it('should handle empty grid', async () => {
      mp.aTPRecord.deleteMany.mockResolvedValue({ count: 0 });

      await updateATPRecords('part-1', []);

      expect(mp.aTPRecord.deleteMany).toHaveBeenCalled();
      expect(mp.aTPRecord.create).not.toHaveBeenCalled();
    });
  });
});
