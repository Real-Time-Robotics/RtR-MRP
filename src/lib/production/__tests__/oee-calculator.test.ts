import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateOEE,
  getOEETrend,
  getOEEDashboard,
} from '../oee-calculator';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    workCenter: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    downtimeRecord: {
      findMany: vi.fn(),
    },
    workOrderOperation: {
      findMany: vi.fn(),
    },
  },
}));

const mockWorkCenter = {
  id: 'wc-1',
  code: 'WC-001',
  name: 'Assembly',
  workingHoursStart: '08:00',
  workingHoursEnd: '17:00',
  breakMinutes: 60,
  workingDays: [1, 2, 3, 4, 5],
  efficiency: 100,
  status: 'active',
};

describe('oee-calculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateOEE', () => {
    it('should throw when work center not found', async () => {
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        calculateOEE('bad-id', new Date(), new Date())
      ).rejects.toThrow('Work center not found');
    });

    it('should return 100% quality when no production', async () => {
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkCenter);
      (prisma.downtimeRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.workOrderOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await calculateOEE(
        'wc-1',
        new Date('2025-06-02'), // Monday
        new Date('2025-06-03')  // Tuesday
      );

      expect(result.quality).toBe(100);
      expect(result.totalCount).toBe(0);
      expect(result.goodCount).toBe(0);
      expect(result.plannedProductionTime).toBeGreaterThan(0);
    });

    it('should calculate full OEE metrics', async () => {
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkCenter);

      // 60 minutes downtime out of 480 planned (1 working day, 8h - 1h break = 480 min)
      (prisma.downtimeRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { durationMinutes: 60 },
      ]);

      // Operations: 100 total, 5 scrapped, run time 2 min/unit
      (prisma.workOrderOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          quantityCompleted: 100,
          quantityScrapped: 5,
          quantityPlanned: 100,
          plannedRunTime: 200,
          routingOperation: { runTimePerUnit: 2 },
        },
      ]);

      const result = await calculateOEE(
        'wc-1',
        new Date('2025-06-02'), // Monday
        new Date('2025-06-03')  // Tuesday
      );

      expect(result.plannedProductionTime).toBe(480);
      expect(result.actualRunTime).toBe(420); // 480 - 60
      expect(result.totalCount).toBe(100);
      expect(result.goodCount).toBe(95);
      expect(result.quality).toBeCloseTo(95, 0);
      expect(result.availability).toBeGreaterThan(0);
      expect(result.performance).toBeGreaterThan(0);
      expect(result.oee).toBeGreaterThan(0);
      expect(result.oee).toBeLessThanOrEqual(100);
    });

    it('should return 0 availability when all downtime', async () => {
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkCenter);

      // Downtime equals planned production time
      (prisma.downtimeRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { durationMinutes: 480 },
      ]);

      (prisma.workOrderOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await calculateOEE(
        'wc-1',
        new Date('2025-06-02'),
        new Date('2025-06-03')
      );

      expect(result.availability).toBe(0);
      expect(result.actualRunTime).toBe(0);
      expect(result.oee).toBe(0);
    });

    it('should handle weekend dates with no working days', async () => {
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkCenter);
      (prisma.downtimeRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.workOrderOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      // Saturday to Sunday - no working days
      const result = await calculateOEE(
        'wc-1',
        new Date('2025-06-07'), // Saturday
        new Date('2025-06-08')  // Sunday
      );

      expect(result.plannedProductionTime).toBe(0);
      expect(result.availability).toBe(0);
    });

    it('should cap performance at 100', async () => {
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkCenter);
      (prisma.downtimeRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      // Very high ideal cycle time relative to actual run time
      (prisma.workOrderOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          quantityCompleted: 1000,
          quantityScrapped: 0,
          quantityPlanned: 1000,
          plannedRunTime: 1000,
          routingOperation: { runTimePerUnit: 10 }, // 10 * 1000 = 10000 >> actualRunTime
        },
      ]);

      const result = await calculateOEE(
        'wc-1',
        new Date('2025-06-02'),
        new Date('2025-06-03')
      );

      expect(result.performance).toBeLessThanOrEqual(100);
    });
  });

  describe('getOEETrend', () => {
    it('should return trend data for multiple periods', async () => {
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkCenter);
      (prisma.downtimeRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.workOrderOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getOEETrend('wc-1', 3, 'week');

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('period');
      expect(result[0]).toHaveProperty('oee');
      expect(result[0]).toHaveProperty('availability');
      expect(result[0]).toHaveProperty('performance');
      expect(result[0]).toHaveProperty('quality');
    });

    it('should support day period type', async () => {
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkCenter);
      (prisma.downtimeRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.workOrderOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getOEETrend('wc-1', 2, 'day');

      expect(result).toHaveLength(2);
    });

    it('should support month period type', async () => {
      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkCenter);
      (prisma.downtimeRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.workOrderOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getOEETrend('wc-1', 2, 'month');

      expect(result).toHaveLength(2);
    });
  });

  describe('getOEEDashboard', () => {
    it('should return dashboard with no work centers', async () => {
      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getOEEDashboard();

      expect(result.overallOEE).toBe(0);
      expect(result.avgAvailability).toBe(0);
      expect(result.workCenters).toHaveLength(0);
      expect(result.topLosses).toHaveLength(3);
    });

    it('should aggregate metrics across work centers', async () => {
      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockWorkCenter,
        { ...mockWorkCenter, id: 'wc-2', code: 'WC-002', name: 'Welding' },
      ]);

      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkCenter);
      (prisma.downtimeRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.workOrderOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getOEEDashboard();

      expect(result.workCenters).toHaveLength(2);
      expect(result.topLosses).toHaveLength(3);
      expect(result.topLosses[0]).toHaveProperty('category');
      expect(result.topLosses[0]).toHaveProperty('minutes');
      expect(result.topLosses[0]).toHaveProperty('percentage');
    });

    it('should classify work center OEE status', async () => {
      (prisma.workCenter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockWorkCenter,
      ]);

      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkCenter);
      (prisma.downtimeRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.workOrderOperation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getOEEDashboard();

      // With no production, OEE = 0 -> "poor"
      expect(result.workCenters[0].status).toBe('poor');
    });
  });
});
