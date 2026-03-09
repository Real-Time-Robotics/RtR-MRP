import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    part: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    bomLine: {
      findMany: vi.fn(),
    },
    partCostRollup: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  rollupPartCost,
  saveRollupResults,
  getPartCostRollup,
  runFullCostRollup,
  markRollupStale,
  getRollupStatus,
} from '../cost-rollup';

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// TESTS
// =============================================================================

describe('cost-rollup', () => {
  describe('rollupPartCost', () => {
    it('should throw for circular BOM reference', async () => {
      const visited = new Set(['part-1']);

      await expect(rollupPartCost('part-1', visited)).rejects.toThrow(
        'Circular BOM reference detected for part part-1'
      );
    });

    it('should throw when part is not found', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue(null as never);

      await expect(rollupPartCost('nonexistent')).rejects.toThrow(
        'Part not found: nonexistent'
      );
    });

    it('should calculate costs for a leaf part (no BOM)', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-001',
        costs: [
          {
            standardCost: 10.0,
            unitCost: 8.0,
            overheadPercent: 15,
          },
        ],
      } as never);

      vi.mocked(prisma.bomLine.findMany).mockResolvedValue([] as never);

      const result = await rollupPartCost('part-1');

      expect(result.partId).toBe('part-1');
      expect(result.partNumber).toBe('PN-001');
      expect(result.bomLevel).toBe(0);
      expect(result.children).toEqual([]);
      // materialCost = standardCost = 10
      expect(result.costs.materialCost).toBe(10.0);
      // overheadCost = 10 * 15/100 = 1.5
      expect(result.costs.overheadCost).toBe(1.5);
      // totalCost = 10 + 0 + 1.5 + 0 + 0
      expect(result.costs.totalCost).toBe(11.5);
    });

    it('should use unitCost when standardCost is not available', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-001',
        costs: [
          {
            standardCost: 0,
            unitCost: 5.0,
            overheadPercent: null,
          },
        ],
      } as never);

      vi.mocked(prisma.bomLine.findMany).mockResolvedValue([] as never);

      const result = await rollupPartCost('part-1');

      expect(result.costs.materialCost).toBe(5.0);
      expect(result.costs.overheadCost).toBe(0);
      expect(result.costs.totalCost).toBe(5.0);
    });

    it('should handle part with no costs', async () => {
      vi.mocked(prisma.part.findUnique).mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-001',
        costs: [],
      } as never);

      vi.mocked(prisma.bomLine.findMany).mockResolvedValue([] as never);

      const result = await rollupPartCost('part-1');

      expect(result.costs.materialCost).toBe(0);
      expect(result.costs.totalCost).toBe(0);
    });

    it('should roll up costs from child components with quantities', async () => {
      // Parent part
      vi.mocked(prisma.part.findUnique)
        .mockResolvedValueOnce({
          id: 'assembly-1',
          partNumber: 'ASM-001',
          costs: [],
        } as never)
        // Child part
        .mockResolvedValueOnce({
          id: 'comp-1',
          partNumber: 'COMP-001',
          costs: [{ standardCost: 5.0, unitCost: 5.0, overheadPercent: null }],
        } as never);

      // Assembly has one BOM line
      vi.mocked(prisma.bomLine.findMany)
        .mockResolvedValueOnce([
          { partId: 'comp-1', quantity: 3, part: { id: 'comp-1' } },
        ] as never)
        // Component has no children
        .mockResolvedValueOnce([] as never);

      const result = await rollupPartCost('assembly-1');

      expect(result.bomLevel).toBe(1);
      expect(result.children).toHaveLength(1);
      // Component cost: 5.0 * 3 = 15.0
      expect(result.costs.materialCost).toBe(15.0);
      expect(result.costs.totalCost).toBe(15.0);
    });
  });

  describe('saveRollupResults', () => {
    it('should upsert rollup result to database', async () => {
      vi.mocked(prisma.partCostRollup.upsert).mockResolvedValue({} as never);

      await saveRollupResults({
        partId: 'part-1',
        partNumber: 'PN-001',
        bomLevel: 0,
        costs: {
          materialCost: 10,
          laborCost: 2,
          overheadCost: 1.5,
          subcontractCost: 0,
          otherCost: 0,
          totalCost: 13.5,
        },
        children: [],
      });

      expect(prisma.partCostRollup.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { partId: 'part-1' },
          update: expect.objectContaining({
            materialCost: 10,
            totalStandardCost: 13.5,
            bomLevel: 0,
            rollupStatus: 'CURRENT',
          }),
          create: expect.objectContaining({
            partId: 'part-1',
            materialCost: 10,
            totalStandardCost: 13.5,
          }),
        })
      );
    });

    it('should recursively save children', async () => {
      vi.mocked(prisma.partCostRollup.upsert).mockResolvedValue({} as never);

      await saveRollupResults({
        partId: 'assembly-1',
        partNumber: 'ASM-001',
        bomLevel: 1,
        costs: {
          materialCost: 30,
          laborCost: 0,
          overheadCost: 0,
          subcontractCost: 0,
          otherCost: 0,
          totalCost: 30,
        },
        children: [
          {
            partId: 'comp-1',
            partNumber: 'COMP-001',
            bomLevel: 0,
            costs: {
              materialCost: 10,
              laborCost: 0,
              overheadCost: 0,
              subcontractCost: 0,
              otherCost: 0,
              totalCost: 10,
            },
            children: [],
          },
        ],
      });

      // Should be called twice: once for parent, once for child
      expect(prisma.partCostRollup.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPartCostRollup', () => {
    it('should return cached rollup when status is CURRENT', async () => {
      vi.mocked(prisma.partCostRollup.findUnique).mockResolvedValue({
        partId: 'part-1',
        materialCost: 10,
        laborCost: 2,
        overheadCost: 1.5,
        subcontractCost: 0,
        otherCost: 0,
        totalStandardCost: 13.5,
        rollupStatus: 'CURRENT',
      } as never);

      const result = await getPartCostRollup('part-1');

      expect(result).toEqual({
        materialCost: 10,
        laborCost: 2,
        overheadCost: 1.5,
        subcontractCost: 0,
        otherCost: 0,
        totalCost: 13.5,
      });
      // Should not call part.findUnique since cache was used
      expect(prisma.part.findUnique).not.toHaveBeenCalled();
    });

    it('should recalculate when cached rollup is STALE', async () => {
      vi.mocked(prisma.partCostRollup.findUnique).mockResolvedValue({
        rollupStatus: 'STALE',
      } as never);

      vi.mocked(prisma.part.findUnique).mockResolvedValue({
        id: 'part-1',
        partNumber: 'PN-001',
        costs: [{ standardCost: 10, unitCost: 10, overheadPercent: null }],
      } as never);

      vi.mocked(prisma.bomLine.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.partCostRollup.upsert).mockResolvedValue({} as never);

      const result = await getPartCostRollup('part-1');

      expect(result).toBeDefined();
      expect(result?.materialCost).toBe(10);
    });

    it('should return null when recalculation fails', async () => {
      vi.mocked(prisma.partCostRollup.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.part.findUnique).mockResolvedValue(null as never);

      const result = await getPartCostRollup('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('runFullCostRollup', () => {
    it('should process all active parts', async () => {
      vi.mocked(prisma.part.findMany).mockResolvedValue([
        { id: 'part-1', partNumber: 'PN-001', status: 'active' },
        { id: 'part-2', partNumber: 'PN-002', status: 'active' },
      ] as never);

      vi.mocked(prisma.part.findUnique)
        .mockResolvedValueOnce({
          id: 'part-1',
          partNumber: 'PN-001',
          costs: [{ standardCost: 10, unitCost: 10, overheadPercent: null }],
        } as never)
        .mockResolvedValueOnce({
          id: 'part-2',
          partNumber: 'PN-002',
          costs: [{ standardCost: 20, unitCost: 20, overheadPercent: null }],
        } as never);

      vi.mocked(prisma.bomLine.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.partCostRollup.upsert).mockResolvedValue({} as never);
      vi.mocked(prisma.partCostRollup.updateMany).mockResolvedValue({ count: 0 } as never);

      const result = await runFullCostRollup();

      expect(result.processed).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect errors without stopping', async () => {
      vi.mocked(prisma.part.findMany).mockResolvedValue([
        { id: 'part-1', partNumber: 'PN-001', status: 'active' },
        { id: 'part-2', partNumber: 'PN-002', status: 'active' },
      ] as never);

      // First part fails
      vi.mocked(prisma.part.findUnique)
        .mockResolvedValueOnce(null as never)
        .mockResolvedValueOnce({
          id: 'part-2',
          partNumber: 'PN-002',
          costs: [],
        } as never);

      vi.mocked(prisma.bomLine.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.partCostRollup.upsert).mockResolvedValue({} as never);
      vi.mocked(prisma.partCostRollup.updateMany).mockResolvedValue({ count: 0 } as never);

      const result = await runFullCostRollup();

      expect(result.processed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('PN-001');
    });

    it('should mark old rollups as stale', async () => {
      vi.mocked(prisma.part.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.partCostRollup.updateMany).mockResolvedValue({ count: 0 } as never);

      await runFullCostRollup();

      expect(prisma.partCostRollup.updateMany).toHaveBeenCalledWith({
        where: {
          lastRollupAt: {
            lt: expect.any(Date),
          },
        },
        data: {
          rollupStatus: 'STALE',
        },
      });
    });
  });

  describe('markRollupStale', () => {
    it('should mark rollup as stale for given part', async () => {
      vi.mocked(prisma.partCostRollup.updateMany).mockResolvedValue({ count: 1 } as never);

      await markRollupStale('part-1');

      expect(prisma.partCostRollup.updateMany).toHaveBeenCalledWith({
        where: { partId: 'part-1' },
        data: { rollupStatus: 'STALE' },
      });
    });
  });

  describe('getRollupStatus', () => {
    it('should return status summary with counts', async () => {
      vi.mocked(prisma.partCostRollup.count)
        .mockResolvedValueOnce(50 as never)  // current
        .mockResolvedValueOnce(10 as never)  // stale
        .mockResolvedValueOnce(5 as never)   // pending
        .mockResolvedValueOnce(65 as never); // partsWithRollup (total rollup count)

      vi.mocked(prisma.part.count).mockResolvedValue(80 as never);

      const status = await getRollupStatus();

      expect(status).toEqual({
        current: 50,
        stale: 10,
        pending: 5,
        missingCost: 15, // 80 - 65
      });
    });
  });
});
