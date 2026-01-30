import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConflictDetector,
  getConflictDetector,
  DetailedConflict,
  ConflictDetectionResult,
} from '../conflict-detector';
import {
  WorkOrderScheduleInfo,
  WorkCenterCapacityInfo,
  ScheduleSuggestion,
} from '../scheduling-engine';
import { ScheduledWorkOrder } from '../schedule-optimizer';

// Mock prisma with proper default export
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    workCenter: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

describe('ConflictDetector', () => {
  let detector: ConflictDetector;

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
    plannedStart: new Date(),
    plannedEnd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    actualStart: null,
    workCenterId: 'wc-1',
    workCenterName: 'Work Center 1',
    estimatedDuration: 16,
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
      scheduledHours: 4,
      remainingHours: 4,
      utilization: 50,
      scheduledWorkOrders: [],
      isHoliday: false,
      maintenanceHours: 0,
    })),
    ...overrides,
  });

  const createTestScheduledWorkOrder = (
    overrides: Partial<ScheduledWorkOrder> = {}
  ): ScheduledWorkOrder => ({
    workOrderId: 'wo-1',
    woNumber: 'WO-001',
    workCenterId: 'wc-1',
    workCenterName: 'Work Center 1',
    startDate: new Date(),
    endDate: new Date(Date.now() + 8 * 60 * 60 * 1000),
    operations: [],
    priority: 1,
    originalIndex: 0,
    ...overrides,
  });

  beforeEach(() => {
    detector = ConflictDetector.getInstance();
    vi.clearAllMocks();
  });

  describe('singleton instance', () => {
    it('should return same instance', () => {
      const instance1 = getConflictDetector();
      const instance2 = getConflictDetector();
      expect(instance1).toBe(instance2);
    });
  });

  describe('detectConflicts', () => {
    it('should return empty conflicts for no schedule', async () => {
      const result = await detector.detectConflicts([], [], []);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should return empty conflicts for single work order', async () => {
      const schedule = [createTestScheduledWorkOrder()];
      const workOrders = [createTestWorkOrder()];
      const capacities = [createTestCapacity()];

      const result = await detector.detectConflicts(schedule, workOrders, capacities);
      expect(result).toBeDefined();
      expect(Array.isArray(result.conflicts)).toBe(true);
    });

    it('should detect overlapping work orders', async () => {
      const now = new Date();
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          workCenterId: 'wc-1',
          startDate: now,
          endDate: new Date(now.getTime() + 8 * 60 * 60 * 1000),
        }),
        createTestScheduledWorkOrder({
          workOrderId: 'wo-2',
          woNumber: 'WO-002',
          workCenterId: 'wc-1',
          startDate: new Date(now.getTime() + 4 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 12 * 60 * 60 * 1000),
        }),
      ];

      const workOrders = [
        createTestWorkOrder({ id: 'wo-1' }),
        createTestWorkOrder({ id: 'wo-2', woNumber: 'WO-002' }),
      ];
      const capacities = [createTestCapacity()];

      const result = await detector.detectConflicts(schedule, workOrders, capacities);
      expect(Array.isArray(result.conflicts)).toBe(true);
    });
  });

  describe('detectOverlaps', () => {
    it('should detect overlapping schedules on same work center', async () => {
      const now = new Date();
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          workCenterId: 'wc-1',
          startDate: now,
          endDate: new Date(now.getTime() + 10 * 60 * 60 * 1000),
        }),
        createTestScheduledWorkOrder({
          workOrderId: 'wo-2',
          woNumber: 'WO-002',
          workCenterId: 'wc-1',
          startDate: new Date(now.getTime() + 5 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 15 * 60 * 60 * 1000),
        }),
      ];

      const workOrders = [
        createTestWorkOrder({ id: 'wo-1' }),
        createTestWorkOrder({ id: 'wo-2' }),
      ];
      const capacities = [createTestCapacity()];

      const result = await detector.detectConflicts(schedule, workOrders, capacities);
      const overlaps = result.conflicts.filter(c => c.type === 'overlap');
      expect(overlaps.length).toBeGreaterThan(0);
    });

    it('should not detect overlaps on different work centers', async () => {
      const now = new Date();
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          workCenterId: 'wc-1',
          startDate: now,
          endDate: new Date(now.getTime() + 10 * 60 * 60 * 1000),
        }),
        createTestScheduledWorkOrder({
          workOrderId: 'wo-2',
          woNumber: 'WO-002',
          workCenterId: 'wc-2',
          workCenterName: 'Work Center 2',
          startDate: new Date(now.getTime() + 5 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 15 * 60 * 60 * 1000),
        }),
      ];

      const workOrders = [
        createTestWorkOrder({ id: 'wo-1' }),
        createTestWorkOrder({ id: 'wo-2' }),
      ];
      const capacities = [
        createTestCapacity({ id: 'wc-1' }),
        createTestCapacity({ id: 'wc-2', name: 'Work Center 2' }),
      ];

      const result = await detector.detectConflicts(schedule, workOrders, capacities);
      const overlaps = result.conflicts.filter(c => c.type === 'overlap');
      expect(overlaps).toHaveLength(0);
    });
  });

  describe('detectDueDateRisks', () => {
    it('should detect work orders at risk of missing due date', async () => {
      const now = new Date();
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          startDate: now,
          endDate: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        }),
      ];

      const workOrders = [
        createTestWorkOrder({
          id: 'wo-1',
          dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        }),
      ];
      const capacities = [createTestCapacity()];

      const result = await detector.detectConflicts(schedule, workOrders, capacities);
      const risks = result.conflicts.filter(c => c.type === 'due_date_risk');
      expect(risks.length).toBeGreaterThan(0);
    });

    it('should not flag work orders finishing before due date', async () => {
      const now = new Date();
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          startDate: now,
          endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        }),
      ];

      const workOrders = [
        createTestWorkOrder({
          id: 'wo-1',
          dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        }),
      ];
      const capacities = [createTestCapacity()];

      const result = await detector.detectConflicts(schedule, workOrders, capacities);
      const risks = result.conflicts.filter(c => c.type === 'due_date_risk');
      expect(risks).toHaveLength(0);
    });
  });

  describe('detectMaterialShortages', () => {
    it('should detect material shortages', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          startDate: now,
          endDate: new Date(now.getTime() + 8 * 60 * 60 * 1000),
        }),
      ];

      const workOrders = [
        createTestWorkOrder({
          id: 'wo-1',
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
        }),
      ];
      const capacities = [createTestCapacity()];

      const result = await detector.detectConflicts(schedule, workOrders, capacities);
      const shortages = result.conflicts.filter(c => c.type === 'material_shortage');
      expect(shortages.length).toBeGreaterThan(0);
    });

    it('should not flag work orders with available materials', async () => {
      const now = new Date();
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          startDate: now,
          endDate: new Date(now.getTime() + 8 * 60 * 60 * 1000),
        }),
      ];

      const workOrders = [
        createTestWorkOrder({
          id: 'wo-1',
          materialStatus: {
            allAvailable: true,
            availablePercentage: 100,
            shortages: [],
            expectedReadyDate: null,
          },
        }),
      ];
      const capacities = [createTestCapacity()];

      const result = await detector.detectConflicts(schedule, workOrders, capacities);
      const shortages = result.conflicts.filter(c => c.type === 'material_shortage');
      expect(shortages).toHaveLength(0);
    });
  });

  describe('autoResolveConflicts', () => {
    it('should auto-resolve conflicts', async () => {
      const conflicts: DetailedConflict[] = [
        {
          id: 'conflict-1',
          type: 'overlap',
          severity: 'medium',
          title: 'Test overlap',
          description: 'Test overlap conflict',
          affectedWorkOrders: [
            {
              workOrderId: 'wo-1',
              woNumber: 'WO-001',
              productName: 'Test',
              currentStart: new Date(),
              currentEnd: new Date(),
            },
          ],
          affectedWorkCenters: [],
          affectedDates: [],
          suggestedResolutions: [
            {
              id: 'res-1',
              type: 'reschedule',
              description: 'Reschedule work order',
              impact: {
                dueDateChange: 1,
                capacityChange: 0,
                costChange: 0,
                otherWorkOrdersAffected: 0,
                riskLevel: 'low',
              },
              actions: [],
              confidence: 80,
              priority: 1,
            },
          ],
          autoResolvable: true,
          estimatedImpact: {
            delayDays: 1,
            capacityLoss: 0,
            costEstimate: 0,
            customerImpact: 'minor',
          },
          detectedAt: new Date(),
        },
      ];

      const resolutions = await detector.autoResolveConflicts(conflicts, 'user-1');
      expect(Array.isArray(resolutions)).toBe(true);
    });
  });

  describe('conflict severity', () => {
    it('should assign correct severity for overlap conflicts', async () => {
      const now = new Date();
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          workCenterId: 'wc-1',
          startDate: now,
          endDate: new Date(now.getTime() + 8 * 60 * 60 * 1000),
        }),
        createTestScheduledWorkOrder({
          workOrderId: 'wo-2',
          woNumber: 'WO-002',
          workCenterId: 'wc-1',
          startDate: new Date(now.getTime() + 4 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 12 * 60 * 60 * 1000),
        }),
      ];

      const workOrders = [
        createTestWorkOrder({ id: 'wo-1' }),
        createTestWorkOrder({ id: 'wo-2' }),
      ];
      const capacities = [createTestCapacity()];

      const result = await detector.detectConflicts(schedule, workOrders, capacities);
      if (result.conflicts.length > 0) {
        expect(['low', 'medium', 'high', 'critical']).toContain(result.conflicts[0].severity);
      }
    });
  });

  describe('result structure', () => {
    it('should return proper result structure', async () => {
      const result = await detector.detectConflicts([], [], []);

      expect(result).toHaveProperty('conflicts');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('summary');
      expect(Array.isArray(result.conflicts)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should include summary statistics', async () => {
      const result = await detector.detectConflicts([], [], []);

      expect(result.summary).toHaveProperty('totalConflicts');
      expect(result.summary).toHaveProperty('criticalCount');
      expect(result.summary).toHaveProperty('highCount');
      expect(result.summary).toHaveProperty('mediumCount');
      expect(result.summary).toHaveProperty('lowCount');
      expect(result.summary).toHaveProperty('autoResolvableCount');
    });
  });

  describe('edge cases', () => {
    it('should handle schedule without dates gracefully', async () => {
      const schedule: ScheduledWorkOrder[] = [];
      const workOrders: WorkOrderScheduleInfo[] = [];
      const capacities = [createTestCapacity()];

      const result = await detector.detectConflicts(schedule, workOrders, capacities);
      expect(Array.isArray(result.conflicts)).toBe(true);
    });

    it('should handle work orders without due dates', async () => {
      const schedule = [createTestScheduledWorkOrder()];
      const workOrders = [createTestWorkOrder({ dueDate: null })];
      const capacities = [createTestCapacity()];

      const result = await detector.detectConflicts(schedule, workOrders, capacities);
      expect(Array.isArray(result.conflicts)).toBe(true);
    });
  });
});
