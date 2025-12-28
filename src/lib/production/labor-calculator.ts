// lib/production/labor-calculator.ts
import { prisma } from "@/lib/prisma";

export async function clockIn(
  userId: string,
  workCenterId?: string,
  workOrderOperationId?: string,
  type: string = "DIRECT"
): Promise<string> {
  const entry = await prisma.laborEntry.create({
    data: {
      userId,
      workCenterId,
      workOrderOperationId,
      type,
      startTime: new Date(),
    },
  });

  return entry.id;
}

export async function clockOut(
  entryId: string,
  data?: {
    quantityProduced?: number;
    quantityScrapped?: number;
    notes?: string;
  }
): Promise<void> {
  const entry = await prisma.laborEntry.findUnique({
    where: { id: entryId },
    include: { user: true, workCenter: true },
  });

  if (!entry) {
    throw new Error("Labor entry not found");
  }

  if (entry.endTime) {
    throw new Error("Already clocked out");
  }

  const endTime = new Date();
  const durationMinutes =
    (endTime.getTime() - entry.startTime.getTime()) / (1000 * 60);

  // Get hourly rate from work center or default
  const hourlyRate = entry.workCenter?.hourlyRate || 50;
  const totalCost = (durationMinutes / 60) * hourlyRate;

  await prisma.laborEntry.update({
    where: { id: entryId },
    data: {
      endTime,
      durationMinutes,
      hourlyRate,
      totalCost,
      quantityProduced: data?.quantityProduced,
      quantityScrapped: data?.quantityScrapped,
      notes: data?.notes,
    },
  });

  // Update work order operation quantities if applicable
  if (entry.workOrderOperationId && data?.quantityProduced) {
    await prisma.workOrderOperation.update({
      where: { id: entry.workOrderOperationId },
      data: {
        quantityCompleted: { increment: data.quantityProduced },
        quantityScrapped: { increment: data.quantityScrapped || 0 },
      },
    });
  }
}

export async function addManualEntry(data: {
  userId: string;
  workCenterId?: string;
  workOrderOperationId?: string;
  type: string;
  startTime: Date;
  endTime: Date;
  quantityProduced?: number;
  quantityScrapped?: number;
  notes?: string;
}): Promise<string> {
  const durationMinutes =
    (data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60);

  let hourlyRate = 50;
  if (data.workCenterId) {
    const wc = await prisma.workCenter.findUnique({
      where: { id: data.workCenterId },
    });
    hourlyRate = wc?.hourlyRate || hourlyRate;
  }

  const totalCost = (durationMinutes / 60) * hourlyRate;

  const entry = await prisma.laborEntry.create({
    data: {
      ...data,
      durationMinutes,
      hourlyRate,
      totalCost,
    },
  });

  return entry.id;
}

export async function getUserTimesheet(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  entries: Array<{
    id: string;
    type: string;
    startTime: Date;
    endTime: Date | null;
    durationMinutes: number | null;
    workCenter: string | null;
    workOrder: string | null;
    operation: string | null;
    quantityProduced: number | null;
    totalCost: number | null;
  }>;
  summary: {
    totalHours: number;
    directHours: number;
    indirectHours: number;
    setupHours: number;
    idleHours: number;
    totalCost: number;
    totalQuantity: number;
  };
}> {
  const entries = await prisma.laborEntry.findMany({
    where: {
      userId,
      startTime: { gte: startDate },
      endTime: { lte: endDate },
    },
    include: {
      workCenter: true,
      workOrderOperation: {
        include: { workOrder: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const summary = {
    totalHours: 0,
    directHours: 0,
    indirectHours: 0,
    setupHours: 0,
    idleHours: 0,
    totalCost: 0,
    totalQuantity: 0,
  };

  const formattedEntries = entries.map((entry) => {
    const hours = (entry.durationMinutes || 0) / 60;
    summary.totalHours += hours;
    summary.totalCost += entry.totalCost || 0;
    summary.totalQuantity += entry.quantityProduced || 0;

    switch (entry.type) {
      case "DIRECT":
        summary.directHours += hours;
        break;
      case "INDIRECT":
        summary.indirectHours += hours;
        break;
      case "SETUP":
        summary.setupHours += hours;
        break;
      case "IDLE":
        summary.idleHours += hours;
        break;
    }

    return {
      id: entry.id,
      type: entry.type,
      startTime: entry.startTime,
      endTime: entry.endTime,
      durationMinutes: entry.durationMinutes,
      workCenter: entry.workCenter?.name || null,
      workOrder: entry.workOrderOperation?.workOrder.woNumber || null,
      operation: entry.workOrderOperation?.name || null,
      quantityProduced: entry.quantityProduced,
      totalCost: entry.totalCost,
    };
  });

  return {
    entries: formattedEntries,
    summary: {
      ...summary,
      totalHours: Math.round(summary.totalHours * 100) / 100,
      directHours: Math.round(summary.directHours * 100) / 100,
      indirectHours: Math.round(summary.indirectHours * 100) / 100,
      setupHours: Math.round(summary.setupHours * 100) / 100,
      idleHours: Math.round(summary.idleHours * 100) / 100,
      totalCost: Math.round(summary.totalCost * 100) / 100,
    },
  };
}

export async function getLaborSummary(
  startDate: Date,
  endDate: Date
): Promise<{
  totalHours: number;
  totalCost: number;
  byType: Array<{ type: string; hours: number; cost: number }>;
  byWorkCenter: Array<{ workCenter: string; hours: number; cost: number }>;
  efficiency: number;
}> {
  const entries = await prisma.laborEntry.findMany({
    where: {
      startTime: { gte: startDate },
      endTime: { lte: endDate },
    },
    include: { workCenter: true },
  });

  const byType: Record<string, { hours: number; cost: number }> = {};
  const byWorkCenter: Record<string, { hours: number; cost: number }> = {};
  let totalHours = 0;
  let totalCost = 0;
  let directHours = 0;

  for (const entry of entries) {
    const hours = (entry.durationMinutes || 0) / 60;
    const cost = entry.totalCost || 0;

    totalHours += hours;
    totalCost += cost;

    if (entry.type === "DIRECT") {
      directHours += hours;
    }

    if (!byType[entry.type]) {
      byType[entry.type] = { hours: 0, cost: 0 };
    }
    byType[entry.type].hours += hours;
    byType[entry.type].cost += cost;

    const wcName = entry.workCenter?.name || "Unassigned";
    if (!byWorkCenter[wcName]) {
      byWorkCenter[wcName] = { hours: 0, cost: 0 };
    }
    byWorkCenter[wcName].hours += hours;
    byWorkCenter[wcName].cost += cost;
  }

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    byType: Object.entries(byType).map(([type, data]) => ({
      type,
      hours: Math.round(data.hours * 100) / 100,
      cost: Math.round(data.cost * 100) / 100,
    })),
    byWorkCenter: Object.entries(byWorkCenter).map(([workCenter, data]) => ({
      workCenter,
      hours: Math.round(data.hours * 100) / 100,
      cost: Math.round(data.cost * 100) / 100,
    })),
    efficiency:
      totalHours > 0 ? Math.round((directHours / totalHours) * 100) : 0,
  };
}

export async function approveTimesheet(
  entryIds: string[],
  approvedBy: string
): Promise<void> {
  await prisma.laborEntry.updateMany({
    where: { id: { in: entryIds } },
    data: {
      approvedBy,
      approvedAt: new Date(),
    },
  });
}
