import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getGanttData } from '../gantt-data';

// gantt-data.ts uses default import
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    workOrder: {
      findMany: vi.fn(),
    },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

import prisma from '@/lib/prisma';

describe('gantt-data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGanttData', () => {
    it('should return empty data when no work orders', async () => {
      (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getGanttData();

      expect(result.tasks).toHaveLength(0);
      expect(result.stats.total).toBe(0);
      expect(result.stats.inProgress).toBe(0);
      expect(result.stats.completed).toBe(0);
      expect(result.stats.overdue).toBe(0);
    });

    it('should transform work orders into gantt tasks', async () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 5);
      const end = new Date(now);
      end.setDate(end.getDate() + 5);

      (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'wo-1',
          woNumber: 'WO-001',
          quantity: 100,
          completedQty: 50,
          status: 'in_progress',
          priority: 'high',
          plannedStart: start,
          plannedEnd: end,
          assignedTo: 'user-1',
          product: { name: 'Widget A' },
        },
      ]);

      const result = await getGanttData();

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].woNumber).toBe('WO-001');
      expect(result.tasks[0].progress).toBe(50);
      expect(result.tasks[0].product).toBe('Widget A');
      expect(result.tasks[0].priority).toBe('high');
      expect(result.tasks[0].assignee).toBe('user-1');
      expect(result.stats.inProgress).toBe(1);
    });

    it('should count completed and overdue work orders', async () => {
      const past = new Date();
      past.setDate(past.getDate() - 10);
      const farPast = new Date();
      farPast.setDate(farPast.getDate() - 20);

      (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'wo-1',
          woNumber: 'WO-001',
          quantity: 100,
          completedQty: 100,
          status: 'completed',
          priority: 'normal',
          plannedStart: farPast,
          plannedEnd: past,
          assignedTo: null,
          product: { name: 'Widget A' },
        },
        {
          id: 'wo-2',
          woNumber: 'WO-002',
          quantity: 50,
          completedQty: 10,
          status: 'in_progress',
          priority: 'normal',
          plannedStart: farPast,
          plannedEnd: past,
          assignedTo: null,
          product: { name: 'Widget B' },
        },
      ]);

      const result = await getGanttData();

      expect(result.stats.completed).toBe(1);
      expect(result.stats.overdue).toBe(1); // wo-2 is past due and not completed
      expect(result.stats.inProgress).toBe(1);
    });

    it('should calculate progress correctly', async () => {
      const now = new Date();

      (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'wo-1',
          woNumber: 'WO-001',
          quantity: 0, // zero quantity edge case
          completedQty: 0,
          status: 'draft',
          priority: null,
          plannedStart: now,
          plannedEnd: null,
          assignedTo: null,
          product: null,
        },
      ]);

      const result = await getGanttData();

      expect(result.tasks[0].progress).toBe(0);
      expect(result.tasks[0].product).toBe('Unknown');
      expect(result.tasks[0].priority).toBe('normal');
    });

    it('should compute correct date range with padding', async () => {
      const start = new Date('2025-06-01');
      const end = new Date('2025-06-30');

      (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'wo-1',
          woNumber: 'WO-001',
          quantity: 100,
          completedQty: 0,
          status: 'planned',
          priority: 'normal',
          plannedStart: start,
          plannedEnd: end,
          assignedTo: null,
          product: { name: 'X' },
        },
      ]);

      const result = await getGanttData();

      // minDate should be 7 days before start, maxDate 14 days after end
      expect(result.minDate.getTime()).toBeLessThan(start.getTime());
      expect(result.maxDate.getTime()).toBeGreaterThan(end.getTime());
    });

    it('should pass date filters to prisma query', async () => {
      (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      await getGanttData(startDate, endDate);

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });

    it('should pass status filter to prisma query', async () => {
      (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await getGanttData(undefined, undefined, ['in_progress', 'planned']);

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['in_progress', 'planned'] },
          }),
        })
      );
    });

    it('should generate fallback end date from quantity', async () => {
      const now = new Date();
      const plannedStart = new Date('2025-06-01');

      (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'wo-1',
          woNumber: 'WO-001',
          quantity: 500,
          completedQty: 0,
          status: 'draft',
          priority: 'normal',
          plannedStart,
          plannedEnd: null, // no planned end
          assignedTo: null,
          product: { name: 'Product' },
        },
      ]);

      const result = await getGanttData();
      const task = result.tasks[0];

      // fallback = ceil(500/100) = 5 days after plannedStart
      const expectedFallback = new Date(plannedStart);
      expectedFallback.setDate(expectedFallback.getDate() + 5);
      expect(task.endDate.getTime()).toBe(expectedFallback.getTime());
    });
  });
});
