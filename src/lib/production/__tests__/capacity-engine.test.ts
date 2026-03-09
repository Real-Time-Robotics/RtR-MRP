import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateRCCP,
  getWorkCenterUtilization,
  getCapacitySummary,
  updateCapacityRecord,
} from '../capacity-engine';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    workCenter: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    scheduledOperation: {
      findMany: vi.fn(),
    },
    capacityRecord: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    laborEntry: {
      findMany: vi.fn(),
    },
  },
}));

const mockWorkCenter = {
  id: 'wc-1',
  code: 'WC-001',
  name: 'Assembly Line',
  type: 'assembly',
  status: 'active',
  workingHoursStart: '08:00',
  workingHoursEnd: '17:00',
  breakMinutes: 60,
  workingDays: [1, 2, 3, 4, 5], // Mon-Fri
  efficiency: 90,
  hourlyRate: 100,
  setupCostPerHour: 120,
  overheadRate: 15,
};

describe('capacity-engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateRCCP', () => {
    it('should calculate capacity for a week period', async () => {
      // Use a known Monday
      const startDate = new Date('2025-06-02'); // Monday
      const endDate = new Date('2025-06-09'); // Next Monday

      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockWorkCenter,
      ]);

      (prisma.scheduledOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await calculateRCCP(startDate, endDate, 'week');

      expect(result.periods).toHaveLength(1);
      expect(result.periods[0].totalAvailable).toBeGreaterThan(0);
      expect(result.periods[0].totalDemand).toBe(0);
      expect(result.periods[0].workCenters).toHaveLength(1);
      expect(result.periods[0].workCenters[0].status).toBe('under');
    });

    it('should detect over-capacity', async () => {
      const startDate = new Date('2025-06-02');
      const endDate = new Date('2025-06-03');

      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockWorkCenter,
      ]);

      // 20 hours scheduled but only ~7.2 hours available (8h - 1h break * 0.9 eff)
      const opStart = new Date('2025-06-02T08:00:00');
      const opEnd = new Date('2025-06-03T04:00:00'); // 20 hours
      (prisma.scheduledOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          scheduledStart: opStart,
          scheduledEnd: opEnd,
          workOrderOperation: {
            workOrder: { woNumber: 'WO-001' },
          },
        },
      ]);

      const result = await calculateRCCP(startDate, endDate, 'day');

      expect(result.periods[0].workCenters[0].status).toBe('over');
      expect(result.periods[0].overCapacityItems.length).toBeGreaterThan(0);
    });

    it('should handle multiple period types', async () => {
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-30');

      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await calculateRCCP(startDate, endDate, 'month');

      expect(result.periods.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty periods for empty date range', async () => {
      const date = new Date('2025-06-01');
      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await calculateRCCP(date, date);

      expect(result.periods).toHaveLength(0);
    });
  });

  describe('getWorkCenterUtilization', () => {
    it('should throw when work center not found', async () => {
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        getWorkCenterUtilization('bad-id', new Date())
      ).rejects.toThrow('Work center not found');
    });

    it('should calculate utilization for a day', async () => {
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkCenter);
      (prisma.capacityRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const opStart = new Date('2025-06-02T09:00:00');
      const opEnd = new Date('2025-06-02T12:00:00'); // 3 hours
      (prisma.scheduledOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          scheduledStart: opStart,
          scheduledEnd: opEnd,
          status: 'scheduled',
          workOrderOperation: {
            name: 'Cut',
            workOrder: { woNumber: 'WO-001' },
          },
        },
      ]);

      (prisma.laborEntry.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { durationMinutes: 120, type: 'DIRECT' },
      ]);

      const result = await getWorkCenterUtilization('wc-1', new Date('2025-06-02'));

      expect(result.available).toBeGreaterThan(0);
      expect(result.scheduled).toBe(3);
      expect(result.actual).toBe(2); // 120 minutes = 2 hours
      expect(result.utilization).toBeGreaterThan(0);
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].woNumber).toBe('WO-001');
    });

    it('should use capacity record available hours if present', async () => {
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkCenter);
      (prisma.capacityRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        availableHours: 10,
      });
      (prisma.scheduledOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.laborEntry.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getWorkCenterUtilization('wc-1', new Date('2025-06-02'));

      expect(result.available).toBe(10);
    });

    it('should return 0 utilization when no available hours', async () => {
      // Saturday - no working day
      const saturday = new Date('2025-06-07'); // Saturday
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkCenter);
      (prisma.capacityRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        availableHours: 0,
      });
      (prisma.scheduledOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.laborEntry.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getWorkCenterUtilization('wc-1', saturday);

      expect(result.utilization).toBe(0);
    });
  });

  describe('getCapacitySummary', () => {
    it('should return summary for active work centers', async () => {
      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockWorkCenter,
      ]);
      (prisma.scheduledOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getCapacitySummary(
        new Date('2025-06-02'),
        new Date('2025-06-06')
      );

      expect(result.totalWorkCenters).toBe(1);
      expect(result.workCenters).toHaveLength(1);
      expect(result.workCenters[0].code).toBe('WC-001');
      expect(result.workCenters[0].utilizationStatus).toBe('under');
    });

    it('should count over and under capacity', async () => {
      const wcOver = { ...mockWorkCenter, id: 'wc-over', code: 'WC-OVER', name: 'Over' };
      const wcUnder = { ...mockWorkCenter, id: 'wc-under', code: 'WC-UNDER', name: 'Under' };

      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        wcOver,
        wcUnder,
      ]);

      // For wcOver: return many scheduled hours
      // For wcUnder: return no scheduled hours
      let callCount = 0;
      (prisma.scheduledOperation.findMany as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Over-capacity: 100 hours
          const start = new Date('2025-06-02T08:00:00');
          const end = new Date('2025-06-06T12:00:00');
          return Promise.resolve([{ scheduledStart: start, scheduledEnd: end }]);
        }
        return Promise.resolve([]);
      });

      const result = await getCapacitySummary(
        new Date('2025-06-02'),
        new Date('2025-06-06')
      );

      expect(result.overCapacityCount).toBe(1);
      expect(result.underUtilizedCount).toBe(1);
    });

    it('should return 0 avg utilization for no work centers', async () => {
      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getCapacitySummary(new Date(), new Date());

      expect(result.totalWorkCenters).toBe(0);
      expect(result.avgUtilization).toBe(0);
    });
  });

  describe('updateCapacityRecord', () => {
    it('should throw when work center not found', async () => {
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        updateCapacityRecord('bad-id', new Date(), {})
      ).rejects.toThrow('Work center not found');
    });

    it('should upsert capacity record with overtime and downtime', async () => {
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkCenter);
      (prisma.scheduledOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.capacityRecord.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await updateCapacityRecord('wc-1', new Date('2025-06-02'), {
        overtimeHours: 2,
        downtimeHours: 1,
        notes: 'Overtime approved',
      });

      expect(prisma.capacityRecord.upsert).toHaveBeenCalledTimes(1);
      const call = (prisma.capacityRecord.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.create.overtimeHours).toBe(2);
      expect(call.create.downtimeHours).toBe(1);
      expect(call.create.notes).toBe('Overtime approved');
    });
  });
});
