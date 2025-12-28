// lib/quality/quality-metrics.ts
import { prisma } from "@/lib/prisma";

interface QualityMetrics {
  firstPassYield: number;
  firstPassYieldTrend: number;
  openNCRs: number;
  openCAPAs: number;
  pendingInspections: number;
  defectsByCategory: Array<{ category: string; count: number }>;
  inspectionTrend: Array<{ date: string; pass: number; fail: number }>;
  supplierQuality: Array<{
    supplierId: string;
    supplierName: string;
    receivedLots: number;
    acceptedLots: number;
    acceptanceRate: number;
  }>;
}

export async function getQualityMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<QualityMetrics> {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  // First Pass Yield
  const inspections = await prisma.inspection.findMany({
    where: {
      status: "completed",
      createdAt: { gte: start, lte: end },
    },
  });

  const passCount = inspections.filter((i) => i.result === "PASS").length;
  const totalCount = inspections.length;
  const firstPassYield = totalCount > 0 ? (passCount / totalCount) * 100 : 100;

  // Previous period for trend
  const periodLength = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - periodLength);
  const prevInspections = await prisma.inspection.findMany({
    where: {
      status: "completed",
      createdAt: { gte: prevStart, lt: start },
    },
  });
  const prevPassCount = prevInspections.filter((i) => i.result === "PASS").length;
  const prevTotal = prevInspections.length;
  const prevYield = prevTotal > 0 ? (prevPassCount / prevTotal) * 100 : 100;
  const firstPassYieldTrend = firstPassYield - prevYield;

  // Open NCRs
  const openNCRs = await prisma.nCR.count({
    where: {
      status: { notIn: ["closed", "voided"] },
    },
  });

  // Open CAPAs
  const openCAPAs = await prisma.cAPA.count({
    where: {
      status: { notIn: ["closed"] },
    },
  });

  // Pending Inspections
  const pendingInspections = await prisma.inspection.count({
    where: {
      status: { in: ["pending", "in_progress"] },
    },
  });

  // Defects by Category
  const defects = await prisma.nCR.groupBy({
    by: ["defectCategory"],
    where: {
      createdAt: { gte: start, lte: end },
      defectCategory: { not: null },
    },
    _count: true,
  });

  const defectsByCategory = defects
    .map((d) => ({
      category: d.defectCategory || "Unknown",
      count: d._count,
    }))
    .sort((a, b) => b.count - a.count);

  // Inspection Trend by Week - using manual grouping
  const allInspections = await prisma.inspection.findMany({
    where: {
      status: "completed",
      createdAt: { gte: start, lte: end },
    },
    select: {
      createdAt: true,
      result: true,
    },
  });

  const weekMap = new Map<string, { pass: number; fail: number }>();
  for (const insp of allInspections) {
    const weekStart = new Date(insp.createdAt);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStr = weekStart.toISOString().split("T")[0];

    if (!weekMap.has(weekStr)) {
      weekMap.set(weekStr, { pass: 0, fail: 0 });
    }
    const week = weekMap.get(weekStr)!;
    if (insp.result === "PASS") {
      week.pass++;
    } else {
      week.fail++;
    }
  }

  const inspectionTrend = Array.from(weekMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Supplier Quality - simplified version
  const supplierInspections = await prisma.inspection.findMany({
    where: {
      type: "RECEIVING",
      status: "completed",
      createdAt: { gte: start, lte: end },
      part: {
        partSuppliers: {
          some: {},
        },
      },
    },
    include: {
      part: {
        include: {
          partSuppliers: {
            include: {
              supplier: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  const supplierMap = new Map<
    string,
    { name: string; total: number; accepted: number }
  >();

  for (const insp of supplierInspections) {
    const supplier = insp.part?.partSuppliers[0]?.supplier;
    if (supplier) {
      if (!supplierMap.has(supplier.id)) {
        supplierMap.set(supplier.id, { name: supplier.name, total: 0, accepted: 0 });
      }
      const s = supplierMap.get(supplier.id)!;
      s.total++;
      if (insp.result === "PASS") {
        s.accepted++;
      }
    }
  }

  const supplierQuality = Array.from(supplierMap.entries())
    .map(([supplierId, data]) => ({
      supplierId,
      supplierName: data.name,
      receivedLots: data.total,
      acceptedLots: data.accepted,
      acceptanceRate: data.total > 0 ? (data.accepted / data.total) * 100 : 100,
    }))
    .sort((a, b) => b.receivedLots - a.receivedLots)
    .slice(0, 10);

  return {
    firstPassYield: Math.round(firstPassYield * 10) / 10,
    firstPassYieldTrend: Math.round(firstPassYieldTrend * 10) / 10,
    openNCRs,
    openCAPAs,
    pendingInspections,
    defectsByCategory,
    inspectionTrend,
    supplierQuality,
  };
}

export async function getQualityDashboardStats() {
  const [
    pendingReceiving,
    pendingInProcess,
    pendingFinal,
    openNCRs,
    openCAPAs,
    recentInspections,
  ] = await Promise.all([
    prisma.inspection.count({
      where: { type: "RECEIVING", status: { in: ["pending", "in_progress"] } },
    }),
    prisma.inspection.count({
      where: { type: "IN_PROCESS", status: { in: ["pending", "in_progress"] } },
    }),
    prisma.inspection.count({
      where: { type: "FINAL", status: { in: ["pending", "in_progress"] } },
    }),
    prisma.nCR.count({
      where: { status: { notIn: ["closed", "voided"] } },
    }),
    prisma.cAPA.count({
      where: { status: { notIn: ["closed"] } },
    }),
    prisma.inspection.findMany({
      where: { status: "completed" },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const passCount = recentInspections.filter((i) => i.result === "PASS").length;
  const firstPassYield =
    recentInspections.length > 0
      ? (passCount / recentInspections.length) * 100
      : 100;

  return {
    pendingReceiving,
    pendingInProcess,
    pendingFinal,
    totalPending: pendingReceiving + pendingInProcess + pendingFinal,
    openNCRs,
    openCAPAs,
    firstPassYield: Math.round(firstPassYield * 10) / 10,
  };
}
