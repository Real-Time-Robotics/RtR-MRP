import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clockIn,
  clockOut,
  addManualEntry,
  getUserTimesheet,
  getLaborSummary,
  approveTimesheet,
} from '../labor-calculator';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    laborEntry: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    workCenter: {
      findUnique: vi.fn(),
    },
    workOrderOperation: {
      update: vi.fn(),
    },
  },
}));

describe('labor-calculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('clockIn', () => {
    it('should create a labor entry and return id', async () => {
      (prisma.laborEntry.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'entry-1',
      });

      const result = await clockIn('user-1', 'wc-1', 'op-1', 'DIRECT');

      expect(result).toBe('entry-1');
      expect(prisma.laborEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          workCenterId: 'wc-1',
          workOrderOperationId: 'op-1',
          type: 'DIRECT',
          startTime: expect.any(Date),
        }),
      });
    });

    it('should use default type DIRECT', async () => {
      (prisma.laborEntry.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'entry-1',
      });

      await clockIn('user-1');

      expect(prisma.laborEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'DIRECT',
        }),
      });
    });
  });

  describe('clockOut', () => {
    it('should throw when entry not found', async () => {
      (prisma.laborEntry.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(clockOut('bad-id')).rejects.toThrow('Labor entry not found');
    });

    it('should throw when already clocked out', async () => {
      (prisma.laborEntry.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'entry-1',
        endTime: new Date(),
        startTime: new Date(),
        user: {},
        workCenter: null,
      });

      await expect(clockOut('entry-1')).rejects.toThrow('Already clocked out');
    });

    it('should clock out and calculate cost', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - 2); // 2 hours ago

      (prisma.laborEntry.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'entry-1',
        startTime,
        endTime: null,
        workCenterId: 'wc-1',
        workOrderOperationId: null,
        user: { name: 'John' },
        workCenter: { hourlyRate: 100 },
      });
      (prisma.laborEntry.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await clockOut('entry-1');

      expect(prisma.laborEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: expect.objectContaining({
          endTime: expect.any(Date),
          durationMinutes: expect.any(Number),
          hourlyRate: 100,
          totalCost: expect.any(Number),
        }),
      });
    });

    it('should use default hourly rate when work center has none', async () => {
      const startTime = new Date();
      startTime.setMinutes(startTime.getMinutes() - 60);

      (prisma.laborEntry.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'entry-1',
        startTime,
        endTime: null,
        workOrderOperationId: null,
        user: {},
        workCenter: null,
      });
      (prisma.laborEntry.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await clockOut('entry-1');

      const updateCall = (prisma.laborEntry.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(updateCall.data.hourlyRate).toBe(50); // default rate
    });

    it('should update work order operation quantities', async () => {
      const startTime = new Date();
      startTime.setMinutes(startTime.getMinutes() - 30);

      (prisma.laborEntry.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'entry-1',
        startTime,
        endTime: null,
        workOrderOperationId: 'op-1',
        user: {},
        workCenter: { hourlyRate: 80 },
      });
      (prisma.laborEntry.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.workOrderOperation.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await clockOut('entry-1', { quantityProduced: 50, quantityScrapped: 2 });

      expect(prisma.workOrderOperation.update).toHaveBeenCalledWith({
        where: { id: 'op-1' },
        data: {
          quantityCompleted: { increment: 50 },
          quantityScrapped: { increment: 2 },
        },
      });
    });

    it('should not update operation when no quantityProduced', async () => {
      const startTime = new Date();
      startTime.setMinutes(startTime.getMinutes() - 30);

      (prisma.laborEntry.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'entry-1',
        startTime,
        endTime: null,
        workOrderOperationId: 'op-1',
        user: {},
        workCenter: null,
      });
      (prisma.laborEntry.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await clockOut('entry-1', { notes: 'test' });

      expect(prisma.workOrderOperation.update).not.toHaveBeenCalled();
    });
  });

  describe('addManualEntry', () => {
    it('should create manual entry with calculated cost', async () => {
      const startTime = new Date('2025-06-02T08:00:00');
      const endTime = new Date('2025-06-02T10:00:00'); // 2 hours

      (prisma.workCenter.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        hourlyRate: 80,
      });
      (prisma.laborEntry.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'entry-1',
      });

      const result = await addManualEntry({
        userId: 'user-1',
        workCenterId: 'wc-1',
        type: 'DIRECT',
        startTime,
        endTime,
        quantityProduced: 25,
      });

      expect(result).toBe('entry-1');
      expect(prisma.laborEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          durationMinutes: 120,
          hourlyRate: 80,
          totalCost: 160, // 2h * 80
        }),
      });
    });

    it('should use default rate when no work center', async () => {
      const startTime = new Date('2025-06-02T08:00:00');
      const endTime = new Date('2025-06-02T09:00:00');

      (prisma.laborEntry.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'entry-1',
      });

      await addManualEntry({
        userId: 'user-1',
        type: 'INDIRECT',
        startTime,
        endTime,
      });

      const createCall = (prisma.laborEntry.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(createCall.data.hourlyRate).toBe(50);
      expect(createCall.data.totalCost).toBe(50); // 1h * 50
    });
  });

  describe('getUserTimesheet', () => {
    it('should return entries and summary', async () => {
      (prisma.laborEntry.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'e-1',
          type: 'DIRECT',
          startTime: new Date('2025-06-02T08:00:00'),
          endTime: new Date('2025-06-02T10:00:00'),
          durationMinutes: 120,
          totalCost: 100,
          quantityProduced: 50,
          workCenter: { name: 'Assembly' },
          workOrderOperation: {
            name: 'Cut',
            workOrder: { woNumber: 'WO-001' },
          },
        },
        {
          id: 'e-2',
          type: 'SETUP',
          startTime: new Date('2025-06-02T10:00:00'),
          endTime: new Date('2025-06-02T10:30:00'),
          durationMinutes: 30,
          totalCost: 25,
          quantityProduced: null,
          workCenter: null,
          workOrderOperation: null,
        },
      ]);

      const result = await getUserTimesheet(
        'user-1',
        new Date('2025-06-01'),
        new Date('2025-06-30')
      );

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].workCenter).toBe('Assembly');
      expect(result.entries[0].workOrder).toBe('WO-001');
      expect(result.entries[1].workCenter).toBeNull();

      expect(result.summary.totalHours).toBeCloseTo(2.5, 1);
      expect(result.summary.directHours).toBeCloseTo(2.0, 1);
      expect(result.summary.setupHours).toBeCloseTo(0.5, 1);
      expect(result.summary.totalCost).toBe(125);
      expect(result.summary.totalQuantity).toBe(50);
    });

    it('should return empty summary for no entries', async () => {
      (prisma.laborEntry.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getUserTimesheet('user-1', new Date(), new Date());

      expect(result.entries).toHaveLength(0);
      expect(result.summary.totalHours).toBe(0);
      expect(result.summary.totalCost).toBe(0);
    });

    it('should categorize INDIRECT and IDLE hours', async () => {
      (prisma.laborEntry.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'e-1',
          type: 'INDIRECT',
          startTime: new Date(),
          endTime: new Date(),
          durationMinutes: 60,
          totalCost: 50,
          quantityProduced: null,
          workCenter: null,
          workOrderOperation: null,
        },
        {
          id: 'e-2',
          type: 'IDLE',
          startTime: new Date(),
          endTime: new Date(),
          durationMinutes: 30,
          totalCost: 25,
          quantityProduced: null,
          workCenter: null,
          workOrderOperation: null,
        },
      ]);

      const result = await getUserTimesheet('user-1', new Date(), new Date());

      expect(result.summary.indirectHours).toBeCloseTo(1, 1);
      expect(result.summary.idleHours).toBeCloseTo(0.5, 1);
    });
  });

  describe('getLaborSummary', () => {
    it('should aggregate labor data by type and work center', async () => {
      (prisma.laborEntry.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          type: 'DIRECT',
          durationMinutes: 120,
          totalCost: 200,
          workCenter: { name: 'Assembly' },
        },
        {
          type: 'DIRECT',
          durationMinutes: 60,
          totalCost: 100,
          workCenter: { name: 'Assembly' },
        },
        {
          type: 'SETUP',
          durationMinutes: 30,
          totalCost: 50,
          workCenter: null,
        },
      ]);

      const result = await getLaborSummary(new Date(), new Date());

      expect(result.totalHours).toBeCloseTo(3.5, 1);
      expect(result.totalCost).toBe(350);
      expect(result.byType).toHaveLength(2);
      expect(result.byWorkCenter).toHaveLength(2); // Assembly + Unassigned
      expect(result.efficiency).toBeGreaterThan(0); // DIRECT / total
    });

    it('should return 0 efficiency for no entries', async () => {
      (prisma.laborEntry.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getLaborSummary(new Date(), new Date());

      expect(result.efficiency).toBe(0);
      expect(result.totalHours).toBe(0);
    });
  });

  describe('approveTimesheet', () => {
    it('should update entries with approval info', async () => {
      (prisma.laborEntry.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 3 });

      await approveTimesheet(['e-1', 'e-2', 'e-3'], 'manager-1');

      expect(prisma.laborEntry.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['e-1', 'e-2', 'e-3'] } },
        data: {
          approvedBy: 'manager-1',
          approvedAt: expect.any(Date),
        },
      });
    });
  });
});
