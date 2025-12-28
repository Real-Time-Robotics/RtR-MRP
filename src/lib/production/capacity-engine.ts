// lib/production/capacity-engine.ts
import { prisma } from "@/lib/prisma";

interface CapacityOverview {
  workCenterId: string;
  workCenterName: string;
  date: Date;
  availableHours: number;
  scheduledHours: number;
  utilizationPercent: number;
  status: "under" | "optimal" | "over";
}

interface RCCPResult {
  periods: Array<{
    startDate: Date;
    endDate: Date;
    workCenters: CapacityOverview[];
    totalAvailable: number;
    totalDemand: number;
    overCapacityItems: Array<{
      workCenterId: string;
      workCenterName: string;
      excessHours: number;
      affectedWorkOrders: string[];
    }>;
  }>;
}

interface WorkCenterType {
  id: string;
  code: string;
  name: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  breakMinutes: number;
  workingDays: unknown;
  efficiency: number;
}

function calculateAvailableHours(
  workCenter: WorkCenterType,
  startDate: Date,
  endDate: Date
): number {
  const workingDays = workCenter.workingDays as number[];
  const [startHour] = workCenter.workingHoursStart.split(":").map(Number);
  const [endHour] = workCenter.workingHoursEnd.split(":").map(Number);
  const breakHours = workCenter.breakMinutes / 60;

  const hoursPerDay = endHour - startHour - breakHours;

  let totalHours = 0;
  const currentDate = new Date(startDate);

  while (currentDate < endDate) {
    if (workingDays.includes(currentDate.getDay())) {
      totalHours += hoursPerDay;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  totalHours *= workCenter.efficiency / 100;

  return Math.round(totalHours * 10) / 10;
}

export async function calculateRCCP(
  startDate: Date,
  endDate: Date,
  periodType: "day" | "week" | "month" = "week"
): Promise<RCCPResult> {
  const periods: RCCPResult["periods"] = [];

  const workCenters = await prisma.workCenter.findMany({
    where: { status: "active" },
  });

  let periodStart = new Date(startDate);
  while (periodStart < endDate) {
    let periodEnd: Date;

    switch (periodType) {
      case "day":
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 1);
        break;
      case "week":
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 7);
        break;
      case "month":
        periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
    }

    if (periodEnd > endDate) periodEnd = endDate;

    const wcCapacities: CapacityOverview[] = [];
    const overCapacityItems: Array<{
      workCenterId: string;
      workCenterName: string;
      excessHours: number;
      affectedWorkOrders: string[];
    }> = [];

    let totalAvailable = 0;
    let totalDemand = 0;

    for (const wc of workCenters) {
      const availableHours = calculateAvailableHours(wc, periodStart, periodEnd);

      const scheduledOps = await prisma.scheduledOperation.findMany({
        where: {
          workCenterId: wc.id,
          scheduledStart: { gte: periodStart },
          scheduledEnd: { lte: periodEnd },
        },
        include: {
          workOrderOperation: {
            include: { workOrder: true },
          },
        },
      });

      const scheduledHours = scheduledOps.reduce((sum, op) => {
        const duration =
          (op.scheduledEnd.getTime() - op.scheduledStart.getTime()) /
          (1000 * 60 * 60);
        return sum + duration;
      }, 0);

      const utilizationPercent =
        availableHours > 0 ? (scheduledHours / availableHours) * 100 : 0;

      const status: "under" | "optimal" | "over" =
        utilizationPercent > 100
          ? "over"
          : utilizationPercent > 85
          ? "optimal"
          : "under";

      wcCapacities.push({
        workCenterId: wc.id,
        workCenterName: wc.name,
        date: periodStart,
        availableHours,
        scheduledHours,
        utilizationPercent,
        status,
      });

      totalAvailable += availableHours;
      totalDemand += scheduledHours;

      if (utilizationPercent > 100) {
        overCapacityItems.push({
          workCenterId: wc.id,
          workCenterName: wc.name,
          excessHours: scheduledHours - availableHours,
          affectedWorkOrders: Array.from(
            new Set(
              scheduledOps.map((op) => op.workOrderOperation.workOrder.woNumber)
            )
          ),
        });
      }
    }

    periods.push({
      startDate: new Date(periodStart),
      endDate: new Date(periodEnd),
      workCenters: wcCapacities,
      totalAvailable,
      totalDemand,
      overCapacityItems,
    });

    periodStart = periodEnd;
  }

  return { periods };
}

