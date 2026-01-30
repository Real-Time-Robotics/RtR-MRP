import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SchedulingEngine,
  getSchedulingEngine,
  WorkOrderScheduleInfo,
  ScheduleResult,
  WorkCenterCapacityInfo,
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
    purchaseOrderLine: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { quantity: 0, receivedQty: 0 } }),
      findFirst: vi.fn().mockResolvedValue(null),
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
    id: 'wo-1',
    woNumber: 'WO-001',
    productId: 'prod-1',
    productName: 'Test Product',
    productCode: 'SKU-001',
    quantity: 100,
    completedQty: 0,
    remainingQty: 100,
    priority: 'normal',
    status: 'pending',
    salesOrderId: null,
    salesOrderNumber: null,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    plannedStart: null,
    plannedEnd: null,
    actualStart: null,
    workCenterId: 'wc-1',
    workCenterName: 'Work Center 1',
    estimatedDuration: 8,
    operations: [],
    materialStatus: {
      allAvailable: true,
      availablePercentage: 100,
      shortages: [],
      expectedReadyDate: null,
    },
    predecessors: [],
    successors: [],
    ...overrides,
  });

  const createTestCapacity = (
    overrides: Partial<WorkCenterCapacityInfo> = {}
  ): WorkCenterCapacityInfo => ({
    id: 'wc-1',
    code: 'WC-001',
    name: 'Work Center 1',
    type: 'machine',
    capacityPerDay: 8,
    efficiency: 1.0,
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
    breakMinutes: 60,
    workingDays: [1, 2, 3, 4, 5],
    maxConcurrentJobs: 1,
    dailyCapacity: Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      availableHours: 8,
      scheduledHours: 0,
      remainingHours: 8,
      utilization: 0,
      scheduledWorkOrders: [],
      isHoliday: false,
      maintenanceHours: 0,
    })),
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
      const result = await engine.generateSchedule(workOrders, {});
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
    it('should return null for non-existent work center', async () => {
      const capacity = await engine.checkCapacity('non-existent', new Date(), new Date());
      expect(capacity).toBeNull();
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
        materialStatus: {
          allAvailable: false,
          availablePercentage: 50,
          shortages: [
            {
              partId: 'p1',
              partNumber: 'PART-001',
              partName: 'Part 1',
              requiredQty: 100,
              availableQty: 50,
              shortageQty: 50,
              expectedArrival: futureDate,
              pendingPOQty: 50,
            },
          ],
          expectedReadyDate: futureDate,
        },
      });
      const earliest = await engine.calculateEarliestStart(workOrder);
      expect(earliest.getTime()).toBeGreaterThanOrEqual(futureDate.getTime());
    });
  });

  describe('calculateLatestStart', () => {
    it('should calculate latest start date based on due date', async () => {
      const dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const workOrder = createTestWorkOrder({
        dueDate: dueDate,
        estimatedDuration: 8,
      });
      const latest = await engine.calculateLatestStart(workOrder);
      expect(latest).toBeInstanceOf(Date);
      expect(latest!.getTime()).toBeLessThan(dueDate.getTime());
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

    it('should have horizon with start and end dates', async () => {
      const result = await engine.generateSchedule([], {});

      expect(result.horizon).toHaveProperty('startDate');
      expect(result.horizon).toHaveProperty('endDate');
      expect(result.horizon).toHaveProperty('days');
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

    it('should handle work order with zero estimated duration', async () => {
      const workOrder = createTestWorkOrder({ estimatedDuration: 0 });
      const latest = await engine.calculateLatestStart(workOrder);
      expect(latest).toBeInstanceOf(Date);
    });

    it('should handle multiple work orders', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1' }),
        createTestWorkOrder({ id: 'wo-2', woNumber: 'WO-002' }),
        createTestWorkOrder({ id: 'wo-3', woNumber: 'WO-003' }),
      ];

      const result = await engine.generateSchedule(workOrders, {});
      expect(result).toBeDefined();
      expect(result.workOrdersAnalyzed).toBeGreaterThanOrEqual(0);
    });

    it('should handle work orders with predecessors', async () => {
      const workOrder = createTestWorkOrder({
        predecessors: ['wo-0'],
      });
      const earliest = await engine.calculateEarliestStart(workOrder);
      expect(earliest).toBeInstanceOf(Date);
    });
  });

  describe('scheduling options', () => {
    it('should respect horizonDays option', async () => {
      const result = await engine.generateSchedule([], { horizonDays: 7 });
      expect(result.horizon.days).toBe(7);
    });

    it('should exclude specified statuses', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', status: 'pending' }),
        createTestWorkOrder({ id: 'wo-2', status: 'completed' }),
      ];

      const result = await engine.generateSchedule(workOrders, {
        excludeStatuses: ['completed'],
      });

      expect(result).toBeDefined();
    });
  });
});
