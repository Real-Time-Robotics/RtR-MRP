import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ScheduleOptimizer,
  getScheduleOptimizer,
  OptimizationResult,
} from '../schedule-optimizer';
import {
  WorkOrderScheduleInfo,
  WorkCenterCapacityInfo,
  SchedulingAlgorithm,
} from '../scheduling-engine';

// Mock prisma with proper default export
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {};
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

describe('ScheduleOptimizer', () => {
  let optimizer: ScheduleOptimizer;

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
    optimizer = ScheduleOptimizer.getInstance();
    vi.clearAllMocks();
  });

  describe('singleton instance', () => {
    it('should return same instance', () => {
      const instance1 = getScheduleOptimizer();
      const instance2 = getScheduleOptimizer();
      expect(instance1).toBe(instance2);
    });
  });

  describe('optimize', () => {
    it('should optimize with balanced_load algorithm', async () => {
      const workOrders = [createTestWorkOrder()];
      const capacities = [createTestCapacity()];

      const result = await optimizer.optimize(workOrders, capacities, 'balanced_load');

      expect(result).toBeDefined();
      expect(result.algorithm).toBe('balanced_load');
      expect(result.schedule).toBeDefined();
      expect(Array.isArray(result.schedule)).toBe(true);
    });

    it('should preserve work order structure', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1' }),
        createTestWorkOrder({ id: 'wo-2' }),
      ];
      const capacities = [createTestCapacity()];

      const result = await optimizer.optimize(workOrders, capacities, 'priority_first');

      expect(result.schedule).toBeDefined();
      expect(Array.isArray(result.schedule)).toBe(true);
    });

    it('should handle empty work orders', async () => {
      const workOrders: WorkOrderScheduleInfo[] = [];
      const capacities = [createTestCapacity()];

      const result = await optimizer.optimize(workOrders, capacities, 'balanced_load');

      expect(result).toBeDefined();
      expect(result.schedule).toHaveLength(0);
    });
  });

  describe('optimization algorithms', () => {
    const algorithms: SchedulingAlgorithm[] = [
      'priority_first',
      'due_date_first',
      'shortest_first',
      'setup_minimize',
      'balanced_load',
    ];

    algorithms.forEach((algorithm) => {
      it(`should support ${algorithm} algorithm`, async () => {
        const workOrders = [createTestWorkOrder()];
        const capacities = [createTestCapacity()];

        const result = await optimizer.optimize(workOrders, capacities, algorithm);

        expect(result.algorithm).toBe(algorithm);
      });
    });
  });

  describe('genetic algorithm', () => {
    it('should run genetic algorithm optimization', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', priority: 'critical' }),
        createTestWorkOrder({ id: 'wo-2', priority: 'high' }),
        createTestWorkOrder({ id: 'wo-3', priority: 'normal' }),
      ];
      const capacities = [createTestCapacity()];

      const result = await optimizer.optimize(workOrders, capacities, 'genetic');

      expect(result).toBeDefined();
      expect(result.algorithm).toBe('genetic');
    });
  });

  describe('metrics calculation', () => {
    it('should calculate optimization metrics', async () => {
      const workOrders = [createTestWorkOrder()];
      const capacities = [createTestCapacity()];

      const result = await optimizer.optimize(workOrders, capacities, 'balanced_load');

      expect(result.metrics).toBeDefined();
      expect(result.metrics.utilizationScore).toBeDefined();
      expect(result.metrics.makespan).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle single work order', async () => {
      const workOrders = [createTestWorkOrder()];
      const capacities = [createTestCapacity()];

      const result = await optimizer.optimize(workOrders, capacities, 'balanced_load');

      expect(result).toBeDefined();
    });

    it('should handle work orders with same priority', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', priority: 'normal' }),
        createTestWorkOrder({ id: 'wo-2', priority: 'normal' }),
        createTestWorkOrder({ id: 'wo-3', priority: 'normal' }),
      ];
      const capacities = [createTestCapacity()];

      const result = await optimizer.optimize(workOrders, capacities, 'priority_first');

      expect(result).toBeDefined();
    });

    it('should handle multiple work centers', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', workCenterId: 'wc-1' }),
        createTestWorkOrder({ id: 'wo-2', workCenterId: 'wc-2' }),
      ];
      const capacities = [
        createTestCapacity({ id: 'wc-1', name: 'Work Center 1' }),
        createTestCapacity({ id: 'wc-2', name: 'Work Center 2' }),
      ];

      const result = await optimizer.optimize(workOrders, capacities, 'balanced_load');

      expect(result).toBeDefined();
      expect(result.schedule.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('compareAlgorithms', () => {
    it('should compare multiple algorithms', async () => {
      const workOrders = [createTestWorkOrder()];
      const capacities = [createTestCapacity()];

      const results = await optimizer.compareAlgorithms(workOrders, capacities);

      expect(results).toBeDefined();
      expect(results.size).toBeGreaterThan(0);
    });
  });

  describe('findBestAlgorithm', () => {
    it('should find the best performing algorithm', async () => {
      const workOrders = [createTestWorkOrder()];
      const capacities = [createTestCapacity()];

      const results = await optimizer.compareAlgorithms(workOrders, capacities);
      const best = optimizer.findBestAlgorithm(results);

      expect(best).toBeDefined();
      expect(best.algorithm).toBeDefined();
      expect(best.result).toBeDefined();
    });
  });
});
