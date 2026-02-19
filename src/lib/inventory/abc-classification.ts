// src/lib/inventory/abc-classification.ts
// R04: ABC classification based on annual usage value

import { prisma } from "@/lib/prisma";

interface ABCResult {
  partId: string;
  partNumber: string;
  name: string;
  annualUsageValue: number;
  cumulativePercent: number;
  abcClass: "A" | "B" | "C";
}

interface ABCConfig {
  classAPercent: number; // Top X% of value = A (default 80)
  classBPercent: number; // Next Y% = B (default 15), remaining = C
}

const DEFAULT_CONFIG: ABCConfig = {
  classAPercent: 80,
  classBPercent: 15,
};

/**
 * Run ABC classification across all active parts based on annual usage value.
 * Usage value = total issued quantity (last 12 months) * unit cost.
 */
export async function runABCClassification(
  config: ABCConfig = DEFAULT_CONFIG
): Promise<{ classified: number; results: ABCResult[] }> {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // Get all active parts with their issued quantities
  const parts = await prisma.part.findMany({
    where: { status: "active" },
    select: {
      id: true,
      partNumber: true,
      name: true,
      unitCost: true,
    },
  });

  // Calculate annual usage value per part
  const partValues: Array<{
    partId: string;
    partNumber: string;
    name: string;
    annualUsageValue: number;
  }> = [];

  for (const part of parts) {
    const issuedTxs = await prisma.lotTransaction.aggregate({
      where: {
        partId: part.id,
        transactionType: { in: ["ISSUED", "CONSUMED", "SHIPPED"] },
        createdAt: { gte: twelveMonthsAgo },
      },
      _sum: { quantity: true },
    });

    const totalIssued = issuedTxs._sum.quantity || 0;
    const annualUsageValue = totalIssued * part.unitCost;

    partValues.push({
      partId: part.id,
      partNumber: part.partNumber,
      name: part.name,
      annualUsageValue,
    });
  }

  // Sort by annual usage value descending
  partValues.sort((a, b) => b.annualUsageValue - a.annualUsageValue);

  const totalValue = partValues.reduce((sum, p) => sum + p.annualUsageValue, 0);

  // Assign ABC classes
  let cumulativeValue = 0;
  const results: ABCResult[] = partValues.map((p) => {
    cumulativeValue += p.annualUsageValue;
    const cumulativePercent = totalValue > 0 ? (cumulativeValue / totalValue) * 100 : 0;

    let abcClass: "A" | "B" | "C";
    if (cumulativePercent <= config.classAPercent) {
      abcClass = "A";
    } else if (cumulativePercent <= config.classAPercent + config.classBPercent) {
      abcClass = "B";
    } else {
      abcClass = "C";
    }

    return {
      ...p,
      cumulativePercent,
      abcClass,
    };
  });

  // Update parts in database
  for (const r of results) {
    await prisma.part.update({
      where: { id: r.partId },
      data: { abcClass: r.abcClass },
    });
  }

  return { classified: results.length, results };
}

/**
 * Get ABC summary statistics.
 */
export async function getABCSummary() {
  const [aCount, bCount, cCount, unclassified] = await Promise.all([
    prisma.part.count({ where: { abcClass: "A", status: "active" } }),
    prisma.part.count({ where: { abcClass: "B", status: "active" } }),
    prisma.part.count({ where: { abcClass: "C", status: "active" } }),
    prisma.part.count({ where: { abcClass: null, status: "active" } }),
  ]);

  return {
    A: aCount,
    B: bCount,
    C: cCount,
    unclassified,
    total: aCount + bCount + cCount + unclassified,
  };
}
