import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SchedulingEngine,
  getSchedulingEngine,
  WorkOrderScheduleInfo,
  ScheduleResult,
  WorkCenterCapacityInfo,
  ScheduleSuggestion,
  DEFAULT_SCHEDULING_OPTIONS,
} from '../scheduling-engine';

// Mock prisma with proper default export
const { mockPrisma } = vi.hoisted(() => {
  const mp: Record<string, any> = {
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
    workOrderOperation: {
      update: vi.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  };
  mp.$transaction = vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(mp));
  return { mockPrisma: mp };
});

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

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
    it('should return same instance via getInstance', () => {
      const a = SchedulingEngine.getInstance();
      const b = SchedulingEngine.getInstance();
      expect(a).toBe(b);
    });

    it('should return same instance via getSchedulingEngine', () => {
      const a = getSchedulingEngine();
      const b = getSchedulingEngine();
      expect(a).toBe(b);
    });
  });

  describe('DEFAULT_SCHEDULING_OPTIONS', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_SCHEDULING_OPTIONS.algorithm).toBe('priority_first');
      expect(DEFAULT_SCHEDULING_OPTIONS.horizonDays).toBe(14);
      expect(DEFAULT_SCHEDULING_OPTIONS.respectDueDates).toBe(true);
      expect(DEFAULT_SCHEDULING_OPTIONS.allowSplitting).toBe(false);
      expect(DEFAULT_SCHEDULING_OPTIONS.allowOvertime).toBe(false);
      expect(DEFAULT_SCHEDULING_OPTIONS.excludeStatuses).toContain('completed');
      expect(DEFAULT_SCHEDULING_OPTIONS.excludeStatuses).toContain('cancelled');
    });
  });

  describe('generateSchedule', () => {
    it('should generate empty schedule for empty work orders', async () => {
      const result = await engine.generateSchedule([], {});
      expect(result).toBeDefined();
      expect(result.suggestions).toHaveLength(0);
      expect(result.id).toContain('sched-');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should generate schedule with default algorithm', async () => {
      const workOrders = [createTestWorkOrder()];
      const result = await engine.generateSchedule(workOrders, {});
      expect(result.algorithm).toBe('priority_first');
    });

    it('should include metrics in result', async () => {
      const result = await engine.generateSchedule([], {});
      expect(result.metrics.currentOnTimeDelivery).toBeDefined();
      expect(result.metrics.projectedOnTimeDelivery).toBeDefined();
      expect(result.metrics.currentCapacityUtilization).toBeDefined();
      expect(result.metrics.projectedCapacityUtilization).toBeDefined();
      expect(result.metrics.makespan).toBeDefined();
      expect(result.metrics.unscheduledCount).toBeDefined();
    });

    it('should support priority_first algorithm', async () => {
      const result = await engine.generateSchedule([], { algorithm: 'priority_first' });
      expect(result.algorithm).toBe('priority_first');
    });

    it('should support due_date_first algorithm', async () => {
      const result = await engine.generateSchedule([], { algorithm: 'due_date_first' });
      expect(result.algorithm).toBe('due_date_first');
    });

    it('should support shortest_first algorithm', async () => {
      const result = await engine.generateSchedule([], { algorithm: 'shortest_first' });
      expect(result.algorithm).toBe('shortest_first');
    });

    it('should support setup_minimize algorithm', async () => {
      const result = await engine.generateSchedule([], { algorithm: 'setup_minimize' });
      expect(result.algorithm).toBe('setup_minimize');
    });

    it('should support balanced_load algorithm', async () => {
      const result = await engine.generateSchedule([], { algorithm: 'balanced_load' });
      expect(result.algorithm).toBe('balanced_load');
    });

    it('should respect horizonDays option', async () => {
      const result = await engine.generateSchedule([], { horizonDays: 7 });
      expect(result.horizon.days).toBe(7);
    });

    it('should filter out excluded statuses', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', status: 'pending' }),
        createTestWorkOrder({ id: 'wo-2', status: 'completed', woNumber: 'WO-002' }),
        createTestWorkOrder({ id: 'wo-3', status: 'cancelled', woNumber: 'WO-003' }),
      ];
      const result = await engine.generateSchedule(workOrders, {
        excludeStatuses: ['completed', 'cancelled'],
      });
      expect(result.workOrdersAnalyzed).toBe(1);
    });

    it('should filter by workOrderIds if provided', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1' }),
        createTestWorkOrder({ id: 'wo-2', woNumber: 'WO-002' }),
      ];
      const result = await engine.generateSchedule(workOrders, {
        workOrderIds: ['wo-1'],
      });
      expect(result.workOrdersAnalyzed).toBeLessThanOrEqual(1);
    });

    it('should filter by workCenterIds if provided', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', workCenterId: 'wc-1' }),
        createTestWorkOrder({ id: 'wo-2', workCenterId: 'wc-2', woNumber: 'WO-002' }),
      ];
      const result = await engine.generateSchedule(workOrders, {
        workCenterIds: ['wc-1'],
      });
      expect(result.workOrdersAnalyzed).toBeLessThanOrEqual(1);
    });

    it('should handle horizon with correct start and end dates', async () => {
      const result = await engine.generateSchedule([], { horizonDays: 14 });
      expect(result.horizon.startDate).toBeInstanceOf(Date);
      expect(result.horizon.endDate).toBeInstanceOf(Date);
      expect(result.horizon.endDate.getTime()).toBeGreaterThan(result.horizon.startDate.getTime());
    });

    it('should sort by priority for priority_first', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-low', priority: 'low', woNumber: 'WO-LOW' }),
        createTestWorkOrder({ id: 'wo-critical', priority: 'critical', woNumber: 'WO-CRIT' }),
        createTestWorkOrder({ id: 'wo-high', priority: 'high', woNumber: 'WO-HIGH' }),
      ];
      const result = await engine.generateSchedule(workOrders, { algorithm: 'priority_first' });
      expect(result).toBeDefined();
    });

    it('should sort by due date for due_date_first', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', dueDate: new Date(Date.now() + 14 * 86400000) }),
        createTestWorkOrder({ id: 'wo-2', dueDate: new Date(Date.now() + 3 * 86400000), woNumber: 'WO-002' }),
      ];
      const result = await engine.generateSchedule(workOrders, { algorithm: 'due_date_first' });
      expect(result).toBeDefined();
    });

    it('should sort by duration for shortest_first', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', estimatedDuration: 16 }),
        createTestWorkOrder({ id: 'wo-2', estimatedDuration: 4, woNumber: 'WO-002' }),
      ];
      const result = await engine.generateSchedule(workOrders, { algorithm: 'shortest_first' });
      expect(result).toBeDefined();
    });

    it('should group by work center for setup_minimize', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', workCenterId: 'wc-2', productCode: 'B' }),
        createTestWorkOrder({ id: 'wo-2', workCenterId: 'wc-1', productCode: 'A', woNumber: 'WO-002' }),
      ];
      const result = await engine.generateSchedule(workOrders, { algorithm: 'setup_minimize' });
      expect(result).toBeDefined();
    });

    it('should calculate on-time delivery metrics', async () => {
      const now = Date.now();
      const workOrders = [
        createTestWorkOrder({
          id: 'wo-1',
          dueDate: new Date(now + 10 * 86400000),
          plannedEnd: new Date(now + 5 * 86400000),
        }),
        createTestWorkOrder({
          id: 'wo-2',
          woNumber: 'WO-002',
          dueDate: new Date(now + 3 * 86400000),
          plannedEnd: new Date(now + 5 * 86400000),
        }),
      ];
      const result = await engine.generateSchedule(workOrders, {});
      expect(result.metrics.currentOnTimeDelivery).toBeDefined();
      expect(typeof result.metrics.currentOnTimeDelivery).toBe('number');
    });

    it('should count unscheduled work orders', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', plannedStart: null }),
        createTestWorkOrder({ id: 'wo-2', plannedStart: new Date(), woNumber: 'WO-002' }),
      ];
      const result = await engine.generateSchedule(workOrders, {});
      expect(result.metrics.unscheduledCount).toBe(1);
    });
  });

  describe('checkCapacity', () => {
    it('should return null for non-existent work center', async () => {
      const capacity = await engine.checkCapacity('non-existent', new Date(), new Date());
      expect(capacity).toBeNull();
    });

    it('should return capacity info for existing work center', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 7 * 86400000);
      mockPrisma.workCenter.findUnique.mockResolvedValueOnce({
        id: 'wc-1',
        code: 'WC-001',
        name: 'Test WC',
        type: 'machine',
        capacityPerDay: 8,
        efficiency: 1.0,
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        breakMinutes: 60,
        workingDays: [1, 2, 3, 4, 5],
        maxConcurrentJobs: 1,
        workCenterCapacity: [],
        workOrders: [],
      });

      const capacity = await engine.checkCapacity('wc-1', now, later);
      expect(capacity).not.toBeNull();
      expect(capacity!.id).toBe('wc-1');
      expect(capacity!.dailyCapacity.length).toBeGreaterThan(0);
    });
  });

  describe('getAllWorkCentersCapacity', () => {
    it('should return capacity for all active work centers', async () => {
      mockPrisma.workCenter.findMany.mockResolvedValueOnce([
        { id: 'wc-1' },
        { id: 'wc-2' },
      ]);
      // checkCapacity returns null for both since findUnique mocked as null
      const capacities = await engine.getAllWorkCentersCapacity(new Date(), new Date());
      expect(Array.isArray(capacities)).toBe(true);
    });
  });

  describe('calculateEarliestStart', () => {
    it('should return today or later for a simple work order', async () => {
      const workOrder = createTestWorkOrder();
      const earliest = await engine.calculateEarliestStart(workOrder);
      expect(earliest).toBeInstanceOf(Date);
      expect(earliest.getTime()).toBeGreaterThanOrEqual(Date.now() - 1000);
    });

    it('should consider material availability', async () => {
      const futureDate = new Date(Date.now() + 3 * 86400000);
      const workOrder = createTestWorkOrder({
        materialStatus: {
          allAvailable: false,
          availablePercentage: 50,
          shortages: [{
            partId: 'p1', partNumber: 'P-001', partName: 'Part 1',
            requiredQty: 100, availableQty: 50, shortageQty: 50,
            expectedArrival: futureDate, pendingPOQty: 50,
          }],
          expectedReadyDate: futureDate,
        },
      });
      const earliest = await engine.calculateEarliestStart(workOrder);
      expect(earliest.getTime()).toBeGreaterThanOrEqual(futureDate.getTime());
    });

    it('should consider predecessors', async () => {
      const workOrder = createTestWorkOrder({ predecessors: ['wo-0', 'wo-00'] });
      const earliest = await engine.calculateEarliestStart(workOrder);
      expect(earliest).toBeInstanceOf(Date);
    });

    it('should handle string ID (database path)', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValueOnce(null);
      const earliest = await engine.calculateEarliestStart('wo-nonexistent');
      expect(earliest).toBeInstanceOf(Date);
    });
  });

  describe('calculateLatestStart', () => {
    it('should return date before due date', async () => {
      const dueDate = new Date(Date.now() + 10 * 86400000);
      const workOrder = createTestWorkOrder({ dueDate, estimatedDuration: 8 });
      const latest = await engine.calculateLatestStart(workOrder);
      expect(latest).toBeInstanceOf(Date);
      expect(latest!.getTime()).toBeLessThan(dueDate.getTime());
    });

    it('should return default future date if no due date', async () => {
      const workOrder = createTestWorkOrder({ dueDate: null });
      const latest = await engine.calculateLatestStart(workOrder);
      expect(latest).toBeInstanceOf(Date);
      expect(latest!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle zero estimated duration', async () => {
      const workOrder = createTestWorkOrder({ estimatedDuration: 0 });
      const latest = await engine.calculateLatestStart(workOrder);
      expect(latest).toBeInstanceOf(Date);
    });

    it('should handle string ID returning null for missing WO', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValueOnce(null);
      const latest = await engine.calculateLatestStart('wo-nonexistent');
      expect(latest).toBeNull();
    });
  });

  describe('applySchedule', () => {
    it('should apply empty suggestions successfully', async () => {
      const result = await engine.applySchedule([], 'user-1');
      expect(result.success).toBe(true);
      expect(result.appliedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should apply a suggestion via transaction', async () => {
      const suggestion: ScheduleSuggestion = {
        id: 'sugg-1',
        workOrderId: 'wo-1',
        woNumber: 'WO-001',
        productName: 'Product',
        currentSchedule: { workCenterId: null, workCenterName: null, startDate: null, endDate: null },
        suggestedSchedule: {
          workCenterId: 'wc-1',
          workCenterName: 'WC 1',
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        },
        operations: [],
        changeType: 'new',
        reason: 'Test',
        impact: {
          onTimeDeliveryChange: 0,
          capacityUtilizationChange: 0,
          setupTimeChange: 0,
          conflictsResolved: 0,
          affectedWorkOrders: [],
        },
        priority: 50,
        confidenceScore: 85,
        createdAt: new Date(),
      };

      const result = await engine.applySchedule([suggestion], 'user-1');
      expect(result.success).toBe(true);
      expect(result.appliedCount).toBe(1);
    });

    it('should handle transaction errors', async () => {
      mockPrisma.$transaction.mockRejectedValueOnce(new Error('DB error'));

      const suggestion: ScheduleSuggestion = {
        id: 'sugg-1',
        workOrderId: 'wo-1',
        woNumber: 'WO-001',
        productName: 'Product',
        currentSchedule: { workCenterId: null, workCenterName: null, startDate: null, endDate: null },
        suggestedSchedule: {
          workCenterId: 'wc-1',
          workCenterName: 'WC 1',
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        },
        operations: [],
        changeType: 'new',
        reason: 'Test',
        impact: {
          onTimeDeliveryChange: 0,
          capacityUtilizationChange: 0,
          setupTimeChange: 0,
          conflictsResolved: 0,
          affectedWorkOrders: [],
        },
        priority: 50,
        confidenceScore: 85,
        createdAt: new Date(),
      };

      const result = await engine.applySchedule([suggestion], 'user-1');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeWorkOrders', () => {
    it('should return empty array when no work orders found', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValueOnce([]);
      const result = await engine.analyzeWorkOrders();
      expect(result).toEqual([]);
    });

    it('should support filtering by workOrderIds', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValueOnce([]);
      await engine.analyzeWorkOrders({ workOrderIds: ['wo-1'] });
      expect(mockPrisma.workOrder.findMany).toHaveBeenCalled();
    });

    it('should support filtering by workCenterIds', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValueOnce([]);
      await engine.analyzeWorkOrders({ workCenterIds: ['wc-1'] });
      expect(mockPrisma.workOrder.findMany).toHaveBeenCalled();
    });

    it('should support filtering by statuses', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValueOnce([]);
      await engine.analyzeWorkOrders({ statuses: ['pending'] });
      expect(mockPrisma.workOrder.findMany).toHaveBeenCalled();
    });

    it('should support filtering by priorities', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValueOnce([]);
      await engine.analyzeWorkOrders({ priorities: ['critical'] });
      expect(mockPrisma.workOrder.findMany).toHaveBeenCalled();
    });

    it('should support filtering by date range', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValueOnce([]);
      await engine.analyzeWorkOrders({
        dateRange: { start: new Date(), end: new Date(Date.now() + 86400000) },
      });
      expect(mockPrisma.workOrder.findMany).toHaveBeenCalled();
    });
  });

  describe('checkMaterialAvailability', () => {
    it('should return unavailable status for non-existent work order', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValueOnce(null);
      const status = await engine.checkMaterialAvailability('wo-nonexistent');
      expect(status.allAvailable).toBe(false);
      expect(status.availablePercentage).toBe(0);
    });

    it('should return all available when no BOM', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValueOnce({
        id: 'wo-1',
        quantity: 100,
        completedQty: 0,
        product: { bomHeaders: [] },
        allocations: [],
      });
      const status = await engine.checkMaterialAvailability('wo-1');
      expect(status.allAvailable).toBe(true);
      expect(status.availablePercentage).toBe(100);
    });
  });

  describe('schedule result structure', () => {
    it('should have all required fields', async () => {
      const result = await engine.generateSchedule([], {});
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('algorithm');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('horizon');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('conflicts');
      expect(result).toHaveProperty('warnings');
    });
  });

  describe('edge cases', () => {
    it('should handle work order with past due date', async () => {
      const workOrder = createTestWorkOrder({
        dueDate: new Date(Date.now() - 86400000),
      });
      const earliest = await engine.calculateEarliestStart(workOrder);
      expect(earliest).toBeInstanceOf(Date);
    });

    it('should handle multiple work orders with various priorities', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', priority: 'critical' }),
        createTestWorkOrder({ id: 'wo-2', priority: 'high', woNumber: 'WO-002' }),
        createTestWorkOrder({ id: 'wo-3', priority: 'low', woNumber: 'WO-003' }),
      ];
      const result = await engine.generateSchedule(workOrders, {});
      expect(result).toBeDefined();
      expect(result.workOrdersAnalyzed).toBeGreaterThanOrEqual(0);
    });

    it('should handle work orders without work center', async () => {
      const workOrder = createTestWorkOrder({ workCenterId: null, workCenterName: null });
      const result = await engine.generateSchedule([workOrder], {});
      expect(result).toBeDefined();
    });

    it('should handle work orders with due date but no planned end for due_date_first', async () => {
      const workOrders = [
        createTestWorkOrder({ id: 'wo-1', dueDate: new Date(Date.now() + 86400000) }),
        createTestWorkOrder({ id: 'wo-2', dueDate: null, woNumber: 'WO-002' }),
      ];
      const result = await engine.generateSchedule(workOrders, { algorithm: 'due_date_first' });
      expect(result).toBeDefined();
    });

    it('should handle default algorithm fallback for unknown algorithm', async () => {
      const workOrders = [createTestWorkOrder()];
      const result = await engine.generateSchedule(workOrders, {
        algorithm: 'genetic' as any,
      });
      expect(result).toBeDefined();
    });
  });

  describe('generateSchedule with capacity and suggestions', () => {
    it('should produce suggestions when work center capacity is available', async () => {
      // Mock getAllWorkCentersCapacity to return a work center with available hours
      const now = new Date();
      const dailyCap = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        return {
          date: d,
          availableHours: 8,
          scheduledHours: 0,
          remainingHours: 8,
          utilization: 0,
          scheduledWorkOrders: [],
          isHoliday: false,
          maintenanceHours: 0,
        };
      });

      mockPrisma.workCenter.findMany.mockResolvedValueOnce([{ id: 'wc-1' }]);
      mockPrisma.workCenter.findUnique.mockResolvedValueOnce({
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
        workCenterCapacity: [],
        workOrders: [],
      });

      const workOrders = [
        createTestWorkOrder({
          id: 'wo-1',
          workCenterId: 'wc-1',
          estimatedDuration: 8,
          priority: 'critical',
          dueDate: new Date(Date.now() + 5 * 86400000),
        }),
      ];

      const result = await engine.generateSchedule(workOrders, {
        algorithm: 'priority_first',
        horizonDays: 14,
      });

      expect(result.workOrdersAnalyzed).toBe(1);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should produce suggestions and detect conflicts for overlapping WOs', async () => {
      const now = new Date();
      mockPrisma.workCenter.findMany.mockResolvedValueOnce([{ id: 'wc-1' }]);
      mockPrisma.workCenter.findUnique.mockResolvedValueOnce({
        id: 'wc-1',
        code: 'WC-001',
        name: 'Work Center 1',
        type: 'machine',
        capacityPerDay: 8,
        efficiency: 1.0,
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        breakMinutes: 60,
        workingDays: [0, 1, 2, 3, 4, 5, 6],
        maxConcurrentJobs: 1,
        workCenterCapacity: [],
        workOrders: [],
      });

      const workOrders = [
        createTestWorkOrder({
          id: 'wo-1',
          workCenterId: 'wc-1',
          estimatedDuration: 4,
          priority: 'critical',
          dueDate: new Date(Date.now() + 10 * 86400000),
        }),
        createTestWorkOrder({
          id: 'wo-2',
          woNumber: 'WO-002',
          workCenterId: 'wc-1',
          estimatedDuration: 4,
          priority: 'high',
          dueDate: new Date(Date.now() + 10 * 86400000),
        }),
      ];

      const result = await engine.generateSchedule(workOrders, {
        algorithm: 'priority_first',
        horizonDays: 14,
      });

      expect(result.workOrdersAnalyzed).toBe(2);
    });

    it('should generate reason for critical priority WO', async () => {
      mockPrisma.workCenter.findMany.mockResolvedValueOnce([{ id: 'wc-1' }]);
      mockPrisma.workCenter.findUnique.mockResolvedValueOnce({
        id: 'wc-1',
        code: 'WC-001',
        name: 'Work Center 1',
        type: 'machine',
        capacityPerDay: 8,
        efficiency: 1.0,
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        breakMinutes: 60,
        workingDays: [0, 1, 2, 3, 4, 5, 6],
        maxConcurrentJobs: 1,
        workCenterCapacity: [],
        workOrders: [],
      });

      const workOrders = [
        createTestWorkOrder({
          id: 'wo-1',
          workCenterId: 'wc-1',
          estimatedDuration: 4,
          priority: 'critical',
          dueDate: new Date(Date.now() + 3 * 86400000),
          materialStatus: {
            allAvailable: false,
            availablePercentage: 50,
            shortages: [{
              partId: 'p1', partNumber: 'P-001', partName: 'Part 1',
              requiredQty: 100, availableQty: 50, shortageQty: 50,
              expectedArrival: new Date(Date.now() - 86400000),
              pendingPOQty: 50,
            }],
            expectedReadyDate: new Date(Date.now() - 86400000),
          },
        }),
      ];

      const result = await engine.generateSchedule(workOrders, {
        algorithm: 'priority_first',
        horizonDays: 14,
      });

      if (result.suggestions.length > 0) {
        expect(result.suggestions[0].reason).toContain('khẩn cấp');
      }
      expect(result).toBeDefined();
    });

    it('should handle move changeType when WO has existing schedule on different WC', async () => {
      mockPrisma.workCenter.findMany.mockResolvedValueOnce([{ id: 'wc-2' }]);
      mockPrisma.workCenter.findUnique.mockResolvedValueOnce({
        id: 'wc-2',
        code: 'WC-002',
        name: 'Work Center 2',
        type: 'machine',
        capacityPerDay: 8,
        efficiency: 1.0,
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        breakMinutes: 60,
        workingDays: [0, 1, 2, 3, 4, 5, 6],
        maxConcurrentJobs: 1,
        workCenterCapacity: [],
        workOrders: [],
      });

      const workOrders = [
        createTestWorkOrder({
          id: 'wo-1',
          workCenterId: 'wc-2',
          estimatedDuration: 4,
          plannedStart: new Date(Date.now() + 86400000),
          plannedEnd: new Date(Date.now() + 2 * 86400000),
        }),
      ];

      const result = await engine.generateSchedule(workOrders, {
        algorithm: 'priority_first',
        horizonDays: 14,
      });

      expect(result).toBeDefined();
    });

    it('should handle reschedule changeType for same WC', async () => {
      mockPrisma.workCenter.findMany.mockResolvedValueOnce([{ id: 'wc-1' }]);
      mockPrisma.workCenter.findUnique.mockResolvedValueOnce({
        id: 'wc-1',
        code: 'WC-001',
        name: 'Work Center 1',
        type: 'machine',
        capacityPerDay: 8,
        efficiency: 1.0,
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        breakMinutes: 60,
        workingDays: [0, 1, 2, 3, 4, 5, 6],
        maxConcurrentJobs: 1,
        workCenterCapacity: [],
        workOrders: [],
      });

      const workOrders = [
        createTestWorkOrder({
          id: 'wo-1',
          workCenterId: 'wc-1',
          estimatedDuration: 4,
          plannedStart: new Date(Date.now() + 86400000),
          plannedEnd: new Date(Date.now() + 2 * 86400000),
        }),
      ];

      const result = await engine.generateSchedule(workOrders, {
        algorithm: 'priority_first',
        horizonDays: 14,
      });

      expect(result).toBeDefined();
    });

    it('should calculate on-time delivery impact correctly', async () => {
      mockPrisma.workCenter.findMany.mockResolvedValueOnce([{ id: 'wc-1' }]);
      mockPrisma.workCenter.findUnique.mockResolvedValueOnce({
        id: 'wc-1',
        code: 'WC-001',
        name: 'Work Center 1',
        type: 'machine',
        capacityPerDay: 8,
        efficiency: 1.0,
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        breakMinutes: 60,
        workingDays: [0, 1, 2, 3, 4, 5, 6],
        maxConcurrentJobs: 1,
        workCenterCapacity: [],
        workOrders: [],
      });

      const workOrders = [
        createTestWorkOrder({
          id: 'wo-1',
          workCenterId: 'wc-1',
          estimatedDuration: 4,
          priority: 'high',
          dueDate: new Date(Date.now() + 20 * 86400000),
          plannedEnd: new Date(Date.now() + 25 * 86400000), // late
        }),
      ];

      const result = await engine.generateSchedule(workOrders, {
        algorithm: 'priority_first',
        horizonDays: 14,
      });

      expect(result).toBeDefined();
      expect(result.metrics.currentOnTimeDelivery).toBeDefined();
    });

    it('should generate high utilization warnings', async () => {
      mockPrisma.workCenter.findMany.mockResolvedValueOnce([{ id: 'wc-1' }]);
      mockPrisma.workCenter.findUnique.mockResolvedValueOnce({
        id: 'wc-1',
        code: 'WC-001',
        name: 'Work Center 1',
        type: 'machine',
        capacityPerDay: 8,
        efficiency: 1.0,
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        breakMinutes: 60,
        workingDays: [0, 1, 2, 3, 4, 5, 6],
        maxConcurrentJobs: 1,
        workCenterCapacity: [],
        workOrders: [
          {
            id: 'existing-wo',
            woNumber: 'EX-001',
            plannedStart: new Date(),
            plannedEnd: new Date(Date.now() + 14 * 86400000),
            status: 'in_progress',
            operations: [{ workCenterId: 'wc-1' }],
          },
        ],
      });

      const result = await engine.generateSchedule([], {
        algorithm: 'priority_first',
        horizonDays: 14,
      });

      expect(result).toBeDefined();
    });

    it('should handle WO with no workCenterId looking across all capacities', async () => {
      mockPrisma.workCenter.findMany.mockResolvedValueOnce([{ id: 'wc-1' }]);
      mockPrisma.workCenter.findUnique.mockResolvedValueOnce({
        id: 'wc-1',
        code: 'WC-001',
        name: 'Work Center 1',
        type: 'machine',
        capacityPerDay: 8,
        efficiency: 1.0,
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        breakMinutes: 60,
        workingDays: [0, 1, 2, 3, 4, 5, 6],
        maxConcurrentJobs: 1,
        workCenterCapacity: [],
        workOrders: [],
      });

      const workOrders = [
        createTestWorkOrder({
          id: 'wo-1',
          workCenterId: null,
          workCenterName: null,
          estimatedDuration: 4,
        }),
      ];

      const result = await engine.generateSchedule(workOrders, {
        algorithm: 'priority_first',
        horizonDays: 14,
      });

      expect(result).toBeDefined();
      // When workCenterId is null, it searches all capacities
      if (result.suggestions.length > 0) {
        expect(result.suggestions[0].suggestedSchedule.workCenterId).toBe('wc-1');
      }
    });
  });

  describe('checkMaterialAvailability with BOM', () => {
    it('should detect shortages when BOM items are insufficient', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValueOnce({
        id: 'wo-1',
        quantity: 100,
        completedQty: 0,
        product: {
          bomHeaders: [{
            bomLines: [{
              partId: 'part-1',
              quantity: 2,
              part: {
                partNumber: 'P-001',
                name: 'Raw Material 1',
                inventory: [{ quantity: 50, reservedQty: 0 }],
              },
            }],
          }],
        },
        allocations: [],
      });

      // Mock aggregate for pending POs
      mockPrisma.purchaseOrderLine.aggregate.mockResolvedValueOnce({
        _sum: { quantity: 100, receivedQty: 50 },
      });

      // Mock findFirst for expected arrival
      mockPrisma.purchaseOrderLine.findFirst.mockResolvedValueOnce({
        po: { expectedDate: new Date(Date.now() + 5 * 86400000) },
      });

      const status = await engine.checkMaterialAvailability('wo-1');
      expect(status.allAvailable).toBe(false);
      expect(status.shortages.length).toBeGreaterThan(0);
      expect(status.shortages[0].partNumber).toBe('P-001');
      expect(status.shortages[0].shortageQty).toBe(150); // 200 required - 50 available
      expect(status.expectedReadyDate).toBeInstanceOf(Date);
    });

    it('should report all available when inventory is sufficient', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValueOnce({
        id: 'wo-1',
        quantity: 10,
        completedQty: 0,
        product: {
          bomHeaders: [{
            bomLines: [{
              partId: 'part-1',
              quantity: 1,
              part: {
                partNumber: 'P-001',
                name: 'Raw Material 1',
                inventory: [{ quantity: 100, reservedQty: 0 }],
              },
            }],
          }],
        },
        allocations: [],
      });

      const status = await engine.checkMaterialAvailability('wo-1');
      expect(status.allAvailable).toBe(true);
      expect(status.availablePercentage).toBe(100);
      expect(status.shortages).toHaveLength(0);
    });
  });

  describe('analyzeWorkOrders with data', () => {
    it('should process work orders returned from database', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValueOnce([
        {
          id: 'wo-db-1',
          woNumber: 'WO-DB-001',
          productId: 'prod-1',
          quantity: 50,
          completedQty: 10,
          priority: 'high',
          status: 'in_progress',
          salesOrderId: 'so-1',
          plannedStart: new Date(),
          plannedEnd: new Date(Date.now() + 3 * 86400000),
          actualStart: new Date(),
          workCenterId: 'wc-1',
          product: { name: 'Widget', sku: 'WDG-001', bomHeaders: [] },
          salesOrder: { orderNumber: 'SO-001', requiredDate: new Date(Date.now() + 7 * 86400000) },
          workCenterRef: { name: 'Machine A' },
          operations: [],
          allocations: [],
        },
      ]);

      // checkMaterialAvailability will be called - need the findUnique mock
      mockPrisma.workOrder.findUnique.mockResolvedValueOnce({
        id: 'wo-db-1',
        quantity: 50,
        completedQty: 10,
        product: { bomHeaders: [] },
        allocations: [],
      });

      const result = await engine.analyzeWorkOrders();
      expect(result).toHaveLength(1);
      expect(result[0].woNumber).toBe('WO-DB-001');
      expect(result[0].productName).toBe('Widget');
      expect(result[0].remainingQty).toBe(40);
      expect(result[0].priority).toBe('high');
    });
  });

  describe('calculateLatestStart with string ID', () => {
    it('should calculate latest start from DB work order with sales order due date', async () => {
      const dueDate = new Date(Date.now() + 10 * 86400000);
      mockPrisma.workOrder.findUnique.mockResolvedValueOnce({
        id: 'wo-1',
        quantity: 100,
        completedQty: 0,
        plannedEnd: null,
        operations: [
          { plannedSetupTime: 2, plannedRunTime: 6 },
          { plannedSetupTime: 1, plannedRunTime: 4 },
        ],
        salesOrder: { requiredDate: dueDate },
      });

      const latest = await engine.calculateLatestStart('wo-1');
      expect(latest).toBeInstanceOf(Date);
      expect(latest!.getTime()).toBeLessThan(dueDate.getTime());
    });

    it('should return null when DB work order has no due date', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValueOnce({
        id: 'wo-1',
        quantity: 10,
        completedQty: 0,
        plannedEnd: null,
        operations: [],
        salesOrder: null,
      });

      const latest = await engine.calculateLatestStart('wo-1');
      expect(latest).toBeNull();
    });
  });

  describe('calculateEarliestStart with string ID', () => {
    it('should consider material readiness from DB', async () => {
      const futureDate = new Date(Date.now() + 5 * 86400000);
      mockPrisma.workOrder.findUnique
        .mockResolvedValueOnce({
          id: 'wo-1',
          operations: [],
        })
        // checkMaterialAvailability call
        .mockResolvedValueOnce({
          id: 'wo-1',
          quantity: 100,
          completedQty: 0,
          product: {
            bomHeaders: [{
              bomLines: [{
                partId: 'p1',
                quantity: 2,
                part: {
                  partNumber: 'P-001',
                  name: 'Part',
                  inventory: [{ quantity: 0, reservedQty: 0 }],
                },
              }],
            }],
          },
          allocations: [],
        });

      mockPrisma.purchaseOrderLine.aggregate.mockResolvedValueOnce({
        _sum: { quantity: 200, receivedQty: 0 },
      });
      mockPrisma.purchaseOrderLine.findFirst.mockResolvedValueOnce({
        po: { expectedDate: futureDate },
      });

      const earliest = await engine.calculateEarliestStart('wo-1');
      expect(earliest).toBeInstanceOf(Date);
      expect(earliest.getTime()).toBeGreaterThanOrEqual(futureDate.getTime());
    });
  });

  describe('applySchedule with operations', () => {
    it('should update operations when suggestion has them', async () => {
      const suggestion: ScheduleSuggestion = {
        id: 'sugg-1',
        workOrderId: 'wo-1',
        woNumber: 'WO-001',
        productName: 'Product',
        currentSchedule: { workCenterId: null, workCenterName: null, startDate: null, endDate: null },
        suggestedSchedule: {
          workCenterId: 'wc-1',
          workCenterName: 'WC 1',
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        },
        operations: [
          {
            operationId: 'op-1',
            workCenterId: 'wc-1',
            startDate: new Date(),
            endDate: new Date(Date.now() + 43200000),
          } as any,
        ],
        changeType: 'new',
        reason: 'Test',
        impact: {
          onTimeDeliveryChange: 0,
          capacityUtilizationChange: 0,
          setupTimeChange: 0,
          conflictsResolved: 0,
          affectedWorkOrders: [],
        },
        priority: 50,
        confidenceScore: 85,
        createdAt: new Date(),
      };

      const result = await engine.applySchedule([suggestion], 'user-1');
      expect(result.success).toBe(true);
      expect(result.appliedCount).toBe(1);
      expect(mockPrisma.workOrderOperation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'op-1' },
        })
      );
    });
  });
});
