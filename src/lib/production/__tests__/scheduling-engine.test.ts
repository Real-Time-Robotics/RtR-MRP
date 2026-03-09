import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  scheduleWorkOrder,
  autoScheduleAll,
  rescheduleOperation,
  getSchedule,
} from '../scheduling-engine';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    workOrder: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    workCenter: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    scheduledOperation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    workOrderOperation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    downtimeRecord: {
      findFirst: vi.fn(),
    },
  },
}));

describe('scheduling-engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('scheduleWorkOrder', () => {
    it('should throw when work order not found', async () => {
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        scheduleWorkOrder({ workOrderId: 'bad-id' })
      ).rejects.toThrow('Work order not found');
    });

    it('should schedule operations sequentially', async () => {
      const startDate = new Date('2025-06-02T08:00:00');

      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'wo-1',
        operations: [
          {
            id: 'op-1',
            workCenterId: 'wc-1',
            plannedSetupTime: 30,
            plannedRunTime: 60,
            routingOperation: { overlapPercent: 0 },
          },
        ],
      });

      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'wc-1', status: 'active' },
      ]);

      // findNextAvailableSlot mocks
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'wc-1',
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        workingDays: [1, 2, 3, 4, 5],
      });
      (prisma.scheduledOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      // checkConflicts mocks
      (prisma.scheduledOperation.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.downtimeRecord.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // save schedule mocks
      (prisma.scheduledOperation.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.workOrderOperation.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await scheduleWorkOrder({ workOrderId: 'wo-1', startDate });

      expect(result.success).toBe(true);
      expect(result.scheduledOperations).toHaveLength(1);
      expect(result.conflicts).toHaveLength(0);
      expect(result.completionDate).toBeDefined();
      expect(prisma.scheduledOperation.upsert).toHaveBeenCalledTimes(1);
    });

    it('should report conflicts for unavailable work centers', async () => {
      const startDate = new Date('2025-06-02T08:00:00');

      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'wo-1',
        operations: [
          {
            id: 'op-1',
            workCenterId: 'wc-bad',
            plannedSetupTime: 30,
            plannedRunTime: 60,
            routingOperation: null,
          },
        ],
      });

      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'wc-bad', status: 'inactive' },
      ]);

      const result = await scheduleWorkOrder({ workOrderId: 'wo-1', startDate });

      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].reason).toContain('not available');
    });

    it('should detect scheduling conflicts with existing operations', async () => {
      const startDate = new Date('2025-06-02T08:00:00');

      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'wo-1',
        operations: [
          {
            id: 'op-1',
            workCenterId: 'wc-1',
            plannedSetupTime: 30,
            plannedRunTime: 60,
            routingOperation: null,
          },
        ],
      });

      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'wc-1', status: 'active' },
      ]);

      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'wc-1',
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        workingDays: [1, 2, 3, 4, 5],
      });

      (prisma.scheduledOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      // Return a conflict
      (prisma.scheduledOperation.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        workOrderOperationId: 'other-op',
      });
      (prisma.downtimeRecord.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      (prisma.scheduledOperation.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.workOrderOperation.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await scheduleWorkOrder({ workOrderId: 'wo-1', startDate });

      expect(result.success).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.scheduledOperations[0].hasConflict).toBe(true);
    });
  });

  describe('rescheduleOperation', () => {
    it('should return error when operation not found', async () => {
      (prisma.workOrderOperation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await rescheduleOperation('bad-id', new Date());

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation not found');
    });

    it('should reschedule successfully when no conflicts', async () => {
      const newStart = new Date('2025-06-10T09:00:00');

      (prisma.workOrderOperation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'op-1',
        workCenterId: 'wc-1',
        plannedSetupTime: 30,
        plannedRunTime: 60,
        scheduledOp: { id: 'sop-1' },
      });

      (prisma.scheduledOperation.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.downtimeRecord.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.scheduledOperation.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.workOrderOperation.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await rescheduleOperation('op-1', newStart);

      expect(result.success).toBe(true);
      expect(prisma.scheduledOperation.update).toHaveBeenCalled();
    });

    it('should return error on conflict', async () => {
      const newStart = new Date('2025-06-10T09:00:00');

      (prisma.workOrderOperation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'op-1',
        workCenterId: 'wc-1',
        plannedSetupTime: 30,
        plannedRunTime: 60,
        scheduledOp: null,
      });

      (prisma.scheduledOperation.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        workOrderOperationId: 'other-op',
      });

      const result = await rescheduleOperation('op-1', newStart);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Conflicts with');
    });
  });

  describe('autoScheduleAll', () => {
    it('should schedule all pending work orders', async () => {
      (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'wo-1', woNumber: 'WO-001', priority: 'high' },
      ]);

      // Mock the internal scheduleWorkOrder calls
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'wo-1',
        operations: [],
      });
      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await autoScheduleAll();

      expect(result.scheduled).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should count failures and record error messages', async () => {
      (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'wo-1', woNumber: 'WO-001', priority: 'normal' },
      ]);
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await autoScheduleAll();

      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('WO-001');
    });

    it('should return zeros for no pending work orders', async () => {
      (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await autoScheduleAll();

      expect(result.scheduled).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getSchedule', () => {
    it('should return schedule grouped by work center', async () => {
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-30');

      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'wc-1', name: 'Assembly', status: 'active' },
      ]);

      (prisma.scheduledOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          workOrderOperationId: 'op-1',
          scheduledStart: new Date('2025-06-05'),
          scheduledEnd: new Date('2025-06-06'),
          status: 'scheduled',
          hasConflict: false,
          workOrderOperation: {
            name: 'Cut',
            workOrder: { woNumber: 'WO-001' },
          },
        },
      ]);

      const result = await getSchedule(startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0].workCenterId).toBe('wc-1');
      expect(result[0].workCenterName).toBe('Assembly');
      expect(result[0].operations).toHaveLength(1);
      expect(result[0].operations[0].workOrderNumber).toBe('WO-001');
    });

    it('should filter by work center IDs', async () => {
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-30');

      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await getSchedule(startDate, endDate, ['wc-1']);

      expect(prisma.workCenter.findMany).toHaveBeenCalledWith({
        where: {
          status: 'active',
          id: { in: ['wc-1'] },
        },
      });
    });

    it('should return empty operations for work center with no scheduled ops', async () => {
      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'wc-1', name: 'Empty WC', status: 'active' },
      ]);
      (prisma.scheduledOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getSchedule(new Date(), new Date());

      expect(result[0].operations).toHaveLength(0);
    });
  });
});
