// src/lib/production/gantt-data.ts
// Transform WorkOrder data into Gantt chart format

import prisma from '@/lib/prisma';

export interface GanttTask {
  id: string;
  woNumber: string;
  name: string;
  product: string;
  quantity: number;
  completedQty: number;
  progress: number;
  startDate: Date;
  endDate: Date;
  status: string;
  priority: string;
  assignee?: string;
}

export interface GanttData {
  tasks: GanttTask[];
  minDate: Date;
  maxDate: Date;
  stats: {
    total: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
}

export async function getGanttData(
  startDate?: Date,
  endDate?: Date,
  status?: string[]
): Promise<GanttData> {
  const where: Record<string, unknown> = {};

  if (startDate || endDate) {
    where.OR = [
      { plannedStart: { gte: startDate, lte: endDate } },
      { plannedEnd: { gte: startDate, lte: endDate } },
      {
        AND: [
          { plannedStart: { lte: startDate } },
          { plannedEnd: { gte: endDate } },
        ],
      },
    ];
  }

  if (status && status.length > 0) {
    where.status = { in: status };
  }

  const workOrders = await prisma.workOrder.findMany({
    where,
    include: {
      product: true,
    },
    orderBy: [{ plannedStart: 'asc' }, { woNumber: 'asc' }],
  });

  const now = new Date();
  let inProgress = 0;
  let completed = 0;
  let overdue = 0;

  const tasks: GanttTask[] = workOrders.map((wo) => {
    const progress =
      wo.quantity > 0
        ? Math.round((wo.completedQty / wo.quantity) * 100)
        : 0;

    if (wo.status === 'in_progress') inProgress++;
    if (wo.status === 'completed') completed++;
    if (wo.plannedEnd && wo.plannedEnd < now && wo.status !== 'completed')
      overdue++;

    // Fallback: if no plannedEnd, estimate from quantity
    const estimatedDays = Math.ceil(wo.quantity / 100) || 1;
    const fallbackEnd = new Date(wo.plannedStart || now);
    fallbackEnd.setDate(fallbackEnd.getDate() + estimatedDays);

    return {
      id: wo.id,
      woNumber: wo.woNumber,
      name: `${wo.woNumber} - ${wo.product?.name || 'Unknown'}`,
      product: wo.product?.name || 'Unknown',
      quantity: wo.quantity,
      completedQty: wo.completedQty,
      progress,
      startDate: wo.plannedStart || now,
      endDate: wo.plannedEnd || fallbackEnd,
      status: wo.status,
      priority: wo.priority || 'normal',
      assignee: wo.assignedTo || undefined,
    };
  });

  // Calculate date range
  const allDates = tasks.flatMap((t) => [t.startDate, t.endDate]);
  const minDate =
    allDates.length > 0
      ? new Date(Math.min(...allDates.map((d) => d.getTime())))
      : new Date();
  const maxDate =
    allDates.length > 0
      ? new Date(Math.max(...allDates.map((d) => d.getTime())))
      : new Date();

  // Extend range
  minDate.setDate(minDate.getDate() - 7);
  maxDate.setDate(maxDate.getDate() + 14);

  return {
    tasks,
    minDate,
    maxDate,
    stats: {
      total: tasks.length,
      inProgress,
      completed,
      overdue,
    },
  };
}
