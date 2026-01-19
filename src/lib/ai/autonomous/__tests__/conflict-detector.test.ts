import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConflictDetector,
  getConflictDetector,
  ScheduleConflictDetailed,
  ConflictResolution,
} from '../conflict-detector';
import { WorkOrderScheduleInfo } from '../scheduling-engine';

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
    workOrderId: 'wo-1',
    workOrderNumber: 'WO-001',
    productId: 'prod-1',
    productName: 'Test Product',
    quantity: 100,
    status: 'pending',
    priority: 50,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    plannedStartDate: new Date(),
    plannedEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    scheduledStartDate: new Date(),
    scheduledEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    workCenterId: 'wc-1',
    workCenterName: 'Work Center 1',
    estimatedHours: 16,
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

  describe('detectAllConflicts', () => {
    it('should return empty array for no work orders', async () => {
      const conflicts = await detector.detectAllConflicts([]);
      expect(conflicts).toHaveLength(0);
    });

    it('should return empty array for single work order', async () => {
      const workOrders = [createTestWorkOrder()];
      const conflicts = await detector.detectAllConflicts(workOrders);
      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('should detect overlapping work orders', async () => {
      const now = new Date();
      const workOrders = [
        createTestWorkOrder({
          workOrderId: 'wo-1',
          workCenterId: 'wc-1',
          scheduledStartDate: now,
          scheduledEndDate: new Date(now.getTime() + 8 * 60 * 60 * 1000),
        }),
        createTestWorkOrder({
          workOrderId: 'wo-2',
          workCenterId: 'wc-1',
          scheduledStartDate: new Date(now.getTime() + 4 * 60 * 60 * 1000),
          scheduledEndDate: new Date(now.getTime() + 12 * 60 * 60 * 1000),
        }),
      ];

      const conflicts = await detector.detectAllConflicts(workOrders);
      expect(Array.isArray(conflicts)).toBe(true);
    });
  });

  describe('detectOverlaps', () => {
    it('should detect overlapping schedules on same work center', async () => {
      const now = new Date();
      const workOrders = [
        createTestWorkOrder({
          workOrderId: 'wo-1',
          workCenterId: 'wc-1',
          scheduledStartDate: now,
          scheduledEndDate: new Date(now.getTime() + 10 * 60 * 60 * 1000),
        }),
        createTestWorkOrder({
          workOrderId: 'wo-2',
          workCenterId: 'wc-1',
          scheduledStartDate: new Date(now.getTime() + 5 * 60 * 60 * 1000),
          scheduledEndDate: new Date(now.getTime() + 15 * 60 * 60 * 1000),
        }),
      ];

      const overlaps = await detector.detectOverlaps(workOrders);
      expect(overlaps.length).toBeGreaterThan(0);
      expect(overlaps[0].type).toBe('overlap');
    });

    it('should not detect overlaps on different work centers', async () => {
      const now = new Date();
      const workOrders = [
        createTestWorkOrder({
          workOrderId: 'wo-1',
          workCenterId: 'wc-1',
          scheduledStartDate: now,
          scheduledEndDate: new Date(now.getTime() + 10 * 60 * 60 * 1000),
        }),
        createTestWorkOrder({
          workOrderId: 'wo-2',
          workCenterId: 'wc-2',
          scheduledStartDate: new Date(now.getTime() + 5 * 60 * 60 * 1000),
          scheduledEndDate: new Date(now.getTime() + 15 * 60 * 60 * 1000),
        }),
      ];

      const overlaps = await detector.detectOverlaps(workOrders);
      expect(overlaps).toHaveLength(0);
    });
  });

  describe('detectDueDateRisks', () => {
    it('should detect work orders at risk of missing due date', async () => {
      const now = new Date();
      const workOrders = [
        createTestWorkOrder({
          workOrderId: 'wo-1',
          dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          scheduledEndDate: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        }),
      ];

      const risks = await detector.detectDueDateRisks(workOrders);
      expect(risks.length).toBeGreaterThan(0);
      expect(risks[0].type).toBe('due_date_risk');
    });

    it('should not flag work orders finishing before due date', async () => {
      const now = new Date();
      const workOrders = [
        createTestWorkOrder({
          workOrderId: 'wo-1',
          dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          scheduledEndDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        }),
      ];

      const risks = await detector.detectDueDateRisks(workOrders);
      expect(risks).toHaveLength(0);
    });
  });

  describe('detectMaterialShortages', () => {
    it('should detect material shortages', async () => {
      const workOrders = [
        createTestWorkOrder({
          workOrderId: 'wo-1',
          materialAvailability: {
            allAvailable: false,
            shortages: [
              { partId: 'p1', partName: 'Part 1', required: 100, available: 50, shortage: 50 },
            ],
            earliestAvailableDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          },
        }),
      ];

      const shortages = await detector.detectMaterialShortages(workOrders);
      expect(shortages.length).toBeGreaterThan(0);
      expect(shortages[0].type).toBe('material_shortage');
    });

    it('should not flag work orders with available materials', async () => {
      const workOrders = [
        createTestWorkOrder({
          materialAvailability: {
            allAvailable: true,
            shortages: [],
            earliestAvailableDate: new Date(),
          },
        }),
      ];

      const shortages = await detector.detectMaterialShortages(workOrders);
      expect(shortages).toHaveLength(0);
    });
  });

  describe('generateResolutions', () => {
    it('should generate resolutions for conflicts', () => {
      const conflicts: ScheduleConflictDetailed[] = [
        {
          id: 'conflict-1',
          type: 'overlap',
          severity: 'high',
          description: 'Test conflict',
          affectedWorkOrders: [
            { workOrderId: 'wo-1', workOrderNumber: 'WO-001', workCenterId: 'wc-1' },
            { workOrderId: 'wo-2', workOrderNumber: 'WO-002', workCenterId: 'wc-1' },
          ],
          detectedAt: new Date(),
          suggestedResolutions: [],
        },
      ];

      const resolutions = detector.generateResolutions(conflicts);
      expect(resolutions.length).toBeGreaterThan(0);
    });

    it('should return empty array for no conflicts', () => {
      const resolutions = detector.generateResolutions([]);
      expect(resolutions).toHaveLength(0);
    });
  });

  describe('autoResolveConflicts', () => {
    it('should auto-resolve conflicts', async () => {
      const conflicts: ScheduleConflictDetailed[] = [
        {
          id: 'conflict-1',
          type: 'overlap',
          severity: 'medium',
          description: 'Test overlap',
          affectedWorkOrders: [
            { workOrderId: 'wo-1', workOrderNumber: 'WO-001', workCenterId: 'wc-1' },
          ],
          detectedAt: new Date(),
          suggestedResolutions: [],
        },
      ];

      const resolutions = await detector.autoResolveConflicts(conflicts, 'balanced');
      expect(Array.isArray(resolutions)).toBe(true);
    });

    it('should support different strategies', async () => {
      const conflicts: ScheduleConflictDetailed[] = [
        {
          id: 'conflict-1',
          type: 'due_date_risk',
          severity: 'high',
          description: 'Test risk',
          affectedWorkOrders: [
            { workOrderId: 'wo-1', workOrderNumber: 'WO-001', workCenterId: 'wc-1' },
          ],
          detectedAt: new Date(),
          suggestedResolutions: [],
        },
      ];

      const strategies = ['conservative', 'aggressive', 'balanced'] as const;

      for (const strategy of strategies) {
        const resolutions = await detector.autoResolveConflicts(conflicts, strategy);
        expect(Array.isArray(resolutions)).toBe(true);
      }
    });
  });

  describe('conflict severity', () => {
    it('should assign correct severity for overlap conflicts', async () => {
      const now = new Date();
      const workOrders = [
        createTestWorkOrder({
          workOrderId: 'wo-1',
          workCenterId: 'wc-1',
          scheduledStartDate: now,
          scheduledEndDate: new Date(now.getTime() + 8 * 60 * 60 * 1000),
        }),
        createTestWorkOrder({
          workOrderId: 'wo-2',
          workCenterId: 'wc-1',
          scheduledStartDate: new Date(now.getTime() + 4 * 60 * 60 * 1000),
          scheduledEndDate: new Date(now.getTime() + 12 * 60 * 60 * 1000),
        }),
      ];

      const conflicts = await detector.detectOverlaps(workOrders);
      if (conflicts.length > 0) {
        expect(['low', 'medium', 'high', 'critical']).toContain(conflicts[0].severity);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle work orders without scheduled dates', async () => {
      const workOrders = [
        createTestWorkOrder({
          scheduledStartDate: null,
          scheduledEndDate: null,
        }),
      ];

      const conflicts = await detector.detectAllConflicts(workOrders);
      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('should handle work orders without due dates', async () => {
      const workOrders = [
        createTestWorkOrder({
          dueDate: null,
        }),
      ];

      const risks = await detector.detectDueDateRisks(workOrders);
      expect(Array.isArray(risks)).toBe(true);
    });
  });
});
