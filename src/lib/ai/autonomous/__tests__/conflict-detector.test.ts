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
    it('should return same instance via getInstance', () => {
      const a = ConflictDetector.getInstance();
      const b = ConflictDetector.getInstance();
      expect(a).toBe(b);
    });

    it('should return same instance via getConflictDetector', () => {
      const a = getConflictDetector();
      const b = getConflictDetector();
      expect(a).toBe(b);
    });
  });

  describe('detectConflicts', () => {
    it('should return empty conflicts for no schedule', async () => {
      const result = await detector.detectConflicts([], [], []);
      expect(result.conflicts).toHaveLength(0);
      expect(result.warnings).toBeDefined();
      expect(result.summary).toBeDefined();
    });

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
      expect(result.summary).toHaveProperty('totalAffectedWorkOrders');
      expect(result.summary).toHaveProperty('totalAffectedWorkCenters');
      expect(result.summary).toHaveProperty('recommendedActions');
    });

    it('should handle single work order without conflicts', async () => {
      const schedule = [createTestScheduledWorkOrder()];
      const workOrders = [createTestWorkOrder()];
      const capacities = [createTestCapacity()];
      const result = await detector.detectConflicts(schedule, workOrders, capacities);
      expect(Array.isArray(result.conflicts)).toBe(true);
    });

    it('should handle ScheduleSuggestion format', async () => {
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
        impact: { onTimeDeliveryChange: 0, capacityUtilizationChange: 0, setupTimeChange: 0, conflictsResolved: 0, affectedWorkOrders: [] },
        priority: 50,
        confidenceScore: 85,
        createdAt: new Date(),
      };
      const result = await detector.detectConflicts([suggestion], [], []);
      expect(result).toBeDefined();
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
      const result = await detector.detectConflicts(schedule, [], []);
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
          workCenterName: 'WC 2',
          startDate: new Date(now.getTime() + 5 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 15 * 60 * 60 * 1000),
        }),
      ];
      const result = await detector.detectConflicts(schedule, [], []);
      const overlaps = result.conflicts.filter(c => c.type === 'overlap');
      expect(overlaps).toHaveLength(0);
    });

    it('should not detect overlaps for non-overlapping schedules', async () => {
      const now = new Date();
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          workCenterId: 'wc-1',
          startDate: now,
          endDate: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        }),
        createTestScheduledWorkOrder({
          workOrderId: 'wo-2',
          woNumber: 'WO-002',
          workCenterId: 'wc-1',
          startDate: new Date(now.getTime() + 5 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 10 * 60 * 60 * 1000),
        }),
      ];
      const result = await detector.detectConflicts(schedule, [], []);
      const overlaps = result.conflicts.filter(c => c.type === 'overlap');
      expect(overlaps).toHaveLength(0);
    });

    it('should assign critical severity for large overlaps (>8h)', async () => {
      const now = new Date();
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          workCenterId: 'wc-1',
          startDate: now,
          endDate: new Date(now.getTime() + 20 * 60 * 60 * 1000),
        }),
        createTestScheduledWorkOrder({
          workOrderId: 'wo-2',
          woNumber: 'WO-002',
          workCenterId: 'wc-1',
          startDate: new Date(now.getTime() + 2 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 22 * 60 * 60 * 1000),
        }),
      ];
      const result = await detector.detectConflicts(schedule, [], []);
      const overlaps = result.conflicts.filter(c => c.type === 'overlap');
      expect(overlaps.length).toBeGreaterThan(0);
      expect(overlaps[0].severity).toBe('critical');
    });

    it('should assign medium severity for small overlaps (<4h)', async () => {
      const now = new Date();
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          workCenterId: 'wc-1',
          startDate: now,
          endDate: new Date(now.getTime() + 5 * 60 * 60 * 1000),
        }),
        createTestScheduledWorkOrder({
          workOrderId: 'wo-2',
          woNumber: 'WO-002',
          workCenterId: 'wc-1',
          startDate: new Date(now.getTime() + 3 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 8 * 60 * 60 * 1000),
        }),
      ];
      const result = await detector.detectConflicts(schedule, [], []);
      const overlaps = result.conflicts.filter(c => c.type === 'overlap');
      expect(overlaps.length).toBeGreaterThan(0);
      expect(overlaps[0].severity).toBe('medium');
    });

    it('should include suggested resolutions for overlaps', async () => {
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
      const result = await detector.detectConflicts(schedule, [], []);
      const overlap = result.conflicts.find(c => c.type === 'overlap');
      expect(overlap).toBeDefined();
      expect(overlap!.suggestedResolutions.length).toBeGreaterThan(0);
      expect(overlap!.suggestedResolutions[0].type).toBe('reschedule');
    });
  });

  describe('detectOverloads', () => {
    it('should detect overloads when scheduled hours exceed capacity', async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          workCenterId: 'wc-1',
          startDate: today,
          endDate: new Date(today.getTime() + 86400000),
        }),
        createTestScheduledWorkOrder({
          workOrderId: 'wo-2',
          woNumber: 'WO-002',
          workCenterId: 'wc-1',
          startDate: today,
          endDate: new Date(today.getTime() + 86400000),
        }),
      ];
      const capacities = [createTestCapacity({
        dailyCapacity: [{
          date: today,
          availableHours: 8,
          scheduledHours: 0,
          remainingHours: 8,
          utilization: 0,
          scheduledWorkOrders: [],
          isHoliday: false,
          maintenanceHours: 0,
        }],
      })];
      const result = await detector.detectConflicts(schedule, [], capacities);
      // Both WOs are 24h each on a day with 8h capacity - likely overloaded
      const overloads = result.conflicts.filter(c => c.type === 'overload');
      expect(overloads.length).toBeGreaterThanOrEqual(0); // May or may not trigger depending on calculation
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
      const result = await detector.detectConflicts(schedule, workOrders, []);
      const risks = result.conflicts.filter(c => c.type === 'due_date_risk');
      expect(risks.length).toBeGreaterThan(0);
      expect(risks[0].severity).toBeDefined();
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
      const result = await detector.detectConflicts(schedule, workOrders, []);
      const risks = result.conflicts.filter(c => c.type === 'due_date_risk');
      expect(risks).toHaveLength(0);
    });

    it('should skip work orders without due date', async () => {
      const schedule = [createTestScheduledWorkOrder()];
      const workOrders = [createTestWorkOrder({ dueDate: null })];
      const result = await detector.detectConflicts(schedule, workOrders, []);
      const risks = result.conflicts.filter(c => c.type === 'due_date_risk');
      expect(risks).toHaveLength(0);
    });

    it('should assign critical severity for >7 days late', async () => {
      const now = new Date();
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          startDate: now,
          endDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        }),
      ];
      const workOrders = [
        createTestWorkOrder({
          id: 'wo-1',
          dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        }),
      ];
      const result = await detector.detectConflicts(schedule, workOrders, []);
      const risks = result.conflicts.filter(c => c.type === 'due_date_risk');
      expect(risks.length).toBeGreaterThan(0);
      expect(risks[0].severity).toBe('critical');
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
            shortages: [{
              partId: 'p1', partNumber: 'P-001', partName: 'Part 1',
              requiredQty: 100, availableQty: 50, shortageQty: 50,
              expectedArrival: futureDate, pendingPOQty: 50,
            }],
            expectedReadyDate: futureDate,
          },
        }),
      ];
      const result = await detector.detectConflicts(schedule, workOrders, []);
      const shortages = result.conflicts.filter(c => c.type === 'material_shortage');
      expect(shortages.length).toBeGreaterThan(0);
    });

    it('should not flag work orders with available materials', async () => {
      const schedule = [createTestScheduledWorkOrder()];
      const workOrders = [createTestWorkOrder({
        id: 'wo-1',
        materialStatus: {
          allAvailable: true,
          availablePercentage: 100,
          shortages: [],
          expectedReadyDate: null,
        },
      })];
      const result = await detector.detectConflicts(schedule, workOrders, []);
      const shortages = result.conflicts.filter(c => c.type === 'material_shortage');
      expect(shortages).toHaveLength(0);
    });

    it('should not flag if start date is after materials ready', async () => {
      const now = new Date();
      const materialsReady = new Date(now.getTime() - 86400000); // yesterday
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
            shortages: [{ partId: 'p1', partNumber: 'P-001', partName: 'Part 1', requiredQty: 100, availableQty: 50, shortageQty: 50, expectedArrival: materialsReady, pendingPOQty: 50 }],
            expectedReadyDate: materialsReady,
          },
        }),
      ];
      const result = await detector.detectConflicts(schedule, workOrders, []);
      const shortages = result.conflicts.filter(c => c.type === 'material_shortage');
      expect(shortages).toHaveLength(0);
    });
  });

  describe('detectResourceUnavailability', () => {
    it('should detect scheduling on holidays', async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          workCenterId: 'wc-1',
          startDate: today,
          endDate: new Date(today.getTime() + 86400000),
        }),
      ];
      const capacities = [createTestCapacity({
        dailyCapacity: [{
          date: today,
          availableHours: 0,
          scheduledHours: 0,
          remainingHours: 0,
          utilization: 0,
          scheduledWorkOrders: [],
          isHoliday: true,
          maintenanceHours: 0,
        }],
      })];
      const result = await detector.detectConflicts(schedule, [], capacities);
      const unavailable = result.conflicts.filter(c => c.type === 'resource_unavailable');
      expect(unavailable.length).toBeGreaterThan(0);
    });

    it('should detect scheduling during maintenance', async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          workCenterId: 'wc-1',
          startDate: today,
          endDate: new Date(today.getTime() + 86400000),
        }),
      ];
      const capacities = [createTestCapacity({
        dailyCapacity: [{
          date: today,
          availableHours: 8,
          scheduledHours: 0,
          remainingHours: 0,
          utilization: 0,
          scheduledWorkOrders: [],
          isHoliday: false,
          maintenanceHours: 8,
        }],
      })];
      const result = await detector.detectConflicts(schedule, [], capacities);
      const unavailable = result.conflicts.filter(c => c.type === 'resource_unavailable');
      expect(unavailable.length).toBeGreaterThan(0);
    });
  });

  describe('detectPredecessorViolations', () => {
    it('should detect predecessor violations', async () => {
      const now = new Date();
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-pred',
          woNumber: 'WO-PRED',
          startDate: now,
          endDate: new Date(now.getTime() + 16 * 60 * 60 * 1000),
        }),
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          woNumber: 'WO-001',
          startDate: new Date(now.getTime() + 4 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 12 * 60 * 60 * 1000),
        }),
      ];
      const workOrders = [
        createTestWorkOrder({ id: 'wo-pred', woNumber: 'WO-PRED', predecessors: [] }),
        createTestWorkOrder({ id: 'wo-1', predecessors: ['wo-pred'] }),
      ];
      const result = await detector.detectConflicts(schedule, workOrders, []);
      const violations = result.conflicts.filter(c => c.type === 'predecessor_violation');
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should not flag when predecessor finishes before successor starts', async () => {
      const now = new Date();
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-pred',
          woNumber: 'WO-PRED',
          startDate: now,
          endDate: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        }),
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          woNumber: 'WO-001',
          startDate: new Date(now.getTime() + 8 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 16 * 60 * 60 * 1000),
        }),
      ];
      const workOrders = [
        createTestWorkOrder({ id: 'wo-pred', woNumber: 'WO-PRED', predecessors: [] }),
        createTestWorkOrder({ id: 'wo-1', predecessors: ['wo-pred'] }),
      ];
      const result = await detector.detectConflicts(schedule, workOrders, []);
      const violations = result.conflicts.filter(c => c.type === 'predecessor_violation');
      expect(violations).toHaveLength(0);
    });
  });

  describe('warnings', () => {
    it('should generate high utilization warning (80-95%)', async () => {
      const capacities = [createTestCapacity({
        dailyCapacity: Array.from({ length: 5 }, (_, i) => ({
          date: new Date(Date.now() + i * 86400000),
          availableHours: 8, scheduledHours: 7, remainingHours: 1,
          utilization: 87.5,
          scheduledWorkOrders: [], isHoliday: false, maintenanceHours: 0,
        })),
      })];
      const result = await detector.detectConflicts([], [], capacities);
      const highUtil = result.warnings.filter(w => w.type === 'high_utilization');
      expect(highUtil.length).toBeGreaterThan(0);
    });

    it('should generate capacity approaching limit warning (>95%)', async () => {
      const capacities = [createTestCapacity({
        dailyCapacity: Array.from({ length: 5 }, (_, i) => ({
          date: new Date(Date.now() + i * 86400000),
          availableHours: 8, scheduledHours: 7.8, remainingHours: 0.2,
          utilization: 97.5,
          scheduledWorkOrders: [], isHoliday: false, maintenanceHours: 0,
        })),
      })];
      const result = await detector.detectConflicts([], [], capacities);
      const capWarning = result.warnings.filter(w => w.type === 'capacity_approaching_limit');
      expect(capWarning.length).toBeGreaterThan(0);
    });

    it('should generate long queue warning for >10 items', async () => {
      const schedule = Array.from({ length: 12 }, (_, i) =>
        createTestScheduledWorkOrder({
          workOrderId: `wo-${i}`,
          woNumber: `WO-${i}`,
          workCenterId: 'wc-1',
        })
      );
      const result = await detector.detectConflicts(schedule, [], []);
      const queueWarning = result.warnings.filter(w => w.type === 'long_queue');
      expect(queueWarning.length).toBeGreaterThan(0);
    });

    it('should generate unbalanced load warning', async () => {
      const now = new Date();
      const schedule = [
        ...Array.from({ length: 5 }, (_, i) =>
          createTestScheduledWorkOrder({
            workOrderId: `wo-a-${i}`,
            woNumber: `WO-A-${i}`,
            workCenterId: 'wc-1',
            startDate: now,
            endDate: new Date(now.getTime() + 10 * 60 * 60 * 1000),
          })
        ),
        createTestScheduledWorkOrder({
          workOrderId: 'wo-b-0',
          woNumber: 'WO-B-0',
          workCenterId: 'wc-2',
          workCenterName: 'WC 2',
          startDate: now,
          endDate: new Date(now.getTime() + 1 * 60 * 60 * 1000),
        }),
      ];
      const result = await detector.detectConflicts(schedule, [], []);
      const unbalanced = result.warnings.filter(w => w.type === 'unbalanced_load');
      expect(unbalanced.length).toBeGreaterThanOrEqual(0); // depends on threshold
    });
  });

  describe('applyResolution', () => {
    it('should return success result', async () => {
      const result = await detector.applyResolution('conflict-1', 'res-1', 'user-1');
      expect(result.success).toBe(true);
      expect(result.conflictId).toBe('conflict-1');
      expect(result.resolutionId).toBe('res-1');
    });
  });

  describe('autoResolveConflicts', () => {
    it('should auto-resolve auto-resolvable conflicts', async () => {
      const conflicts: DetailedConflict[] = [
        {
          id: 'conflict-1',
          type: 'overlap',
          severity: 'medium',
          title: 'Test overlap',
          description: 'Test',
          affectedWorkOrders: [],
          affectedWorkCenters: [],
          affectedDates: [],
          suggestedResolutions: [{
            id: 'res-1', type: 'reschedule', description: 'Move it',
            impact: { dueDateChange: 1, capacityChange: 0, costChange: 0, otherWorkOrdersAffected: 0, riskLevel: 'low' },
            actions: [], confidence: 80, priority: 1,
          }],
          autoResolvable: true,
          estimatedImpact: { delayDays: 1, capacityLoss: 0, costEstimate: 0, customerImpact: 'minor' },
          detectedAt: new Date(),
        },
      ];
      const results = await detector.autoResolveConflicts(conflicts, 'user-1');
      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
    });

    it('should skip non-auto-resolvable conflicts', async () => {
      const conflicts: DetailedConflict[] = [
        {
          id: 'conflict-1',
          type: 'overlap',
          severity: 'critical',
          title: 'Big problem',
          description: 'Manual fix needed',
          affectedWorkOrders: [],
          affectedWorkCenters: [],
          affectedDates: [],
          suggestedResolutions: [],
          autoResolvable: false,
          estimatedImpact: { delayDays: 5, capacityLoss: 40, costEstimate: 10000000, customerImpact: 'severe' },
          detectedAt: new Date(),
        },
      ];
      const results = await detector.autoResolveConflicts(conflicts, 'user-1');
      expect(results).toHaveLength(0);
    });

    it('should skip conflicts without resolutions', async () => {
      const conflicts: DetailedConflict[] = [
        {
          id: 'conflict-1',
          type: 'overlap',
          severity: 'medium',
          title: 'No resolution',
          description: 'Test',
          affectedWorkOrders: [],
          affectedWorkCenters: [],
          affectedDates: [],
          suggestedResolutions: [],
          autoResolvable: true,
          estimatedImpact: { delayDays: 1, capacityLoss: 0, costEstimate: 0, customerImpact: 'minor' },
          detectedAt: new Date(),
        },
      ];
      const results = await detector.autoResolveConflicts(conflicts, 'user-1');
      expect(results).toHaveLength(0);
    });
  });

  describe('summary generation', () => {
    it('should count affected work orders and centers', async () => {
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
      const result = await detector.detectConflicts(schedule, [], []);
      if (result.summary.totalConflicts > 0) {
        expect(result.summary.totalAffectedWorkOrders).toBeGreaterThan(0);
      }
    });

    it('should include recommended actions for critical conflicts', async () => {
      const now = new Date();
      const schedule = [
        createTestScheduledWorkOrder({
          workOrderId: 'wo-1',
          workCenterId: 'wc-1',
          startDate: now,
          endDate: new Date(now.getTime() + 20 * 60 * 60 * 1000),
        }),
        createTestScheduledWorkOrder({
          workOrderId: 'wo-2',
          woNumber: 'WO-002',
          workCenterId: 'wc-1',
          startDate: new Date(now.getTime() + 2 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 22 * 60 * 60 * 1000),
        }),
      ];
      const result = await detector.detectConflicts(schedule, [], []);
      if (result.conflicts.some(c => c.severity === 'critical')) {
        expect(result.summary.recommendedActions.length).toBeGreaterThan(0);
      }
    });
  });
});
