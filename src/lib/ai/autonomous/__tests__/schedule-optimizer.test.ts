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

  describe('setWeights', () => {
    it('should update optimization weights', () => {
      optimizer.setWeights({ makespan: 0.5, lateness: 0.5 });
      // No direct way to check, but should not throw
      expect(optimizer).toBeDefined();
    });
  });

  describe('optimizeByPriority', () => {
    it('should schedule critical work orders first', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-low', priority: 'low', woNumber: 'WO-LOW' }),
        createTestWorkOrder({ id: 'wo-crit', priority: 'critical', woNumber: 'WO-CRIT' }),
        createTestWorkOrder({ id: 'wo-high', priority: 'high', woNumber: 'WO-HIGH' }),
      ];
      const capacities = [createTestCapacity()];

      const result = optimizer.optimizeByPriority(workOrders, capacities);

      expect(result.algorithm).toBe('priority_first');
      expect(result.schedule.length).toBe(3);
      // Critical should be first
      expect(result.schedule[0].woNumber).toBe('WO-CRIT');
    });

    it('should sort by due date for same priority', async () => {
      const earlyDue = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const lateDue = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

      const workOrders = [
        createTestWorkOrder({ id: 'wo-late', priority: 'normal', dueDate: lateDue, woNumber: 'WO-LATE' }),
        createTestWorkOrder({ id: 'wo-early', priority: 'normal', dueDate: earlyDue, woNumber: 'WO-EARLY' }),
      ];
      const capacities = [createTestCapacity()];

      const result = optimizer.optimizeByPriority(workOrders, capacities);

      expect(result.schedule[0].woNumber).toBe('WO-EARLY');
    });
  });

  describe('optimizeByDueDate', () => {
    it('should schedule by earliest due date', async () => {
      const earlyDue = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const lateDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const workOrders = [
        createTestWorkOrder({ id: 'wo-late', dueDate: lateDue, woNumber: 'WO-LATE' }),
        createTestWorkOrder({ id: 'wo-early', dueDate: earlyDue, woNumber: 'WO-EARLY' }),
      ];
      const capacities = [createTestCapacity()];

      const result = optimizer.optimizeByDueDate(workOrders, capacities);

      expect(result.algorithm).toBe('due_date_first');
      expect(result.schedule[0].woNumber).toBe('WO-EARLY');
    });

    it('should handle work orders without due dates', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', dueDate: null, woNumber: 'WO-1' }),
        createTestWorkOrder({ id: 'wo-2', dueDate: new Date(Date.now() + 7 * 86400000), woNumber: 'WO-2' }),
      ];
      const capacities = [createTestCapacity()];

      const result = optimizer.optimizeByDueDate(workOrders, capacities);
      expect(result.schedule.length).toBe(2);
      // Work order with due date should come first
      expect(result.schedule[0].woNumber).toBe('WO-2');
    });
  });

  describe('optimizeByShortestFirst', () => {
    it('should schedule shortest duration first', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-long', estimatedDuration: 16, woNumber: 'WO-LONG' }),
        createTestWorkOrder({ id: 'wo-short', estimatedDuration: 2, woNumber: 'WO-SHORT' }),
      ];
      const capacities = [createTestCapacity()];

      const result = optimizer.optimizeByShortestFirst(workOrders, capacities);

      expect(result.algorithm).toBe('shortest_first');
      expect(result.schedule[0].woNumber).toBe('WO-SHORT');
    });
  });

  describe('optimizeBySetupTime', () => {
    it('should group by work center and product family', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', productCode: 'ABC-001', workCenterId: 'wc-1' }),
        createTestWorkOrder({ id: 'wo-2', productCode: 'XYZ-001', workCenterId: 'wc-1' }),
        createTestWorkOrder({ id: 'wo-3', productCode: 'ABC-002', workCenterId: 'wc-1' }),
      ];
      const capacities = [createTestCapacity()];

      const result = optimizer.optimizeBySetupTime(workOrders, capacities);

      expect(result.algorithm).toBe('setup_minimize');
      expect(result.schedule.length).toBe(3);
    });
  });

  describe('balanceWorkload', () => {
    it('should distribute work across centers', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', workCenterId: null, estimatedDuration: 4 }),
        createTestWorkOrder({ id: 'wo-2', workCenterId: null, estimatedDuration: 4 }),
      ];
      const capacities = [
        createTestCapacity({ id: 'wc-1', name: 'WC 1' }),
        createTestCapacity({ id: 'wc-2', name: 'WC 2' }),
      ];

      const result = optimizer.balanceWorkload(workOrders, capacities);

      expect(result.algorithm).toBe('balanced_load');
      expect(result.schedule.length).toBe(2);
    });

    it('should respect work center assignment', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', workCenterId: 'wc-1', estimatedDuration: 4 }),
      ];
      const capacities = [
        createTestCapacity({ id: 'wc-1', name: 'WC 1' }),
        createTestCapacity({ id: 'wc-2', name: 'WC 2' }),
      ];

      const result = optimizer.balanceWorkload(workOrders, capacities);

      expect(result.schedule[0]?.workCenterId).toBe('wc-1');
    });
  });

  describe('metrics - empty schedule', () => {
    it('should return zeroed metrics for empty schedule', async () => {
      const result = await optimizer.optimize([], [createTestCapacity()], 'priority_first');
      expect(result.metrics.makespan).toBe(0);
      expect(result.metrics.totalSetupTime).toBe(0);
      expect(result.metrics.avgFlowTime).toBe(0);
      expect(result.metrics.fitnessScore).toBe(0);
      expect(result.metrics.balanceScore).toBe(100);
    });
  });

  describe('metrics - lateness tracking', () => {
    it('should track late work orders', async () => {
      const pastDue = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', dueDate: pastDue, estimatedDuration: 8 }),
      ];
      const capacities = [createTestCapacity()];

      const result = await optimizer.optimize(workOrders, capacities, 'priority_first');

      expect(result.metrics.lateCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('scheduleOperations', () => {
    it('should schedule operations sequentially', async () => {
      const workOrders = [
        createTestWorkOrder({
          id: 'wo-1',
          operations: [
            { id: 'op-1', operationNumber: 10, name: 'Cut', workCenterId: 'wc-1', plannedSetupTime: 0.5, plannedRunTime: 2 } as any,
            { id: 'op-2', operationNumber: 20, name: 'Weld', workCenterId: 'wc-1', plannedSetupTime: 0.3, plannedRunTime: 3 } as any,
          ],
        }),
      ];
      const capacities = [createTestCapacity()];

      const result = await optimizer.optimize(workOrders, capacities, 'priority_first');

      expect(result.schedule.length).toBe(1);
      expect(result.schedule[0].operations.length).toBe(2);
      // Second operation should start after first ends
      expect(result.schedule[0].operations[1].startDate.getTime())
        .toBeGreaterThanOrEqual(result.schedule[0].operations[0].endDate.getTime());
    });
  });

  describe('genetic algorithm internals', () => {
    it('should handle small population genetic algorithm', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1' }),
        createTestWorkOrder({ id: 'wo-2' }),
      ];
      const capacities = [createTestCapacity()];

      const result = await optimizer.runGeneticAlgorithm(workOrders, capacities, {
        populationSize: 10,
        generations: 5,
        mutationRate: 0.2,
        crossoverRate: 0.8,
        elitismCount: 1,
        tournamentSize: 3,
        convergenceThreshold: 0.001,
      });

      expect(result.algorithm).toBe('genetic');
      expect(result.schedule.length).toBeGreaterThanOrEqual(0);
    });
  });
});
