// lib/quality/inspection-engine.ts
import { prisma } from "@/lib/prisma";

export async function generateInspectionNumber(type: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = type === "RECEIVING" ? "RI" : type === "IN_PROCESS" ? "IP" : "FI";
  const fullPrefix = `${prefix}-${year}-`;

  // Use findFirst with orderBy desc to get the last number, avoiding count() race condition
  const lastInspection = await prisma.inspection.findFirst({
    where: { inspectionNumber: { startsWith: fullPrefix } },
    orderBy: { inspectionNumber: 'desc' },
    select: { inspectionNumber: true },
  });

  let nextNumber = 1;
  if (lastInspection?.inspectionNumber) {
    const lastSuffix = lastInspection.inspectionNumber.replace(fullPrefix, '');
    const parsed = parseInt(lastSuffix, 10);
    if (!isNaN(parsed)) nextNumber = parsed + 1;
  }

  return `${fullPrefix}${String(nextNumber).padStart(4, "0")}`;
}

export async function generateInspectionPlanNumber(): Promise<string> {
  const lastPlan = await prisma.inspectionPlan.findFirst({
    where: { planNumber: { startsWith: 'IP-' } },
    orderBy: { planNumber: 'desc' },
    select: { planNumber: true },
  });

  let nextNumber = 1;
  if (lastPlan?.planNumber) {
    const parsed = parseInt(lastPlan.planNumber.replace('IP-', ''), 10);
    if (!isNaN(parsed)) nextNumber = parsed + 1;
  }

  return `IP-${String(nextNumber).padStart(3, "0")}`;
}

export interface InspectionResultSummary {
  totalCharacteristics: number;
  passCount: number;
  failCount: number;
  pendingCount: number;
  overallResult: "PASS" | "FAIL" | "PENDING" | "CONDITIONAL";
  criticalFailures: number;
}

export async function calculateInspectionResult(
  inspectionId: string
): Promise<InspectionResultSummary> {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: {
      plan: {
        include: {
          characteristics: true,
        },
      },
      results: {
        include: {
          characteristic: true,
        },
      },
    },
  });

  if (!inspection || !inspection.plan) {
    return {
      totalCharacteristics: 0,
      passCount: 0,
      failCount: 0,
      pendingCount: 0,
      overallResult: "PENDING",
      criticalFailures: 0,
    };
  }

  const totalCharacteristics = inspection.plan.characteristics.length;
  const results = inspection.results;

  let passCount = 0;
  let failCount = 0;
  let criticalFailures = 0;

  for (const result of results) {
    if (result.result === "PASS" || result.result === "N/A") {
      passCount++;
    } else if (result.result === "FAIL") {
      failCount++;
      if (result.characteristic.isCritical) {
        criticalFailures++;
      }
    }
  }

  const pendingCount = totalCharacteristics - results.length;

  let overallResult: "PASS" | "FAIL" | "PENDING" | "CONDITIONAL";
  if (pendingCount > 0) {
    overallResult = "PENDING";
  } else if (criticalFailures > 0) {
    overallResult = "FAIL";
  } else if (failCount > 0) {
    overallResult = "CONDITIONAL";
  } else {
    overallResult = "PASS";
  }

  return {
    totalCharacteristics,
    passCount,
    failCount,
    pendingCount,
    overallResult,
    criticalFailures,
  };
}

export async function completeInspection(
  inspectionId: string,
  userId: string
): Promise<{ success: boolean; result?: string; error?: string }> {
  const summary = await calculateInspectionResult(inspectionId);

  if (summary.pendingCount > 0) {
    return {
      success: false,
      error: `${summary.pendingCount} characteristics still pending`,
    };
  }

  const result = summary.overallResult;

  await prisma.inspection.update({
    where: { id: inspectionId },
    data: {
      status: "completed",
      result,
      inspectedAt: new Date(),
      quantityAccepted: summary.overallResult === "PASS" ? undefined : 0,
      quantityRejected: summary.failCount > 0 ? undefined : 0,
    },
  });

  // Log lot transaction if lot number exists
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
  });

  if (inspection?.lotNumber) {
    await prisma.lotTransaction.create({
      data: {
        lotNumber: inspection.lotNumber,
        transactionType: "INSPECTED",
        partId: inspection.partId,
        productId: inspection.productId,
        quantity: inspection.quantityInspected || 0,
        inspectionId: inspectionId,
        notes: `Inspection ${inspection.inspectionNumber}: ${result}`,
        userId,
      },
    });
  }

  return { success: true, result };
}

export function isWithinSpec(
  value: number,
  nominal: number | null,
  upperLimit: number | null,
  lowerLimit: number | null
): boolean {
  if (upperLimit !== null && value > upperLimit) return false;
  if (lowerLimit !== null && value < lowerLimit) return false;
  return true;
}

export function calculateMeasurementStats(values: number[]) {
  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    min,
    max,
    avg,
    stdDev,
    range: max - min,
    count: values.length,
  };
}
