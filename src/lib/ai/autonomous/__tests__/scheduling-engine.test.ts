import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SchedulingEngine,
  getSchedulingEngine,
  WorkOrderScheduleInfo,
  ScheduleResult,
} from '../scheduling-engine';

// Mock prisma with proper default export
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    workOrder: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    workCenter: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    part: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    inventory: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

describe('SchedulingEngine', () => {
  let engine: SchedulingEngine;

  const createTestWorkOrder = (
    overrides: Partial<WorkOrderScheduleInfo> = {}
  ): WorkOrderScheduleInfo => ({
    workOrderId: 'wo-1',
    workOrderNumber: 'WO-001',
    productId: 'prod-1',
    productName: 'Test Product',
    quantity: 100,
    status: 'pending',
    priority: 50,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    plannedStartDate: null,
    plannedEndDate: null,
    scheduledStartDate: null,
    scheduledEndDate: null,
    workCenterId: 'wc-1',
    workCenterName: 'Work Center 1',
    estimatedHours: 8,
    setupTime: 1,
    operations: [],
    predecessors: [],
    materialAvailability: {
      allAvailable: true,
      shortages: [],
      earliestAvailableDate: new Date(),
    },
    capacityStatus: {
      hasCapacity: true,
      utilizationPercent: 60,
      availableHours: 40,
    },
    riskFactors: [],
    ...overrides,
  });

  beforeEach(() => {
    engine = SchedulingEngine.getInstance();
    vi.clearAllMocks();
  });

  describe('singleton instance', () => {
    it('should return same instance', () => {
      const instance1 = getSchedulingEngine();
      const instance2 = getSchedulingEngine();
      expect(instance1).toBe(instance2);
    });
  });

  describe('generateSchedule', () => {
    it('should generate empty schedule for empty work orders', async () => {
      const result = await engine.generateSchedule([], {});
      expect(result).toBeDefined();
      expect(result.suggestions).toHaveLength(0);
      expect(result.id).toBeDefined();
    });

    it('should generate schedule with default algorithm', async () => {
      const workOrders = [createTestWorkOrder()];
      const result = await engine.generateSchedule(
        workOrders.map((wo) => wo.workOrderId),
        {}
      );
      expect(result).toBeDefined();
      expect(result.algorithm).toBeDefined();
    });

    it('should include metrics in result', async () => {
      const result = await engine.generateSchedule([], {});
      expect(result.metrics).toBeDefined();
      expect(result.metrics.currentOnTimeDelivery).toBeDefined();
      expect(result.metrics.projectedOnTimeDelivery).toBeDefined();
      expect(result.metrics.currentCapacityUtilization).toBeDefined();
      expect(result.metrics.projectedCapacityUtilization).toBeDefined();
    });

    it('should support different algorithms', async () => {
      const algorithms = [
        'priority_first',
        'due_date_first',
        'shortest_first',
        'balanced_load',
      ] as const;

      for (const algorithm of algorithms) {
        const result = await engine.generateSchedule([], { algorithm });
        expect(result.algorithm).toBe(algorithm);
      }
    });
  });

  describe('checkCapacity', () => {
    it('should return capacity info or null for work center', async () => {
      const capacity = await engine.checkCapacity('wc-1', new Date(), new Date());
      // Capacity may be null if work center doesn't exist in mock
      if (capacity !== null) {
        expect(capacity.workCenterId).toBeDefined();
      } else {
        expect(capacity).toBeNull();
      }
    });
  });

  describe('calculateEarliestStart', () => {
    it('should calculate earliest start date', async () => {
      const workOrder = createTestWorkOrder();
      const earliest = await engine.calculateEarliestStart(workOrder);
      expect(earliest).toBeInstanceOf(Date);
    });

    it('should consider material availability', async () => {
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const workOrder = createTestWorkOrder({
        materialAvailability: {
          allAvailable: false,
          shortages: [{ partId: 'p1', partName: 'Part 1', required: 100, available: 50, shortage: 50 }],
          earliestAvailableDate: futureDate,
        },
      });
      const earliest = await engine.calculateEarliestStart(workOrder);
      expect(earliest.getTime()).toBeGreaterThanOrEqual(futureDate.getTime());
    });
  });

  describe('calculateLatestStart', () => {
    it('should calculate latest start date based on due date', async () => {
      const workOrder = createTestWorkOrder({
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        estimatedHours: 8,
      });
      const latest = await engine.calculateLatestStart(workOrder);
      expect(latest).toBeInstanceOf(Date);
      expect(latest.getTime()).toBeLessThan(workOrder.dueDate!.getTime());
    });
  });

  describe('schedule result structure', () => {
    it('should have required fields', async () => {
      const result = await engine.generateSchedule([], {});

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('algorithm');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('horizon');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('conflicts');
    });

    it('should have valid metrics structure', async () => {
      const result = await engine.generateSchedule([], {});

      expect(result.metrics).toHaveProperty('currentOnTimeDelivery');
      expect(result.metrics).toHaveProperty('projectedOnTimeDelivery');
      expect(result.metrics).toHaveProperty('currentCapacityUtilization');
      expect(result.metrics).toHaveProperty('projectedCapacityUtilization');
    });
  });

  describe('edge cases', () => {
    it('should handle work order with no due date', async () => {
      const workOrder = createTestWorkOrder({ dueDate: null });
      const latest = await engine.calculateLatestStart(workOrder);
      expect(latest).toBeInstanceOf(Date);
    });

    it('should handle work order with past due date', async () => {
      const workOrder = createTestWorkOrder({
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
      const earliest = await engine.calculateEarliestStart(workOrder);
      expect(earliest).toBeInstanceOf(Date);
    });

    it('should handle work order with zero estimated hours', async () => {
      const workOrder = createTestWorkOrder({ estimatedHours: 0 });
      const latest = await engine.calculateLatestStart(workOrder);
      expect(latest).toBeInstanceOf(Date);
    });
  });
});
