// src/lib/finance/variance.ts
// Cost Variance Analysis

import { prisma } from "@/lib/prisma";
import type { VarianceResult, VarianceDetail } from "./types";

/**
 * Calculate material price variance
 * (Standard Price - Actual Price) × Actual Quantity
 */
export async function calculateMaterialPriceVariance(
  periodYear: number,
  periodMonth: number
): Promise<VarianceResult> {
  const startDate = new Date(periodYear, periodMonth - 1, 1);
  const endDate = new Date(periodYear, periodMonth, 1);

  // Get purchase order lines received in the period
  const poLines = await prisma.purchaseOrderLine.findMany({
    where: {
      po: {
        status: { in: ["received", "partial", "completed"] },
        updatedAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      receivedQty: { gt: 0 },
    },
    include: {
      part: {
        include: {
          costs: true,
        },
      },
    },
  });

  let totalStandard = 0;
  let totalActual = 0;
  const details: VarianceDetail[] = [];

  for (const line of poLines) {
    const standardPrice = line.part?.costs?.[0]?.standardCost || line.part?.costs?.[0]?.unitCost || 0;
    const actualPrice = line.unitPrice;
    const quantity = line.receivedQty;

    const standardAmount = standardPrice * quantity;
    const actualAmount = actualPrice * quantity;
    const variance = standardAmount - actualAmount;

    totalStandard += standardAmount;
    totalActual += actualAmount;

    if (Math.abs(variance) > 0.01) {
      details.push({
        reference: line.part?.partNumber || "Unknown",
        description: `PO Receipt: ${quantity} @ $${actualPrice.toFixed(2)} vs std $${standardPrice.toFixed(2)}`,
        standardAmount,
        actualAmount,
        variance,
      });
    }
  }

  const varianceAmount = totalStandard - totalActual;
  const variancePercent =
    totalStandard > 0 ? (varianceAmount / totalStandard) * 100 : 0;

  return {
    varianceType: "MATERIAL_PRICE",
    standardAmount: totalStandard,
    actualAmount: totalActual,
    varianceAmount,
    variancePercent,
    favorable: varianceAmount >= 0,
    details: details.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)),
  };
}

/**
 * Calculate material usage variance
 * (Standard Quantity - Actual Quantity) × Standard Price
 */
export async function calculateMaterialUsageVariance(
  periodYear: number,
  periodMonth: number
): Promise<VarianceResult> {
  const startDate = new Date(periodYear, periodMonth - 1, 1);
  const endDate = new Date(periodYear, periodMonth, 1);

  // Get completed work orders for the period
  const workOrders = await prisma.workOrder.findMany({
    where: {
      status: "completed",
      actualEnd: {
        gte: startDate,
        lt: endDate,
      },
    },
    include: {
      product: {
        include: {
          bomHeaders: {
            where: { status: "active" },
            include: {
              bomLines: {
                include: {
                  part: {
                    include: { costs: true }
                  },
                },
              },
            },
          },
        },
      },
      allocations: {
        include: {
          part: {
            include: { costs: true }
          },
        },
      },
    },
  });

  let totalStandard = 0;
  let totalActual = 0;
  const details: VarianceDetail[] = [];

  for (const wo of workOrders) {
    const completedQty = wo.completedQty;
    const bom = wo.product?.bomHeaders[0];

    if (!bom) continue;

    // Calculate standard material for this WO
    let woStandard = 0;
    for (const bomLine of bom.bomLines) {
      const stdQty = bomLine.quantity * completedQty;
      const stdPrice = bomLine.part.costs?.[0]?.standardCost || bomLine.part.costs?.[0]?.unitCost || 0;
      woStandard += stdQty * stdPrice;
    }

    // Get actual material issued
    let woActual = 0;
    for (const alloc of wo.allocations) {
      const issuedQty = alloc.issuedQty - alloc.returnedQty;
      const unitCost = alloc.part.costs?.[0]?.standardCost || alloc.part.costs?.[0]?.unitCost || 0;
      woActual += issuedQty * unitCost;
    }

    const variance = woStandard - woActual;
    totalStandard += woStandard;
    totalActual += woActual;

    if (Math.abs(variance) > 0.01) {
      details.push({
        reference: wo.woNumber,
        description: `${wo.product?.name}: ${completedQty} units`,
        standardAmount: woStandard,
        actualAmount: woActual,
        variance,
      });
    }
  }

  const varianceAmount = totalStandard - totalActual;
  const variancePercent =
    totalStandard > 0 ? (varianceAmount / totalStandard) * 100 : 0;

  return {
    varianceType: "MATERIAL_USAGE",
    standardAmount: totalStandard,
    actualAmount: totalActual,
    varianceAmount,
    variancePercent,
    favorable: varianceAmount >= 0,
    details: details.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)),
  };
}

