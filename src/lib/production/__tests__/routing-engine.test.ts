import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateRoutingNumber,
  calculateRoutingTotals,
  createWorkOrderOperations,
  copyRouting,
  activateRouting,
  getActiveRouting,
  validateRouting,
} from '../routing-engine';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    routing: {
      count: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    routingOperation: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    workOrderOperation: {
      create: vi.fn(),
    },
  },
}));

describe('routing-engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateRoutingNumber', () => {
    it('should generate routing number with current year and padded count', async () => {
      (prisma.routing.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);

      const result = await generateRoutingNumber();
      const year = new Date().getFullYear();

      expect(result).toBe(`RT-${year}-0006`);
      expect(prisma.routing.count).toHaveBeenCalledWith({
        where: { routingNumber: { startsWith: `RT-${year}` } },
      });
    });

    it('should start at 0001 when no existing routings', async () => {
      (prisma.routing.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await generateRoutingNumber();
      const year = new Date().getFullYear();

      expect(result).toBe(`RT-${year}-0001`);
    });
  });

  describe('calculateRoutingTotals', () => {
    it('should calculate totals from routing operations', async () => {
      (prisma.routingOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          setupTime: 30,
          runTimePerUnit: 10,
          laborTimePerUnit: 12,
          workCenter: { hourlyRate: 100, setupCostPerHour: 120, overheadRate: 20 },
        },
        {
          setupTime: 15,
          runTimePerUnit: 5,
          laborTimePerUnit: null,
          workCenter: { hourlyRate: 80, setupCostPerHour: null, overheadRate: 10 },
        },
      ]);

      const result = await calculateRoutingTotals('routing-1');

      expect(result.totalSetupTime).toBe(45);
      expect(result.totalRunTime).toBe(15);
      expect(result.totalLaborTime).toBe(17); // 12 + 5 (fallback to runTimePerUnit)
      expect(typeof result.totalCost).toBe('number');
      expect(result.totalCost).toBeGreaterThan(0);
    });

    it('should handle zero overhead rate', async () => {
      (prisma.routingOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          setupTime: 60,
          runTimePerUnit: 20,
          laborTimePerUnit: 20,
          workCenter: { hourlyRate: 100, setupCostPerHour: 100, overheadRate: 0 },
        },
      ]);

      const result = await calculateRoutingTotals('routing-1');

      // setupCost = (60/60)*100 = 100, runCost = (20/60)*100 = 33.33, overhead = 0
      expect(result.totalCost).toBeCloseTo(133.33, 1);
    });

    it('should return zeros when no operations', async () => {
      (prisma.routingOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await calculateRoutingTotals('routing-1');

      expect(result.totalSetupTime).toBe(0);
      expect(result.totalRunTime).toBe(0);
      expect(result.totalLaborTime).toBe(0);
      expect(result.totalCost).toBe(0);
    });
  });

  describe('createWorkOrderOperations', () => {
    it('should create operations from routing', async () => {
      (prisma.routing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'routing-1',
        operations: [
          {
            id: 'op-1',
            operationNumber: 10,
            name: 'Cut',
            workCenterId: 'wc-1',
            setupTime: 30,
            runTimePerUnit: 5,
          },
          {
            id: 'op-2',
            operationNumber: 20,
            name: 'Weld',
            workCenterId: 'wc-2',
            setupTime: 15,
            runTimePerUnit: 10,
          },
        ],
      });

      await createWorkOrderOperations('wo-1', 'routing-1', 100);

      expect(prisma.workOrderOperation.create).toHaveBeenCalledTimes(2);
      expect(prisma.workOrderOperation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workOrderId: 'wo-1',
          routingOperationId: 'op-1',
          operationNumber: 10,
          name: 'Cut',
          workCenterId: 'wc-1',
          plannedSetupTime: 30,
          plannedRunTime: 500, // 5 * 100
          quantityPlanned: 100,
          status: 'pending',
        }),
      });
    });

    it('should throw when routing not found', async () => {
      (prisma.routing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        createWorkOrderOperations('wo-1', 'bad-id', 100)
      ).rejects.toThrow('Routing not found');
    });
  });

  describe('copyRouting', () => {
    it('should copy routing with new version', async () => {
      const mockRouting = {
        id: 'routing-1',
        name: 'Main Routing',
        description: 'Desc',
        productId: 'prod-1',
        createdBy: 'user-1',
        operations: [
          {
            operationNumber: 10,
            name: 'Cut',
            description: 'Cut desc',
            workCenterId: 'wc-1',
            alternateWorkCenters: null,
            setupTime: 30,
            runTimePerUnit: 5,
            waitTime: 0,
            moveTime: 0,
            laborTimePerUnit: 5,
            operatorsRequired: 1,
            skillRequired: null,
            overlapPercent: 0,
            canRunParallel: false,
            inspectionRequired: false,
            inspectionPlanId: null,
            workInstructions: null,
            toolsRequired: null,
            isSubcontracted: false,
            supplierId: null,
          },
        ],
      };

      (prisma.routing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockRouting);
      (prisma.routing.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.routing.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'routing-2' });
      (prisma.routingOperation.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const newId = await copyRouting('routing-1', 2);

      expect(newId).toBe('routing-2');
      expect(prisma.routing.create).toHaveBeenCalledTimes(1);
      expect(prisma.routingOperation.create).toHaveBeenCalledTimes(1);
    });

    it('should throw when routing not found', async () => {
      (prisma.routing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(copyRouting('bad-id')).rejects.toThrow('Routing not found');
    });

    it('should auto-increment version when not specified', async () => {
      const mockRouting = {
        id: 'routing-1',
        name: 'Main',
        description: null,
        productId: 'prod-1',
        createdBy: 'user-1',
        operations: [],
      };

      (prisma.routing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockRouting);
      (prisma.routing.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ version: 3 }]);
      (prisma.routing.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.routing.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'routing-new' });

      await copyRouting('routing-1');

      expect(prisma.routing.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 4 }),
        })
      );
    });
  });

  describe('activateRouting', () => {
    it('should deactivate current and activate new routing', async () => {
      (prisma.routing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'routing-1',
        productId: 'prod-1',
      });
      (prisma.routing.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
      (prisma.routingOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.routing.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await activateRouting('routing-1');

      expect(prisma.routing.updateMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1', status: 'active' },
        data: expect.objectContaining({ status: 'obsolete' }),
      });
      expect(prisma.routing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'routing-1' },
          data: expect.objectContaining({ status: 'active' }),
        })
      );
    });

    it('should throw when routing not found', async () => {
      (prisma.routing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(activateRouting('bad-id')).rejects.toThrow('Routing not found');
    });
  });

  describe('getActiveRouting', () => {
    it('should find active routing for product', async () => {
      const mockRouting = { id: 'routing-1', status: 'active', operations: [] };
      (prisma.routing.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockRouting);

      const result = await getActiveRouting('prod-1');

      expect(result).toEqual(mockRouting);
      expect(prisma.routing.findFirst).toHaveBeenCalledWith({
        where: { productId: 'prod-1', status: 'active' },
        include: {
          operations: {
            orderBy: { operationNumber: 'asc' },
            include: { workCenter: true },
          },
        },
      });
    });
  });

  describe('validateRouting', () => {
    it('should return valid for correct routing', async () => {
      (prisma.routing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'routing-1',
        operations: [
          {
            operationNumber: 10,
            runTimePerUnit: 5,
            inspectionRequired: false,
            inspectionPlanId: null,
            workCenter: { status: 'active', name: 'WC-1' },
          },
        ],
      });

      const result = await validateRouting('routing-1');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for routing not found', async () => {
      (prisma.routing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await validateRouting('bad-id');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Routing not found');
    });

    it('should return errors for empty operations', async () => {
      (prisma.routing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'routing-1',
        operations: [],
      });

      const result = await validateRouting('routing-1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Routing has no operations');
    });

    it('should return errors for duplicate operation numbers', async () => {
      (prisma.routing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'routing-1',
        operations: [
          {
            operationNumber: 10,
            runTimePerUnit: 5,
            inspectionRequired: false,
            workCenter: { status: 'active', name: 'WC-1' },
          },
          {
            operationNumber: 10,
            runTimePerUnit: 3,
            inspectionRequired: false,
            workCenter: { status: 'active', name: 'WC-2' },
          },
        ],
      });

      const result = await validateRouting('routing-1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate operation numbers found');
    });

    it('should warn for inactive work center', async () => {
      (prisma.routing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'routing-1',
        operations: [
          {
            operationNumber: 10,
            runTimePerUnit: 5,
            inspectionRequired: false,
            workCenter: { status: 'inactive', name: 'WC-Offline' },
          },
        ],
      });

      const result = await validateRouting('routing-1');

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('not active');
    });

    it('should error for zero run time', async () => {
      (prisma.routing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'routing-1',
        operations: [
          {
            operationNumber: 10,
            runTimePerUnit: 0,
            inspectionRequired: false,
            workCenter: { status: 'active', name: 'WC-1' },
          },
        ],
      });

      const result = await validateRouting('routing-1');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Run time'))).toBe(true);
    });

    it('should error for missing work center', async () => {
      (prisma.routing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'routing-1',
        operations: [
          {
            operationNumber: 10,
            runTimePerUnit: 5,
            inspectionRequired: false,
            workCenter: null,
          },
        ],
      });

      const result = await validateRouting('routing-1');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Work center not found'))).toBe(true);
    });

    it('should warn for inspection required without plan', async () => {
      (prisma.routing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'routing-1',
        operations: [
          {
            operationNumber: 10,
            runTimePerUnit: 5,
            inspectionRequired: true,
            inspectionPlanId: null,
            workCenter: { status: 'active', name: 'WC-1' },
          },
        ],
      });

      const result = await validateRouting('routing-1');

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('Inspection required'))).toBe(true);
    });
  });
});
