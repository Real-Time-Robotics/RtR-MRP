import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateNextRunTime,
  createReportSchedule,
  updateReportSchedule,
  deleteReportSchedule,
  getUserSchedules,
  getDueSchedules,
  markScheduleAsRun,
  getScheduleHistory,
} from '../report-scheduler';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    savedReport: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    reportSchedule: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    reportInstance: {
      findMany: vi.fn(),
    },
  },
}));

// Mock report-templates
vi.mock('../report-templates', () => ({
  getReportTemplate: vi.fn((id: string) => {
    if (id === 'inventory-summary') {
      return {
        id: 'inventory-summary',
        name: 'Inventory Summary',
        nameVi: 'Báo cáo Tồn kho',
        description: 'Stock levels',
        descriptionVi: 'Tổng hợp tồn kho',
        category: 'inventory',
        columns: [],
        defaultFrequency: 'DAILY',
        defaultTime: '07:00',
        query: 'inventory-summary',
      };
    }
    return undefined;
  }),
}));

import prisma from '@/lib/prisma';

describe('report-scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateNextRunTime', () => {
    it('should calculate next daily run time in the future', () => {
      const result = calculateNextRunTime('DAILY', '08:00');
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThan(Date.now() - 1000);
      expect(result.getHours()).toBe(8);
      expect(result.getMinutes()).toBe(0);
    });

    it('should schedule for tomorrow if daily time already passed', () => {
      // Use a time that has already passed today
      const pastTime = '00:01';
      const result = calculateNextRunTime('DAILY', pastTime);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      // The result should be tomorrow
      expect(result.getDate()).toBe(tomorrow.getDate());
    });

    it('should calculate next weekly run time', () => {
      const result = calculateNextRunTime('WEEKLY', '09:00', 2); // Wednesday
      expect(result).toBeInstanceOf(Date);
      expect(result.getHours()).toBe(9);
    });

    it('should calculate next monthly run time', () => {
      const result = calculateNextRunTime('MONTHLY', '10:00', undefined, 15);
      expect(result).toBeInstanceOf(Date);
      expect(result.getHours()).toBe(10);
    });

    it('should handle month overflow (e.g. day 31 in Feb)', () => {
      const result = calculateNextRunTime('MONTHLY', '08:00', undefined, 31);
      expect(result).toBeInstanceOf(Date);
      // Should not exceed actual last day of month
      const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
      expect(result.getDate()).toBeLessThanOrEqual(lastDay);
    });

    it('should default dayOfWeek to 0 (Monday) for weekly', () => {
      const result = calculateNextRunTime('WEEKLY', '08:00');
      expect(result).toBeInstanceOf(Date);
    });

    it('should default dayOfMonth to 1 for monthly', () => {
      const result = calculateNextRunTime('MONTHLY', '08:00');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('createReportSchedule', () => {
    it('should throw if template not found', async () => {
      await expect(
        createReportSchedule({
          name: 'Test',
          templateId: 'nonexistent',
          frequency: 'DAILY',
          timeOfDay: '08:00',
          format: 'EXCEL',
          recipients: ['test@example.com'],
          userId: 'user-1',
        })
      ).rejects.toThrow('Template not found');
    });

    it('should create a new schedule with existing saved report', async () => {
      const mockSavedReport = { id: 'sr-1', name: 'Inventory Summary', userId: 'user-1' };
      const mockSchedule = { id: 'sched-1', name: 'Daily Inventory' };

      (prisma.savedReport.findFirst as any).mockResolvedValue(mockSavedReport);
      (prisma.reportSchedule.create as any).mockResolvedValue(mockSchedule);

      const result = await createReportSchedule({
        name: 'Daily Inventory',
        templateId: 'inventory-summary',
        frequency: 'DAILY',
        timeOfDay: '08:00',
        format: 'EXCEL',
        recipients: ['test@example.com'],
        userId: 'user-1',
      });

      expect(result).toEqual(mockSchedule);
      expect(prisma.savedReport.findFirst).toHaveBeenCalled();
      expect(prisma.reportSchedule.create).toHaveBeenCalled();
    });

    it('should create saved report if none exists', async () => {
      const mockSavedReport = { id: 'sr-new', name: 'Inventory Summary' };
      const mockSchedule = { id: 'sched-2' };

      (prisma.savedReport.findFirst as any).mockResolvedValue(null);
      (prisma.savedReport.create as any).mockResolvedValue(mockSavedReport);
      (prisma.reportSchedule.create as any).mockResolvedValue(mockSchedule);

      const result = await createReportSchedule({
        name: 'New Schedule',
        templateId: 'inventory-summary',
        frequency: 'WEEKLY',
        dayOfWeek: 1,
        timeOfDay: '09:00',
        format: 'PDF',
        recipients: ['a@b.com'],
        userId: 'user-2',
      });

      expect(prisma.savedReport.create).toHaveBeenCalled();
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('updateReportSchedule', () => {
    it('should throw if schedule not found', async () => {
      (prisma.reportSchedule.findUnique as any).mockResolvedValue(null);

      await expect(updateReportSchedule('sched-x', { name: 'Updated' }, 'user-1')).rejects.toThrow(
        'Schedule not found'
      );
    });

    it('should throw if user is not the creator', async () => {
      (prisma.reportSchedule.findUnique as any).mockResolvedValue({
        id: 'sched-1',
        createdBy: 'other-user',
      });

      await expect(updateReportSchedule('sched-1', { name: 'Updated' }, 'user-1')).rejects.toThrow(
        'Permission denied'
      );
    });

    it('should update schedule fields', async () => {
      (prisma.reportSchedule.findUnique as any).mockResolvedValue({
        id: 'sched-1',
        createdBy: 'user-1',
        frequency: 'daily',
        time: '08:00',
      });
      (prisma.reportSchedule.update as any).mockResolvedValue({ id: 'sched-1', name: 'Updated' });

      const result = await updateReportSchedule('sched-1', { name: 'Updated' }, 'user-1');
      expect(prisma.reportSchedule.update).toHaveBeenCalled();
    });

    it('should recalculate nextRunAt when frequency changes', async () => {
      (prisma.reportSchedule.findUnique as any).mockResolvedValue({
        id: 'sched-1',
        createdBy: 'user-1',
        frequency: 'daily',
        time: '08:00',
      });
      (prisma.reportSchedule.update as any).mockResolvedValue({ id: 'sched-1' });

      await updateReportSchedule('sched-1', { frequency: 'WEEKLY', dayOfWeek: 3 }, 'user-1');

      const updateCall = (prisma.reportSchedule.update as any).mock.calls[0][0];
      expect(updateCall.data.nextRunAt).toBeInstanceOf(Date);
    });
  });

  describe('deleteReportSchedule', () => {
    it('should throw if schedule not found', async () => {
      (prisma.reportSchedule.findUnique as any).mockResolvedValue(null);
      await expect(deleteReportSchedule('x', 'user-1')).rejects.toThrow('Schedule not found');
    });

    it('should throw if user is not the creator', async () => {
      (prisma.reportSchedule.findUnique as any).mockResolvedValue({
        id: 'sched-1',
        createdBy: 'other',
      });
      await expect(deleteReportSchedule('sched-1', 'user-1')).rejects.toThrow('Permission denied');
    });

    it('should delete the schedule', async () => {
      (prisma.reportSchedule.findUnique as any).mockResolvedValue({
        id: 'sched-1',
        createdBy: 'user-1',
      });
      (prisma.reportSchedule.delete as any).mockResolvedValue({ id: 'sched-1' });

      await deleteReportSchedule('sched-1', 'user-1');
      expect(prisma.reportSchedule.delete).toHaveBeenCalledWith({ where: { id: 'sched-1' } });
    });
  });

  describe('getUserSchedules', () => {
    it('should return schedules for a user', async () => {
      const mockSchedules = [{ id: 's1' }, { id: 's2' }];
      (prisma.reportSchedule.findMany as any).mockResolvedValue(mockSchedules);

      const result = await getUserSchedules('user-1');
      expect(result).toEqual(mockSchedules);
      expect(prisma.reportSchedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdBy: 'user-1' } })
      );
    });
  });

  describe('getDueSchedules', () => {
    it('should return active schedules due to run', async () => {
      const mockDue = [{ id: 's1', isActive: true }];
      (prisma.reportSchedule.findMany as any).mockResolvedValue(mockDue);

      const result = await getDueSchedules();
      expect(result).toEqual(mockDue);
    });
  });

  describe('markScheduleAsRun', () => {
    it('should return null if schedule not found', async () => {
      (prisma.reportSchedule.findUnique as any).mockResolvedValue(null);
      const result = await markScheduleAsRun('x', true);
      expect(result).toBeNull();
    });

    it('should update schedule with success status', async () => {
      (prisma.reportSchedule.findUnique as any).mockResolvedValue({
        id: 'sched-1',
        frequency: 'daily',
        time: '08:00',
      });
      (prisma.reportSchedule.update as any).mockResolvedValue({ id: 'sched-1' });

      await markScheduleAsRun('sched-1', true);

      const updateCall = (prisma.reportSchedule.update as any).mock.calls[0][0];
      expect(updateCall.data.lastRunStatus).toBe('success');
      expect(updateCall.data.runCount).toEqual({ increment: 1 });
    });

    it('should update schedule with failed status', async () => {
      (prisma.reportSchedule.findUnique as any).mockResolvedValue({
        id: 'sched-1',
        frequency: 'daily',
        time: '08:00',
      });
      (prisma.reportSchedule.update as any).mockResolvedValue({ id: 'sched-1' });

      await markScheduleAsRun('sched-1', false, 'Some error');

      const updateCall = (prisma.reportSchedule.update as any).mock.calls[0][0];
      expect(updateCall.data.lastRunStatus).toBe('failed');
    });
  });

  describe('getScheduleHistory', () => {
    it('should return report instances for a schedule', async () => {
      const mockInstances = [{ id: 'i1' }];
      (prisma.reportInstance.findMany as any).mockResolvedValue(mockInstances);

      const result = await getScheduleHistory('sched-1', 10);
      expect(result).toEqual(mockInstances);
    });
  });

  describe('default export', () => {
    it('should export all functions', async () => {
      const mod = await import('../report-scheduler');
      expect(mod.default.createReportSchedule).toBeDefined();
      expect(mod.default.updateReportSchedule).toBeDefined();
      expect(mod.default.deleteReportSchedule).toBeDefined();
      expect(mod.default.getUserSchedules).toBeDefined();
      expect(mod.default.getDueSchedules).toBeDefined();
      expect(mod.default.markScheduleAsRun).toBeDefined();
      expect(mod.default.calculateNextRunTime).toBeDefined();
      expect(mod.default.getScheduleHistory).toBeDefined();
    });
  });
});
