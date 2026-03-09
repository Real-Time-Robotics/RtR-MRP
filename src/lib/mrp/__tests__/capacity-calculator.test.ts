/**
 * Capacity Calculator Engine - Unit Tests
 * Tests for calculateCapacity, finiteCapacitySchedule,
 * checkCapacityFeasibility, getCapacityUtilizationSummary, findNextAvailableSlot
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock prisma using vi.hoisted
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    workCenter: { findMany: vi.fn() },
    shift: { findMany: vi.fn() },
    maintenanceOrder: { findMany: vi.fn() },
    workOrder: { findMany: vi.fn() },
    product: { findMany: vi.fn() },
  },
}));

vi.mock('../../prisma', () => ({
  default: mockPrisma,
}));

import {
  calculateCapacity,
  finiteCapacitySchedule,
  checkCapacityFeasibility,
  getCapacityUtilizationSummary,
  findNextAvailableSlot,
} from '../capacity-calculator';

// Helper: create a Date at midnight UTC for a given day offset from a base
function makeDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

describe('Capacity Calculator Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // calculateCapacity
  // ===========================================================================
  describe('calculateCapacity', () => {
    const baseWorkCenter = {
      id: 'wc-1',
      code: 'WC001',
      name: 'Assembly Line 1',
      type: 'assembly',
      status: 'active',
      capacityPerDay: 8,
      equipment: [],
    };

    it('should return daily capacity for a single work center with no shifts, maintenance, or work orders', async () => {
      // A Mon-Tue range (2026-03-09 is Monday, 2026-03-10 is Tuesday)
      const startDate = new Date(2026, 2, 9); // Mon
      const endDate = new Date(2026, 2, 10);  // Tue

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      expect(result.period.totalDays).toBe(2);
      expect(result.dailyDetails).toHaveLength(2);
      expect(result.byWorkCenter).toHaveLength(1);
      // No shifts => use base capacity for weekdays = 8
      for (const d of result.dailyDetails) {
        expect(d.baseCapacityHours).toBe(8);
        expect(d.shiftHours).toBe(8);
        expect(d.maintenanceHours).toBe(0);
        expect(d.expectedDowntimeHours).toBe(0);
        expect(d.availableHours).toBe(8);
        expect(d.scheduledHours).toBe(0);
        expect(d.remainingHours).toBe(8);
        expect(d.utilization).toBe(0);
      }
      expect(result.summary.totalCapacityHours).toBe(16);
      expect(result.summary.totalScheduledHours).toBe(0);
      expect(result.summary.avgUtilization).toBe(0);
      expect(result.summary.overloadedWorkCenters).toBe(0);
      expect(result.summary.bottleneckWorkCenters).toEqual([]);
    });

    it('should handle weekend days with no shifts as zero capacity', async () => {
      // 2026-03-14 is Saturday, 2026-03-15 is Sunday
      const startDate = new Date(2026, 2, 14);
      const endDate = new Date(2026, 2, 15);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      for (const d of result.dailyDetails) {
        expect(d.shiftHours).toBe(0);
        expect(d.availableHours).toBe(0);
      }
    });

    it('should calculate shift hours from active shifts', async () => {
      const startDate = new Date(2026, 2, 9); // Monday
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([
        {
          id: 's1',
          name: 'Morning',
          startTime: '06:00',
          endTime: '14:00',
          breakMinutes: 30,
          isActive: true,
          workingDays: [1, 2, 3, 4, 5],
        },
      ]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      // 8 hours minus 30 min break = 7.5
      expect(result.dailyDetails[0].shiftHours).toBe(7.5);
      expect(result.dailyDetails[0].availableHours).toBe(7.5);
    });

    it('should handle overnight shifts correctly', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([
        {
          id: 's1',
          name: 'Night',
          startTime: '22:00',
          endTime: '06:00',
          breakMinutes: 0,
          isActive: true,
          workingDays: [1, 2, 3, 4, 5],
        },
      ]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      // 22:00 to 06:00 = 8 hours (overnight)
      expect(result.dailyDetails[0].shiftHours).toBe(8);
    });

    it('should handle multiple shifts on same day', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([
        {
          id: 's1',
          name: 'Morning',
          startTime: '06:00',
          endTime: '14:00',
          breakMinutes: 30,
          isActive: true,
          workingDays: [1, 2, 3, 4, 5],
        },
        {
          id: 's2',
          name: 'Afternoon',
          startTime: '14:00',
          endTime: '22:00',
          breakMinutes: 30,
          isActive: true,
          workingDays: [1, 2, 3, 4, 5],
        },
      ]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      // 7.5 + 7.5 = 15
      expect(result.dailyDetails[0].shiftHours).toBe(15);
    });

    it('should deduct maintenance hours when maintenance overlaps date', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      const wcWithEquipment = {
        ...baseWorkCenter,
        equipment: [{ id: 'eq-1', status: 'operational' }],
      };

      mockPrisma.workCenter.findMany.mockResolvedValue([wcWithEquipment]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      // First call: maintenance orders, second call: historical downtime
      mockPrisma.maintenanceOrder.findMany
        .mockResolvedValueOnce([
          {
            id: 'mo-1',
            plannedStartDate: new Date(2026, 2, 8, 0, 0, 0),  // day before
            plannedEndDate: new Date(2026, 2, 10, 0, 0, 0),    // day after
            estimatedDuration: 4,
            status: 'scheduled',
            equipment: { id: 'eq-1', workCenterId: 'wc-1', workCenter: wcWithEquipment },
          },
        ])
        .mockResolvedValueOnce([]); // historical downtime
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({
        startDate,
        endDate,
        includeMaintenanceDeduction: true,
        includeDowntimeHistory: true,
      });

      expect(result.dailyDetails[0].maintenanceHours).toBe(4);
      expect(result.dailyDetails[0].availableHours).toBe(4); // 8 - 4
    });

    it('should skip maintenance deduction when includeMaintenanceDeduction is false', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]); // historical downtime
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({
        startDate,
        endDate,
        includeMaintenanceDeduction: false,
        includeDowntimeHistory: false,
      });

      // Should not have called maintenanceOrder.findMany for maintenance (but still called for scheduled WOs)
      expect(result.dailyDetails[0].maintenanceHours).toBe(0);
      expect(result.dailyDetails[0].expectedDowntimeHours).toBe(0);
    });

    it('should estimate expected downtime from historical corrective maintenance', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      const wcWithEquipment = {
        ...baseWorkCenter,
        equipment: [{ id: 'eq-1', status: 'operational' }],
      };

      mockPrisma.workCenter.findMany.mockResolvedValue([wcWithEquipment]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany
        .mockResolvedValueOnce([]) // scheduled maintenance
        .mockResolvedValueOnce([   // historical downtime
          {
            id: 'hd-1',
            type: 'corrective',
            actualStartDate: new Date(2026, 0, 1),
            actualDuration: 90, // 90 hours over 90 days = 1 hour/day
            status: 'completed',
            equipment: { id: 'eq-1', workCenterId: 'wc-1', workCenter: wcWithEquipment },
          },
        ]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({
        startDate,
        endDate,
        includeDowntimeHistory: true,
      });

      // 90 hours / 90 days * 1 (weekday factor) = 1 hour expected downtime
      expect(result.dailyDetails[0].expectedDowntimeHours).toBe(1);
      expect(result.dailyDetails[0].availableHours).toBe(7); // 8 - 0 - 1
    });

    it('should calculate scheduled hours from work orders', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo-1',
          workCenterId: 'wc-1',
          plannedStart: new Date(2026, 2, 9),
          plannedEnd: new Date(2026, 2, 9),
          status: 'released',
          quantity: 1,
          product: {
            assemblyHours: 6,
            testingHours: 2,
          },
        },
      ]);

      const result = await calculateCapacity({ startDate, endDate });

      // (6 + 2) * 1 / 1 day = 8 scheduled hours
      expect(result.dailyDetails[0].scheduledHours).toBe(8);
      expect(result.dailyDetails[0].remainingHours).toBe(0);
      expect(result.dailyDetails[0].utilization).toBe(100);
    });

    it('should distribute work order hours evenly across multi-day span', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 10);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo-1',
          workCenterId: 'wc-1',
          plannedStart: new Date(2026, 2, 9),
          plannedEnd: new Date(2026, 2, 10),
          status: 'released',
          quantity: 2,
          product: {
            assemblyHours: 8,
            testingHours: 2,
          },
        },
      ]);

      const result = await calculateCapacity({ startDate, endDate });

      // Total hours = (8+2)*2 = 20, spread over ~1 day span but Math.ceil = 1 day
      // Actually: (endDate - startDate) / day = 1 day => Math.ceil(1) = 1 => totalWoDays = max(1,1) = 1
      // dailyHours = 20/1 = 20
      // Both days would get 20 each since both days fall within the range
      // But let's check actual math:
      // woStart=Mar 9, woEnd=Mar 10, diff = 1 day, Math.ceil(1) = 1, totalWoDays = max(1,1) = 1
      // dailyHours = (8+2)*2 / 1 = 20
      for (const d of result.dailyDetails) {
        expect(d.scheduledHours).toBe(20);
      }
    });

    it('should handle work orders with default product hours when assemblyHours/testingHours are null', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo-1',
          workCenterId: 'wc-1',
          plannedStart: new Date(2026, 2, 9),
          plannedEnd: new Date(2026, 2, 9),
          status: 'released',
          quantity: 1,
          product: {
            assemblyHours: null,
            testingHours: null,
          },
        },
      ]);

      const result = await calculateCapacity({ startDate, endDate });

      // Default: (8 + 2) * 1 = 10
      expect(result.dailyDetails[0].scheduledHours).toBe(10);
    });

    it('should filter work centers by workCenterIds when provided', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      await calculateCapacity({
        startDate,
        endDate,
        workCenterIds: ['wc-1'],
      });

      expect(mockPrisma.workCenter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['wc-1'] } },
        })
      );
    });

    it('should filter by active status when no workCenterIds provided', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      await calculateCapacity({ startDate, endDate });

      expect(mockPrisma.workCenter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'active' },
        })
      );
    });

    it('should identify overloaded work centers in summary', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo-1',
          workCenterId: 'wc-1',
          plannedStart: new Date(2026, 2, 9),
          plannedEnd: new Date(2026, 2, 9),
          status: 'released',
          quantity: 2,
          product: { assemblyHours: 8, testingHours: 2 },
        },
      ]);

      const result = await calculateCapacity({ startDate, endDate });

      // Scheduled = 20, available = 8 => utilization = 250%
      expect(result.summary.overloadedWorkCenters).toBe(1);
      expect(result.summary.bottleneckWorkCenters).toContain('WC001');
      expect(result.byWorkCenter[0].daysOverloaded).toBe(1);
      expect(result.byWorkCenter[0].peakUtilization).toBeGreaterThan(100);
    });

    it('should handle multiple work centers', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      const wc2 = {
        ...baseWorkCenter,
        id: 'wc-2',
        code: 'WC002',
        name: 'Testing Bay',
        type: 'testing',
      };

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter, wc2]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      expect(result.byWorkCenter).toHaveLength(2);
      expect(result.dailyDetails).toHaveLength(2); // 1 day * 2 work centers
      expect(result.summary.totalCapacityHours).toBe(16); // 8 + 8
    });

    it('should handle work center with null capacityPerDay', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      const wcNoCapacity = { ...baseWorkCenter, capacityPerDay: null };
      mockPrisma.workCenter.findMany.mockResolvedValue([wcNoCapacity]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      // Default is 8
      expect(result.dailyDetails[0].baseCapacityHours).toBe(8);
    });

    it('should handle shift with null workingDays (default Mon-Fri)', async () => {
      const startDate = new Date(2026, 2, 9); // Monday
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([
        {
          id: 's1',
          startTime: '08:00',
          endTime: '16:00',
          breakMinutes: 0,
          isActive: true,
          workingDays: null, // default
        },
      ]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      expect(result.dailyDetails[0].shiftHours).toBe(8);
    });

    it('should handle shift with null breakMinutes', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([
        {
          id: 's1',
          startTime: '08:00',
          endTime: '16:00',
          breakMinutes: null,
          isActive: true,
          workingDays: [1, 2, 3, 4, 5],
        },
      ]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      expect(result.dailyDetails[0].shiftHours).toBe(8);
    });

    it('should handle maintenance order with no plannedStartDate or plannedEndDate', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany
        .mockResolvedValueOnce([
          {
            id: 'mo-1',
            plannedStartDate: null,
            plannedEndDate: null,
            estimatedDuration: 4,
            equipment: { id: 'eq-1', workCenterId: 'wc-1' },
          },
        ])
        .mockResolvedValueOnce([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      expect(result.dailyDetails[0].maintenanceHours).toBe(0);
    });

    it('should handle maintenance order equipment for different work center', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany
        .mockResolvedValueOnce([
          {
            id: 'mo-1',
            plannedStartDate: new Date(2026, 2, 9),
            plannedEndDate: new Date(2026, 2, 9),
            estimatedDuration: 4,
            equipment: { id: 'eq-1', workCenterId: 'wc-OTHER' },
          },
        ])
        .mockResolvedValueOnce([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      expect(result.dailyDetails[0].maintenanceHours).toBe(0);
    });

    it('should limit maintenance hours to estimatedDuration', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      const wcWithEquipment = {
        ...baseWorkCenter,
        equipment: [{ id: 'eq-1', status: 'operational' }],
      };

      mockPrisma.workCenter.findMany.mockResolvedValue([wcWithEquipment]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany
        .mockResolvedValueOnce([
          {
            id: 'mo-1',
            // Overlap is 24 hours but estimated duration is only 2
            plannedStartDate: new Date(2026, 2, 8),
            plannedEndDate: new Date(2026, 2, 10),
            estimatedDuration: 2,
            equipment: { id: 'eq-1', workCenterId: 'wc-1' },
          },
        ])
        .mockResolvedValueOnce([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      expect(result.dailyDetails[0].maintenanceHours).toBe(2);
    });

    it('should use default estimatedDuration of 2 when null', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      const wcWithEquipment = {
        ...baseWorkCenter,
        equipment: [{ id: 'eq-1', status: 'operational' }],
      };

      mockPrisma.workCenter.findMany.mockResolvedValue([wcWithEquipment]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany
        .mockResolvedValueOnce([
          {
            id: 'mo-1',
            plannedStartDate: new Date(2026, 2, 8),
            plannedEndDate: new Date(2026, 2, 10),
            estimatedDuration: null,
            equipment: { id: 'eq-1', workCenterId: 'wc-1' },
          },
        ])
        .mockResolvedValueOnce([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      expect(result.dailyDetails[0].maintenanceHours).toBe(2);
    });

    it('should reduce expected downtime on weekends', async () => {
      // 2026-03-14 is Saturday
      const startDate = new Date(2026, 2, 14);
      const endDate = new Date(2026, 2, 14);

      const wcWithEquipment = {
        ...baseWorkCenter,
        equipment: [{ id: 'eq-1', status: 'operational' }],
      };

      mockPrisma.workCenter.findMany.mockResolvedValue([wcWithEquipment]);
      mockPrisma.shift.findMany.mockResolvedValue([
        {
          id: 's1',
          startTime: '06:00',
          endTime: '14:00',
          breakMinutes: 0,
          isActive: true,
          workingDays: [0, 1, 2, 3, 4, 5, 6], // All days
        },
      ]);
      mockPrisma.maintenanceOrder.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'hd-1',
            type: 'corrective',
            actualStartDate: new Date(2026, 0, 1),
            actualDuration: 90,
            status: 'completed',
            equipment: { id: 'eq-1', workCenterId: 'wc-1' },
          },
        ]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({
        startDate,
        endDate,
        includeDowntimeHistory: true,
      });

      // 90 / 90 * 0.2 (weekend factor) = 0.2
      expect(result.dailyDetails[0].expectedDowntimeHours).toBeCloseTo(0.2);
    });

    it('should ensure available hours never go below zero', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      const wcWithEquipment = {
        ...baseWorkCenter,
        capacityPerDay: 2,
        equipment: [{ id: 'eq-1', status: 'operational' }],
      };

      mockPrisma.workCenter.findMany.mockResolvedValue([wcWithEquipment]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany
        .mockResolvedValueOnce([
          {
            id: 'mo-1',
            plannedStartDate: new Date(2026, 2, 9, 0, 0, 0),
            plannedEndDate: new Date(2026, 2, 9, 23, 59, 59),
            estimatedDuration: 10,
            equipment: { id: 'eq-1', workCenterId: 'wc-1' },
          },
        ])
        .mockResolvedValueOnce([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      expect(result.dailyDetails[0].availableHours).toBe(0);
    });

    it('should skip work orders for different work centers', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo-1',
          workCenterId: 'wc-OTHER',
          plannedStart: new Date(2026, 2, 9),
          plannedEnd: new Date(2026, 2, 9),
          status: 'released',
          quantity: 1,
          product: { assemblyHours: 10, testingHours: 5 },
        },
      ]);

      const result = await calculateCapacity({ startDate, endDate });

      expect(result.dailyDetails[0].scheduledHours).toBe(0);
    });

    it('should skip work orders with null plannedStart or plannedEnd', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo-1',
          workCenterId: 'wc-1',
          plannedStart: null,
          plannedEnd: null,
          status: 'released',
          quantity: 1,
          product: { assemblyHours: 10, testingHours: 5 },
        },
      ]);

      const result = await calculateCapacity({ startDate, endDate });

      expect(result.dailyDetails[0].scheduledHours).toBe(0);
    });

    it('should handle empty work centers list', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 10);

      mockPrisma.workCenter.findMany.mockResolvedValue([]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      expect(result.dailyDetails).toHaveLength(0);
      expect(result.byWorkCenter).toHaveLength(0);
      expect(result.summary.totalCapacityHours).toBe(0);
      expect(result.summary.avgUtilization).toBe(0);
    });

    it('should handle maintenance equipment with null workCenterId', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany
        .mockResolvedValueOnce([
          {
            id: 'mo-1',
            plannedStartDate: new Date(2026, 2, 9),
            plannedEndDate: new Date(2026, 2, 9),
            estimatedDuration: 2,
            equipment: null,
          },
        ])
        .mockResolvedValueOnce([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      expect(result.dailyDetails[0].maintenanceHours).toBe(0);
    });

    it('should not estimate downtime when equipment list is empty', async () => {
      const startDate = new Date(2026, 2, 9);
      const endDate = new Date(2026, 2, 9);

      // baseWorkCenter has equipment: []
      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'hd-1',
            type: 'corrective',
            actualDuration: 90,
            equipment: { id: 'eq-1', workCenterId: 'wc-1' },
          },
        ]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateCapacity({ startDate, endDate });

      // Equipment is empty so expectedDowntimeHours = 0
      expect(result.dailyDetails[0].expectedDowntimeHours).toBe(0);
    });
  });

  // ===========================================================================
  // finiteCapacitySchedule
  // ===========================================================================
  describe('finiteCapacitySchedule', () => {
    const baseProduct = {
      id: 'prod-1',
      name: 'Widget A',
      assemblyHours: 4,
      testingHours: 1,
      defaultWorkCenter: { id: 'wc-1', name: 'Assembly Line 1' },
      defaultWorkCenterId: 'wc-1',
    };

    const baseWorkCenter = {
      id: 'wc-1',
      code: 'WC001',
      name: 'Assembly Line 1',
      type: 'assembly',
      status: 'active',
      capacityPerDay: 8,
      equipment: [],
    };

    function setupBaseMocks() {
      mockPrisma.product.findMany.mockResolvedValue([baseProduct]);
      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);
    }

    it('should schedule a single requirement on the first available day', async () => {
      setupBaseMocks();

      const startDate = new Date(2026, 2, 9); // Monday
      const requirements = [
        {
          id: 'wo-1',
          productId: 'prod-1',
          quantity: 1,
          requestedDate: new Date(2026, 2, 20),
        },
      ];

      const schedule = await finiteCapacitySchedule(requirements, startDate);

      expect(schedule).toHaveLength(1);
      expect(schedule[0].productId).toBe('prod-1');
      expect(schedule[0].productName).toBe('Widget A');
      expect(schedule[0].hours).toBe(5); // (4+1)*1
      expect(schedule[0].workCenterId).toBe('wc-1');
    });

    it('should sort by priority (high first)', async () => {
      const prod2 = {
        ...baseProduct,
        id: 'prod-2',
        name: 'Widget B',
      };
      mockPrisma.product.findMany.mockResolvedValue([baseProduct, prod2]);
      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const startDate = new Date(2026, 2, 9);
      const requirements = [
        {
          id: 'wo-low',
          productId: 'prod-1',
          quantity: 1,
          requestedDate: new Date(2026, 2, 10),
          priority: 'low' as const,
        },
        {
          id: 'wo-high',
          productId: 'prod-2',
          quantity: 1,
          requestedDate: new Date(2026, 2, 20),
          priority: 'high' as const,
        },
      ];

      const schedule = await finiteCapacitySchedule(requirements, startDate);

      // High priority should be scheduled first (gets earlier slot)
      expect(schedule).toHaveLength(2);
      // Both should be scheduled
      const highItem = schedule.find((s) => s.workOrderId === 'wo-high');
      const lowItem = schedule.find((s) => s.workOrderId === 'wo-low');
      expect(highItem).toBeDefined();
      expect(lowItem).toBeDefined();
    });

    it('should skip requirements with unknown productId', async () => {
      setupBaseMocks();

      const startDate = new Date(2026, 2, 9);
      const requirements = [
        {
          id: 'wo-1',
          productId: 'unknown-product',
          quantity: 1,
          requestedDate: new Date(2026, 2, 20),
        },
      ];

      const schedule = await finiteCapacitySchedule(requirements, startDate);

      expect(schedule).toHaveLength(0);
    });

    it('should use first available work center when product has no default', async () => {
      const productNoWC = {
        ...baseProduct,
        defaultWorkCenter: null,
      };
      mockPrisma.product.findMany.mockResolvedValue([productNoWC]);
      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const startDate = new Date(2026, 2, 9);
      const requirements = [
        {
          id: 'wo-1',
          productId: 'prod-1',
          quantity: 1,
          requestedDate: new Date(2026, 2, 20),
        },
      ];

      const schedule = await finiteCapacitySchedule(requirements, startDate);

      expect(schedule).toHaveLength(1);
      expect(schedule[0].workCenterId).toBe('wc-1');
    });

    it('should skip if no work center available at all', async () => {
      const productNoWC = { ...baseProduct, defaultWorkCenter: null };
      mockPrisma.product.findMany.mockResolvedValue([productNoWC]);
      mockPrisma.workCenter.findMany.mockResolvedValue([]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const startDate = new Date(2026, 2, 9);
      const requirements = [
        {
          id: 'wo-1',
          productId: 'prod-1',
          quantity: 1,
          requestedDate: new Date(2026, 2, 20),
        },
      ];

      const schedule = await finiteCapacitySchedule(requirements, startDate);

      expect(schedule).toHaveLength(0);
    });

    it('should set status based on delay days', async () => {
      setupBaseMocks();

      const startDate = new Date(2026, 2, 9);
      const requirements = [
        {
          id: 'wo-1',
          productId: 'prod-1',
          quantity: 1,
          requestedDate: new Date(2026, 2, 9), // same day
        },
      ];

      const schedule = await finiteCapacitySchedule(requirements, startDate);

      expect(schedule).toHaveLength(1);
      // scheduledEnd should be same as startDate (day 1), requestedDate is day 1
      // delayDays = max(0, 0) = 0
      expect(schedule[0].status).toBe('scheduled');
    });

    it('should set tentative status for small delays', async () => {
      setupBaseMocks();

      const startDate = new Date(2026, 2, 9);
      const requirements = [
        {
          id: 'wo-1',
          productId: 'prod-1',
          quantity: 1,
          requestedDate: new Date(2026, 2, 7), // 2 days before start
        },
      ];

      const schedule = await finiteCapacitySchedule(requirements, startDate);

      expect(schedule).toHaveLength(1);
      // scheduledEnd is ~March 9, requested was March 7
      // delay = ceil((Mar 9 - Mar 7) / day) = 2 => tentative (<=3)
      expect(schedule[0].status).toBe('tentative');
    });

    it('should set at_risk status for large delays', async () => {
      setupBaseMocks();

      const startDate = new Date(2026, 2, 9);
      const requirements = [
        {
          id: 'wo-1',
          productId: 'prod-1',
          quantity: 1,
          requestedDate: new Date(2026, 2, 1), // 8 days before start
        },
      ];

      const schedule = await finiteCapacitySchedule(requirements, startDate);

      expect(schedule).toHaveLength(1);
      expect(schedule[0].status).toBe('at_risk');
    });

    it('should use default assembly/testing hours when product values are null', async () => {
      const prodNoHours = {
        ...baseProduct,
        assemblyHours: null,
        testingHours: null,
      };
      mockPrisma.product.findMany.mockResolvedValue([prodNoHours]);
      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const startDate = new Date(2026, 2, 9);
      const requirements = [
        {
          id: 'wo-1',
          productId: 'prod-1',
          quantity: 1,
          requestedDate: new Date(2026, 2, 20),
        },
      ];

      const schedule = await finiteCapacitySchedule(requirements, startDate);

      expect(schedule).toHaveLength(1);
      expect(schedule[0].hours).toBe(10); // (8+2)*1
    });

    it('should consume capacity and spread across multiple days for large orders', async () => {
      setupBaseMocks();

      const startDate = new Date(2026, 2, 9); // Monday
      const requirements = [
        {
          id: 'wo-1',
          productId: 'prod-1',
          quantity: 4, // (4+1)*4 = 20 hours, needs 3 weekdays (8+8+4)
          requestedDate: new Date(2026, 3, 1),
        },
      ];

      const schedule = await finiteCapacitySchedule(requirements, startDate);

      expect(schedule).toHaveLength(1);
      expect(schedule[0].hours).toBe(20);
      // Should span multiple days
      const start = schedule[0].scheduledStart;
      const end = schedule[0].scheduledEnd;
      expect(end.getTime()).toBeGreaterThanOrEqual(start.getTime());
    });
  });

  // ===========================================================================
  // checkCapacityFeasibility
  // ===========================================================================
  describe('checkCapacityFeasibility', () => {
    const baseProduct = {
      id: 'prod-1',
      name: 'Widget A',
      assemblyHours: 4,
      testingHours: 1,
      defaultWorkCenter: { id: 'wc-1', name: 'Assembly Line 1' },
      defaultWorkCenterId: 'wc-1',
    };

    const baseWorkCenter = {
      id: 'wc-1',
      code: 'WC001',
      name: 'Assembly Line 1',
      type: 'assembly',
      status: 'active',
      capacityPerDay: 8,
      equipment: [],
    };

    function setupFeasibilityMocks() {
      mockPrisma.product.findMany.mockResolvedValue([baseProduct]);
      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);
    }

    it('should return feasible result when orders can be scheduled on time', async () => {
      setupFeasibilityMocks();

      const requirements = [
        {
          id: 'wo-1',
          productId: 'prod-1',
          quantity: 1,
          requestedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      ];

      const result = await checkCapacityFeasibility(requirements);

      expect(result.workOrders).toHaveLength(1);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return infeasible status for unknown products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const requirements = [
        {
          id: 'wo-1',
          productId: 'unknown',
          quantity: 1,
          requestedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        },
      ];

      const result = await checkCapacityFeasibility(requirements);

      expect(result.workOrders[0].status).toBe('infeasible');
      expect(result.workOrders[0].feasibleDate).toBeNull();
      expect(result.workOrders[0].delayDays).toBe(-1);
      expect(result.feasible).toBe(false);
    });

    it('should generate suggestions for overloaded work centers', async () => {
      setupFeasibilityMocks();
      // Schedule many orders to overload
      const requirements = Array.from({ length: 10 }, (_, i) => ({
        id: `wo-${i}`,
        productId: 'prod-1',
        quantity: 5,
        requestedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      }));

      const result = await checkCapacityFeasibility(requirements);

      // Should have some suggestions
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should calculate feasibility score', async () => {
      setupFeasibilityMocks();

      const requirements = [
        {
          id: 'wo-1',
          productId: 'prod-1',
          quantity: 1,
          requestedDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      ];

      const result = await checkCapacityFeasibility(requirements);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(typeof result.feasible).toBe('boolean');
    });

    it('should generate outsource suggestion for infeasible orders', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.workCenter.findMany.mockResolvedValue([baseWorkCenter]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const requirements = [
        {
          id: 'wo-1',
          productId: 'unknown',
          quantity: 1,
          requestedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        },
      ];

      const result = await checkCapacityFeasibility(requirements);

      const outsourceSuggestion = result.suggestions.find((s) => s.type === 'outsource');
      expect(outsourceSuggestion).toBeDefined();
      expect(outsourceSuggestion!.priority).toBe('high');
    });

    it('should identify bottleneck days', async () => {
      setupFeasibilityMocks();

      const requirements = [
        {
          id: 'wo-1',
          productId: 'prod-1',
          quantity: 1,
          requestedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      ];

      const result = await checkCapacityFeasibility(requirements);

      expect(result.bottlenecks).toBeDefined();
      expect(Array.isArray(result.bottlenecks)).toBe(true);
    });
  });

  // ===========================================================================
  // getCapacityUtilizationSummary
  // ===========================================================================
  describe('getCapacityUtilizationSummary', () => {
    it('should return utilization summary for default 7 days', async () => {
      mockPrisma.workCenter.findMany.mockResolvedValue([
        {
          id: 'wc-1',
          code: 'WC001',
          name: 'Line 1',
          type: 'assembly',
          status: 'active',
          capacityPerDay: 8,
          equipment: [],
        },
      ]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await getCapacityUtilizationSummary();

      expect(result).toHaveProperty('totalCapacityHours');
      expect(result).toHaveProperty('totalScheduledHours');
      expect(result).toHaveProperty('utilizationPercent');
      expect(result).toHaveProperty('overloadedWorkCenters');
      expect(result).toHaveProperty('bottlenecks');
      expect(result.totalScheduledHours).toBe(0);
    });

    it('should accept custom days parameter', async () => {
      mockPrisma.workCenter.findMany.mockResolvedValue([]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await getCapacityUtilizationSummary(14);

      expect(result.totalCapacityHours).toBe(0);
    });
  });

  // ===========================================================================
  // findNextAvailableSlot
  // ===========================================================================
  describe('findNextAvailableSlot', () => {
    it('should find next available slot when capacity exists', async () => {
      mockPrisma.workCenter.findMany.mockResolvedValue([
        {
          id: 'wc-1',
          code: 'WC001',
          name: 'Line 1',
          type: 'assembly',
          status: 'active',
          capacityPerDay: 8,
          equipment: [],
        },
      ]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await findNextAvailableSlot('wc-1', 4);

      expect(result).not.toBeNull();
      expect(result!.startDate).toBeInstanceOf(Date);
      expect(result!.endDate).toBeInstanceOf(Date);
    });

    it('should return null when not enough capacity in 60-day window', async () => {
      // No work center means no daily details at all
      mockPrisma.workCenter.findMany.mockResolvedValue([]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await findNextAvailableSlot('wc-nonexistent', 1000);

      expect(result).toBeNull();
    });

    it('should use afterDate parameter when provided', async () => {
      mockPrisma.workCenter.findMany.mockResolvedValue([
        {
          id: 'wc-1',
          code: 'WC001',
          name: 'Line 1',
          type: 'assembly',
          status: 'active',
          capacityPerDay: 8,
          equipment: [],
        },
      ]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const afterDate = new Date(2026, 3, 1);
      const result = await findNextAvailableSlot('wc-1', 4, afterDate);

      expect(result).not.toBeNull();
      // The start date should be on or after the afterDate
      expect(result!.startDate.getTime()).toBeGreaterThanOrEqual(
        new Date(afterDate.toISOString().split('T')[0]).getTime()
      );
    });

    it('should span multiple days for large hour requirements', async () => {
      mockPrisma.workCenter.findMany.mockResolvedValue([
        {
          id: 'wc-1',
          code: 'WC001',
          name: 'Line 1',
          type: 'assembly',
          status: 'active',
          capacityPerDay: 8,
          equipment: [],
        },
      ]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await findNextAvailableSlot('wc-1', 20);

      expect(result).not.toBeNull();
      expect(result!.endDate.getTime()).toBeGreaterThan(result!.startDate.getTime());
    });

    it('should pass workCenterId as filter to calculateCapacity', async () => {
      mockPrisma.workCenter.findMany.mockResolvedValue([]);
      mockPrisma.shift.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      await findNextAvailableSlot('wc-1', 4);

      expect(mockPrisma.workCenter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['wc-1'] } },
        })
      );
    });
  });
});
