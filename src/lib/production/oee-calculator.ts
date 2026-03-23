// lib/production/oee-calculator.ts
import { prisma } from "@/lib/prisma";

interface OEEMetrics {
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  plannedProductionTime: number;
  actualRunTime: number;
  idealCycleTime: number;
  totalCount: number;
  goodCount: number;
  losses: {
    availability: number;
    performance: number;
    quality: number;
  };
}

interface WorkCenterType {
  id: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  breakMinutes: number;
  workingDays: unknown;
  efficiency: number;
}

function calculateAvailableMinutes(
  workCenter: WorkCenterType,
  startDate: Date,
  endDate: Date
): number {
  const workingDays = workCenter.workingDays as number[];
  const [startHour] = workCenter.workingHoursStart.split(":").map(Number);
  const [endHour] = workCenter.workingHoursEnd.split(":").map(Number);

  const minutesPerDay = (endHour - startHour) * 60 - workCenter.breakMinutes;

  let totalMinutes = 0;
  const currentDate = new Date(Date.UTC(
    startDate.getFullYear(), startDate.getMonth(), startDate.getDate()
  ));
  const endUTC = new Date(Date.UTC(
    endDate.getFullYear(), endDate.getMonth(), endDate.getDate()
  ));

  while (currentDate < endUTC) {
    if (workingDays.includes(currentDate.getUTCDay())) {
      totalMinutes += minutesPerDay;
    }
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return totalMinutes;
}

export async function calculateOEE(
  workCenterId: string,
  startDate: Date,
  endDate: Date
): Promise<OEEMetrics> {
  const workCenter = await prisma.workCenter.findUnique({
    where: { id: workCenterId },
  });

  if (!workCenter) throw new Error("Work center not found");

  // Run both queries in parallel instead of sequential
  const [downtimeRecords, completedOps] = await Promise.all([
    prisma.downtimeRecord.findMany({
      where: {
        workCenterId,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      select: { durationMinutes: true },
    }),
    prisma.workOrderOperation.findMany({
      where: {
        workCenterId,
        status: "completed",
        actualEndDate: { gte: startDate, lte: endDate },
      },
      select: {
        quantityCompleted: true,
        quantityScrapped: true,
        plannedRunTime: true,
        quantityPlanned: true,
        routingOperation: { select: { runTimePerUnit: true } },
      },
    }),
  ]);

  // 1. AVAILABILITY
  const plannedProductionTime = calculateAvailableMinutes(workCenter, startDate, endDate);
  const totalDowntime = downtimeRecords.reduce((sum, d) => sum + (d.durationMinutes || 0), 0);
  const actualRunTime = Math.max(0, plannedProductionTime - totalDowntime);
  const availability = plannedProductionTime > 0 ? (actualRunTime / plannedProductionTime) * 100 : 0;

  // 2. PERFORMANCE
  const totalCount = completedOps.reduce((sum, op) => sum + op.quantityCompleted, 0);
  const idealCycleTime = completedOps.reduce((sum, op) => {
    const runTimePerUnit = op.routingOperation?.runTimePerUnit || op.plannedRunTime / op.quantityPlanned;
    return sum + runTimePerUnit * op.quantityCompleted;
  }, 0);
  const performance = actualRunTime > 0 ? (idealCycleTime / actualRunTime) * 100 : 0;

  // 3. QUALITY
  const scrapCount = completedOps.reduce((sum, op) => sum + op.quantityScrapped, 0);
  const goodCount = totalCount - scrapCount;
  const quality = totalCount > 0 ? (goodCount / totalCount) * 100 : 100;

  // 4. OEE
  const oee = (availability / 100) * (Math.min(100, performance) / 100) * (quality / 100) * 100;

  const availabilityLoss = plannedProductionTime - actualRunTime;
  const performanceLoss = actualRunTime - idealCycleTime;
  const qualityLoss = totalCount > 0 ? idealCycleTime * (scrapCount / totalCount) : 0;

  return {
    oee: Math.round(oee * 10) / 10,
    availability: Math.round(availability * 10) / 10,
    performance: Math.min(100, Math.round(performance * 10) / 10),
    quality: Math.round(quality * 10) / 10,
    plannedProductionTime,
    actualRunTime,
    idealCycleTime,
    totalCount,
    goodCount,
    losses: {
      availability: Math.round(availabilityLoss),
      performance: Math.round(performanceLoss),
      quality: Math.round(qualityLoss),
    },
  };
}

export async function getOEETrend(
  workCenterId: string,
  periods: number = 4,
  periodType: "day" | "week" | "month" = "week"
): Promise<
  Array<{
    period: string;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
  }>
> {
  const now = new Date();

  // Build all period ranges first
  const periodRanges: Array<{ startDate: Date; endDate: Date; label: string }> = [];
  for (let i = periods - 1; i >= 0; i--) {
    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;

    switch (periodType) {
      case "day":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - i);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        periodLabel = startDate.toLocaleDateString("en-US", { weekday: "short" });
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - i * 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        periodLabel = `Week ${periods - i}`;
        break;
      case "month":
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - i, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        periodLabel = startDate.toLocaleDateString("en-US", { month: "short" });
        break;
    }

    periodRanges.push({ startDate, endDate, label: periodLabel });
  }

  // Calculate all periods in parallel
  const metricsResults = await Promise.all(
    periodRanges.map(({ startDate, endDate }) =>
      calculateOEE(workCenterId, startDate, endDate)
    )
  );

  return metricsResults.map((metrics, idx) => ({
    period: periodRanges[idx].label,
    oee: metrics.oee,
    availability: metrics.availability,
    performance: metrics.performance,
    quality: metrics.quality,
  }));
}

export async function getOEEDashboard(): Promise<{
  overallOEE: number;
  avgAvailability: number;
  avgPerformance: number;
  avgQuality: number;
  workCenters: Array<{
    id: string;
    code: string;
    name: string;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
    status: "world_class" | "good" | "average" | "poor";
  }>;
  topLosses: Array<{
    category: string;
    minutes: number;
    percentage: number;
  }>;
}> {
  const workCenters = await prisma.workCenter.findMany({
    where: { status: "active" },
  });

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 7);

  const workCenterIds = workCenters.map(wc => wc.id);

  // Batch fetch all downtime and operations for ALL work centers at once
  const [allDowntime, allCompletedOps] = await Promise.all([
    prisma.downtimeRecord.findMany({
      where: {
        workCenterId: { in: workCenterIds },
        startTime: { gte: startDate },
        endTime: { lte: now },
      },
      select: { workCenterId: true, durationMinutes: true },
    }),
    prisma.workOrderOperation.findMany({
      where: {
        workCenterId: { in: workCenterIds },
        status: "completed",
        actualEndDate: { gte: startDate, lte: now },
      },
      select: {
        workCenterId: true,
        quantityCompleted: true,
        quantityScrapped: true,
        plannedRunTime: true,
        quantityPlanned: true,
        routingOperation: { select: { runTimePerUnit: true } },
      },
    }),
  ]);

  // Group by work center for O(1) lookup
  const downtimeByWC = new Map<string, number>();
  for (const d of allDowntime) {
    downtimeByWC.set(d.workCenterId, (downtimeByWC.get(d.workCenterId) || 0) + (d.durationMinutes || 0));
  }

  const opsByWC = new Map<string, typeof allCompletedOps>();
  for (const op of allCompletedOps) {
    if (!opsByWC.has(op.workCenterId)) opsByWC.set(op.workCenterId, []);
    opsByWC.get(op.workCenterId)!.push(op);
  }

  // Calculate metrics per work center — no more DB queries
  const wcMetrics = [];
  let totalOEE = 0, totalAvailability = 0, totalPerformance = 0, totalQuality = 0;
  let totalAvailabilityLoss = 0, totalPerformanceLoss = 0, totalQualityLoss = 0;

  for (const wc of workCenters) {
    const plannedProductionTime = calculateAvailableMinutes(wc, startDate, now);
    const totalDowntime = downtimeByWC.get(wc.id) || 0;
    const actualRunTime = Math.max(0, plannedProductionTime - totalDowntime);
    const availability = plannedProductionTime > 0 ? (actualRunTime / plannedProductionTime) * 100 : 0;

    const ops = opsByWC.get(wc.id) || [];
    const totalCount = ops.reduce((sum, op) => sum + op.quantityCompleted, 0);
    const idealCycleTime = ops.reduce((sum, op) => {
      const runTimePerUnit = op.routingOperation?.runTimePerUnit || op.plannedRunTime / op.quantityPlanned;
      return sum + runTimePerUnit * op.quantityCompleted;
    }, 0);
    const performance = actualRunTime > 0 ? (idealCycleTime / actualRunTime) * 100 : 0;

    const scrapCount = ops.reduce((sum, op) => sum + op.quantityScrapped, 0);
    const goodCount = totalCount - scrapCount;
    const quality = totalCount > 0 ? (goodCount / totalCount) * 100 : 100;

    const oee = (availability / 100) * (Math.min(100, performance) / 100) * (quality / 100) * 100;

    const availabilityLoss = plannedProductionTime - actualRunTime;
    const performanceLoss = actualRunTime - idealCycleTime;
    const qualityLoss = totalCount > 0 ? idealCycleTime * (scrapCount / totalCount) : 0;

    const status: "world_class" | "good" | "average" | "poor" =
      oee >= 85 ? "world_class" : oee >= 70 ? "good" : oee >= 50 ? "average" : "poor";

    wcMetrics.push({
      id: wc.id,
      code: wc.code,
      name: wc.name,
      oee: Math.round(oee * 10) / 10,
      availability: Math.round(availability * 10) / 10,
      performance: Math.min(100, Math.round(performance * 10) / 10),
      quality: Math.round(quality * 10) / 10,
      status,
    });

    totalOEE += oee;
    totalAvailability += availability;
    totalPerformance += performance;
    totalQuality += quality;
    totalAvailabilityLoss += availabilityLoss;
    totalPerformanceLoss += performanceLoss;
    totalQualityLoss += qualityLoss;
  }

  const count = workCenters.length || 1;
  const totalLoss = totalAvailabilityLoss + totalPerformanceLoss + totalQualityLoss;

  return {
    overallOEE: Math.round((totalOEE / count) * 10) / 10,
    avgAvailability: Math.round((totalAvailability / count) * 10) / 10,
    avgPerformance: Math.round((totalPerformance / count) * 10) / 10,
    avgQuality: Math.round((totalQuality / count) * 10) / 10,
    workCenters: wcMetrics.sort((a, b) => b.oee - a.oee),
    topLosses: [
      {
        category: "Availability (Downtime)",
        minutes: Math.round(totalAvailabilityLoss),
        percentage: totalLoss > 0 ? Math.round((totalAvailabilityLoss / totalLoss) * 100) : 0,
      },
      {
        category: "Performance (Speed Loss)",
        minutes: Math.round(totalPerformanceLoss),
        percentage: totalLoss > 0 ? Math.round((totalPerformanceLoss / totalLoss) * 100) : 0,
      },
      {
        category: "Quality (Defects)",
        minutes: Math.round(totalQualityLoss),
        percentage: totalLoss > 0 ? Math.round((totalQualityLoss / totalLoss) * 100) : 0,
      },
    ].sort((a, b) => b.minutes - a.minutes),
  };
}