export async function getWorkCenterUtilization(
  workCenterId: string,
  date: Date
): Promise<{
  available: number;
  scheduled: number;
  actual: number;
  utilization: number;
  jobs: Array<{
    woNumber: string;
    operationName: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    status: string;
  }>;
}> {
  const workCenter = await prisma.workCenter.findUnique({
    where: { id: workCenterId },
  });

  if (!workCenter) throw new Error("Work center not found");

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const capacityRecord = await prisma.capacityRecord.findUnique({
    where: {
      workCenterId_date: {
        workCenterId,
        date: startOfDay,
      },
    },
  });

  const available =
    capacityRecord?.availableHours ||
    calculateAvailableHours(workCenter, startOfDay, endOfDay);

  const scheduledOps = await prisma.scheduledOperation.findMany({
    where: {
      workCenterId,
      scheduledStart: { gte: startOfDay },
      scheduledEnd: { lte: endOfDay },
    },
    include: {
      workOrderOperation: {
        include: { workOrder: true },
      },
    },
  });

  const scheduled = scheduledOps.reduce((sum, op) => {
    const duration =
      (op.scheduledEnd.getTime() - op.scheduledStart.getTime()) /
      (1000 * 60 * 60);
    return sum + duration;
  }, 0);

  const laborEntries = await prisma.laborEntry.findMany({
    where: {
      workCenterId,
      startTime: { gte: startOfDay },
      endTime: { lte: endOfDay },
      type: "DIRECT",
    },
  });

  const actual = laborEntries.reduce((sum, entry) => {
    return sum + (entry.durationMinutes || 0) / 60;
  }, 0);

  const jobs = scheduledOps.map((op) => ({
    woNumber: op.workOrderOperation.workOrder.woNumber,
    operationName: op.workOrderOperation.name,
    scheduledStart: op.scheduledStart,
    scheduledEnd: op.scheduledEnd,
    status: op.status,
  }));

  return {
    available,
    scheduled,
    actual,
    utilization: available > 0 ? (scheduled / available) * 100 : 0,
    jobs,
  };
}

export async function getCapacitySummary(
  startDate: Date,
  endDate: Date
): Promise<{
  totalWorkCenters: number;
  avgUtilization: number;
  overCapacityCount: number;
  underUtilizedCount: number;
  workCenters: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
    availableHours: number;
    scheduledHours: number;
    utilization: number;
    utilizationStatus: "under" | "optimal" | "over";
  }>;
}> {
  const workCenters = await prisma.workCenter.findMany({
    where: { status: "active" },
  });

  const wcData = [];
  let totalUtilization = 0;
  let overCapacityCount = 0;
  let underUtilizedCount = 0;

  for (const wc of workCenters) {
    const availableHours = calculateAvailableHours(wc, startDate, endDate);

    const scheduledOps = await prisma.scheduledOperation.findMany({
      where: {
        workCenterId: wc.id,
        scheduledStart: { gte: startDate },
        scheduledEnd: { lte: endDate },
      },
    });

    const scheduledHours = scheduledOps.reduce((sum, op) => {
      const duration =
        (op.scheduledEnd.getTime() - op.scheduledStart.getTime()) /
        (1000 * 60 * 60);
      return sum + duration;
    }, 0);

    const utilization =
      availableHours > 0 ? (scheduledHours / availableHours) * 100 : 0;
    totalUtilization += utilization;

    const utilizationStatus: "under" | "optimal" | "over" =
      utilization > 100 ? "over" : utilization > 85 ? "optimal" : "under";

    if (utilization > 100) overCapacityCount++;
    if (utilization < 50) underUtilizedCount++;

    wcData.push({
      id: wc.id,
      code: wc.code,
      name: wc.name,
      type: wc.type,
      status: wc.status,
      availableHours,
      scheduledHours,
      utilization: Math.round(utilization * 10) / 10,
      utilizationStatus,
    });
  }

  return {
    totalWorkCenters: workCenters.length,
    avgUtilization:
      workCenters.length > 0
        ? Math.round((totalUtilization / workCenters.length) * 10) / 10
        : 0,
    overCapacityCount,
    underUtilizedCount,
    workCenters: wcData,
  };
}

export async function updateCapacityRecord(
  workCenterId: string,
  date: Date,
  updates: {
    overtimeHours?: number;
    downtimeHours?: number;
    notes?: string;
  }
): Promise<void> {
  const workCenter = await prisma.workCenter.findUnique({
    where: { id: workCenterId },
  });

  if (!workCenter) throw new Error("Work center not found");

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const baseAvailable = calculateAvailableHours(workCenter, startOfDay, endOfDay);

  const scheduledOps = await prisma.scheduledOperation.findMany({
    where: {
      workCenterId,
      scheduledStart: { gte: startOfDay },
      scheduledEnd: { lte: endOfDay },
    },
  });

  const scheduledHours = scheduledOps.reduce((sum, op) => {
    const duration =
      (op.scheduledEnd.getTime() - op.scheduledStart.getTime()) /
      (1000 * 60 * 60);
    return sum + duration;
  }, 0);

  const availableHours =
    baseAvailable +
    (updates.overtimeHours || 0) -
    (updates.downtimeHours || 0);

  await prisma.capacityRecord.upsert({
    where: {
      workCenterId_date: {
        workCenterId,
        date: startOfDay,
      },
    },
    create: {
      workCenterId,
      date: startOfDay,
      availableHours,
      scheduledHours,
      overtimeHours: updates.overtimeHours || 0,
      downtimeHours: updates.downtimeHours || 0,
      utilization: availableHours > 0 ? (scheduledHours / availableHours) * 100 : 0,
      notes: updates.notes,
    },
    update: {
      availableHours,
      scheduledHours,
      overtimeHours: updates.overtimeHours,
      downtimeHours: updates.downtimeHours,
      utilization: availableHours > 0 ? (scheduledHours / availableHours) * 100 : 0,
      notes: updates.notes,
    },
  });
}