/**
 * Calculate labor efficiency variance
 * (Standard Hours - Actual Hours) × Standard Rate
 */
export async function calculateLaborEfficiencyVariance(
  periodYear: number,
  periodMonth: number,
  standardRate: number = 35
): Promise<VarianceResult> {
  const startDate = new Date(periodYear, periodMonth - 1, 1);
  const endDate = new Date(periodYear, periodMonth, 1);

  const workOrders = await prisma.workOrder.findMany({
    where: {
      status: "completed",
      actualEnd: {
        gte: startDate,
        lt: endDate,
      },
    },
    include: {
      product: {
        include: {
          routings: {
            where: { status: "active" },
            include: {
              operations: true,
            },
          },
        },
      },
      operations: {
        include: {
          laborEntries: true,
        },
      },
    },
  });

  let totalStandard = 0;
  let totalActual = 0;
  const details: VarianceDetail[] = [];

  for (const wo of workOrders) {
    const completedQty = wo.completedQty;
    const routing = wo.product?.routings[0];

    // Standard hours from routing
    let stdHours = 0;
    if (routing) {
      for (const op of routing.operations) {
        const setupHours = op.setupTime / 60; // minutes to hours
        const runHours = (op.runTimePerUnit * completedQty) / 60;
        stdHours += setupHours + runHours;
      }
    } else {
      // Use product assembly hours as fallback
      stdHours = (wo.product?.assemblyHours || 0) * completedQty;
    }

    // Actual hours from labor entries
    let actualHours = 0;
    for (const op of wo.operations) {
      for (const entry of op.laborEntries) {
        actualHours += entry.durationMinutes ? entry.durationMinutes / 60 : 0;
      }
    }

    const stdAmount = stdHours * standardRate;
    const actualAmount = actualHours * standardRate;
    const variance = stdAmount - actualAmount;

    totalStandard += stdAmount;
    totalActual += actualAmount;

    if (Math.abs(variance) > 0.01) {
      details.push({
        reference: wo.woNumber,
        description: `Std: ${stdHours.toFixed(1)}h, Actual: ${actualHours.toFixed(1)}h`,
        standardAmount: stdAmount,
        actualAmount: actualAmount,
        variance,
      });
    }
  }

  const varianceAmount = totalStandard - totalActual;
  const variancePercent =
    totalStandard > 0 ? (varianceAmount / totalStandard) * 100 : 0;

  return {
    varianceType: "LABOR_EFFICIENCY",
    standardAmount: totalStandard,
    actualAmount: totalActual,
    varianceAmount,
    variancePercent,
    favorable: varianceAmount >= 0,
    details: details.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)),
  };
}

/**
 * Calculate all variances for a period
 */
export async function calculateAllVariances(
  periodYear: number,
  periodMonth: number
): Promise<VarianceResult[]> {
  const [materialPrice, materialUsage, laborEfficiency] = await Promise.all([
    calculateMaterialPriceVariance(periodYear, periodMonth),
    calculateMaterialUsageVariance(periodYear, periodMonth),
    calculateLaborEfficiencyVariance(periodYear, periodMonth),
  ]);

  return [materialPrice, materialUsage, laborEfficiency];
}

/**
 * Save variance results to database
 */
export async function saveVarianceResults(
  variances: VarianceResult[],
  periodYear: number,
  periodMonth: number
): Promise<void> {
  for (const variance of variances) {
    await prisma.costVariance.create({
      data: {
        periodYear,
        periodMonth,
        varianceType: variance.varianceType,
        standardAmount: variance.standardAmount,
        actualAmount: variance.actualAmount,
        varianceAmount: variance.varianceAmount,
        variancePercent: variance.variancePercent,
        favorableFlag: variance.favorable,
      },
    });
  }
}

/**
 * Get variance summary for a period
 */
export async function getVarianceSummary(
  periodYear: number,
  periodMonth: number
): Promise<{
  totalStandard: number;
  totalActual: number;
  totalVariance: number;
  variances: {
    type: string;
    standard: number;
    actual: number;
    variance: number;
    favorable: boolean;
  }[];
}> {
  const variances = await prisma.costVariance.findMany({
    where: { periodYear, periodMonth },
  });

  let totalStandard = 0;
  let totalActual = 0;
  let totalVariance = 0;

  const summary = variances.map((v) => {
    totalStandard += v.standardAmount;
    totalActual += v.actualAmount;
    totalVariance += v.varianceAmount;

    return {
      type: v.varianceType,
      standard: v.standardAmount,
      actual: v.actualAmount,
      variance: v.varianceAmount,
      favorable: v.favorableFlag,
    };
  });

  return {
    totalStandard,
    totalActual,
    totalVariance,
    variances: summary,
  };
}
