import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRescheduleConflicts, rescheduleWorkOrder } from '../schedule-conflict';

// schedule-conflict.ts uses default import
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    workOrder: {
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    inventory: {
      aggregate: vi.fn(),
    },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

import prisma from '@/lib/prisma';

describe('schedule-conflict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRescheduleConflicts', () => {
    const futureStart = new Date();
    futureStart.setDate(futureStart.getDate() + 30);
    const futureEnd = new Date();
    futureEnd.setDate(futureEnd.getDate() + 40);

    it('should return error when work order not found', async () => {
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await checkRescheduleConflicts('bad-id', futureStart, futureEnd);

      expect(result.hasConflict).toBe(true);
      expect(result.canProceed).toBe(false);
      expect(result.conflicts[0].type).toBe('DEPENDENCY');
      expect(result.conflicts[0].severity).toBe('ERROR');
    });

    it('should return no conflicts for valid future schedule', async () => {
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'wo-1',
        quantity: 10,
        product: {
          bomHeaders: [{ bomLines: [] }],
        },
      });
      (prisma.workOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);

      const result = await checkRescheduleConflicts('wo-1', futureStart, futureEnd);

      expect(result.hasConflict).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should warn for past start date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'wo-1',
        quantity: 10,
        product: { bomHeaders: [] },
      });
      (prisma.workOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await checkRescheduleConflicts('wo-1', pastDate, futureEnd);

      expect(result.hasConflict).toBe(true);
      expect(result.canProceed).toBe(true); // warning, not error
      expect(result.conflicts.some(c => c.type === 'DEPENDENCY' && c.severity === 'WARNING')).toBe(true);
    });

    it('should warn for insufficient material', async () => {
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'wo-1',
        quantity: 100,
        product: {
          bomHeaders: [
            {
              bomLines: [
                {
                  quantity: 2,
                  partId: 'part-1',
                  part: { partNumber: 'P-001', leadTimeDays: 7 },
                },
              ],
            },
          ],
        },
      });
      // Insufficient inventory: need 200, have 50
      (prisma.inventory.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
        _sum: { quantity: 50 },
      });
      (prisma.workOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      // Schedule within lead time window
      const nearStart = new Date();
      nearStart.setDate(nearStart.getDate() + 3); // within 7-day lead time
      const nearEnd = new Date();
      nearEnd.setDate(nearEnd.getDate() + 10);

      const result = await checkRescheduleConflicts('wo-1', nearStart, nearEnd);

      expect(result.conflicts.some(c => c.type === 'MATERIAL')).toBe(true);
    });

    it('should warn for capacity conflicts when many overlapping orders', async () => {
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'wo-1',
        quantity: 10,
        product: { bomHeaders: [] },
      });
      (prisma.workOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(8); // > 5

      const result = await checkRescheduleConflicts('wo-1', futureStart, futureEnd);

      expect(result.conflicts.some(c => c.type === 'CAPACITY')).toBe(true);
    });

    it('should not warn for capacity when few overlapping orders', async () => {
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'wo-1',
        quantity: 10,
        product: { bomHeaders: [] },
      });
      (prisma.workOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(3); // <= 5

      const result = await checkRescheduleConflicts('wo-1', futureStart, futureEnd);

      expect(result.conflicts.some(c => c.type === 'CAPACITY')).toBe(false);
    });
  });

  describe('rescheduleWorkOrder', () => {
    const futureStart = new Date();
    futureStart.setDate(futureStart.getDate() + 30);
    const futureEnd = new Date();
    futureEnd.setDate(futureEnd.getDate() + 40);

    it('should reschedule successfully with no conflicts', async () => {
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'wo-1',
        quantity: 10,
        product: { bomHeaders: [] },
      });
      (prisma.workOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.workOrder.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await rescheduleWorkOrder('wo-1', futureStart, futureEnd);

      expect(result.success).toBe(true);
      expect(prisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: 'wo-1' },
        data: { plannedStart: futureStart, plannedEnd: futureEnd },
      });
    });

    it('should fail when conflicts prevent proceeding', async () => {
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await rescheduleWorkOrder('bad-id', futureStart, futureEnd);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should force reschedule even with conflicts', async () => {
      (prisma.workOrder.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await rescheduleWorkOrder('wo-1', futureStart, futureEnd, true);

      expect(result.success).toBe(true);
      // Should not even call findUnique for conflict check
      expect(prisma.workOrder.findUnique).not.toHaveBeenCalled();
    });

    it('should handle update errors gracefully', async () => {
      (prisma.workOrder.update as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('DB error')
      );

      const result = await rescheduleWorkOrder('wo-1', futureStart, futureEnd, true);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });
});
