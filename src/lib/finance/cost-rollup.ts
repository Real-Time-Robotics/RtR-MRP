// src/lib/finance/cost-rollup.ts
// BOM Cost Rollup Engine

import { prisma } from "@/lib/prisma";
import type { CostBreakdown, RollupResult } from "./types";

/**
 * Recursive BOM cost rollup engine
 * Calculates total cost of assemblies by rolling up component costs
 */
export async function rollupPartCost(
  partId: string,
  visitedParts: Set<string> = new Set()
): Promise<RollupResult> {
  // Prevent circular references
  if (visitedParts.has(partId)) {
    throw new Error(`Circular BOM reference detected for part ${partId}`);
  }
  visitedParts.add(partId);

  // Get part details with costs and BOM
  const part = await prisma.part.findUnique({
    where: { id: partId },
    include: {
      costs: true,
    },
  });

  if (!part) {
    throw new Error(`Part not found: ${partId}`);
  }

  // Get BOM lines where this part is the parent (assembly)
  const bomLines = await prisma.bomLine.findMany({
    where: {
      bom: {
        product: {
          sku: part.partNumber,
        },
        status: "active",
      },
    },
    include: {
      part: true,
    },
  });

  // Initialize cost breakdown
  const costs: CostBreakdown = {
    materialCost: 0,
    laborCost: 0,
    overheadCost: 0,
    subcontractCost: 0,
    otherCost: 0,
    totalCost: 0,
  };

  const children: RollupResult[] = [];

  // If part has BOM (is an assembly), roll up component costs
  if (bomLines.length > 0) {
    for (const bomLine of bomLines) {
      // Recursively get component cost
      const componentResult = await rollupPartCost(
        bomLine.partId,
        new Set(visitedParts)
      );

      // Multiply by quantity
      const qty = bomLine.quantity;

      costs.materialCost += componentResult.costs.materialCost * qty;
      costs.laborCost += componentResult.costs.laborCost * qty;
      costs.overheadCost += componentResult.costs.overheadCost * qty;
      costs.subcontractCost += componentResult.costs.subcontractCost * qty;
      costs.otherCost += componentResult.costs.otherCost * qty;

      children.push({
        ...componentResult,
        costs: {
          ...componentResult.costs,
          totalCost: componentResult.costs.totalCost * qty,
        },
      });
    }
  }

  // Add part's own costs (direct costs)
  const partCost = part.costs?.[0]; // Get first cost record if exists
  if (partCost) {
    // For now, assume standardCost or unitCost is primarily MATERIAL for buy parts
    // or direct material input for make parts not covered by children
    const directCost = partCost.standardCost || partCost.unitCost || 0;
    costs.materialCost += directCost;

    // Apply overhead if defined
    if (partCost.overheadPercent) {
      costs.overheadCost += directCost * (partCost.overheadPercent / 100);
    }
  }

  // Calculate total
  costs.totalCost =
    costs.materialCost +
    costs.laborCost +
    costs.overheadCost +
    costs.subcontractCost +
    costs.otherCost;

  // Calculate BOM level (0 = leaf, higher = more assembly levels)
  const bomLevel =
    children.length > 0 ? Math.max(...children.map((c) => c.bomLevel)) + 1 : 0;

  return {
    partId: part.id,
    partNumber: part.partNumber,
    bomLevel,
    costs,
    children,
  };
}

/**
 * Save rollup results to database
 */
export async function saveRollupResults(result: RollupResult): Promise<void> {
  await prisma.partCostRollup.upsert({
    where: { partId: result.partId },
    update: {
      materialCost: result.costs.materialCost,
      laborCost: result.costs.laborCost,
      overheadCost: result.costs.overheadCost,
      subcontractCost: result.costs.subcontractCost,
      otherCost: result.costs.otherCost,
      totalStandardCost: result.costs.totalCost,
      bomLevel: result.bomLevel,
      lastRollupAt: new Date(),
      rollupStatus: "CURRENT",
    },
    create: {
      partId: result.partId,
      materialCost: result.costs.materialCost,
      laborCost: result.costs.laborCost,
      overheadCost: result.costs.overheadCost,
      subcontractCost: result.costs.subcontractCost,
      otherCost: result.costs.otherCost,
      totalStandardCost: result.costs.totalCost,
      bomLevel: result.bomLevel,
      lastRollupAt: new Date(),
      rollupStatus: "CURRENT",
    },
  });

  // Recursively save children
  for (const child of result.children) {
    await saveRollupResults(child);
  }
}

/**
 * Get cost rollup for a part (from cache or calculate)
 */
export async function getPartCostRollup(partId: string): Promise<CostBreakdown | null> {
  // Try to get from cache first
  const cached = await prisma.partCostRollup.findUnique({
    where: { partId },
  });

  if (cached && cached.rollupStatus === "CURRENT") {
    return {
      materialCost: cached.materialCost,
      laborCost: cached.laborCost,
      overheadCost: cached.overheadCost,
      subcontractCost: cached.subcontractCost,
      otherCost: cached.otherCost,
      totalCost: cached.totalStandardCost,
    };
  }

  // Calculate and save
  try {
    const result = await rollupPartCost(partId);
    await saveRollupResults(result);
    return result.costs;
  } catch {
    return null;
  }
}

/**
 * Run full cost rollup for all parts
 */
export async function runFullCostRollup(): Promise<{
  processed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;

  // Get all parts
  const parts = await prisma.part.findMany({
    where: { status: "active" },
    orderBy: { partNumber: "asc" },
  });

  for (const part of parts) {
    try {
      const result = await rollupPartCost(part.id);
      await saveRollupResults(result);
      processed++;
    } catch (error) {
      errors.push(`${part.partNumber}: ${error}`);
    }
  }

  // Mark any parts not updated as stale
  await prisma.partCostRollup.updateMany({
    where: {
      lastRollupAt: {
        lt: new Date(Date.now() - 60000), // Not updated in last minute
      },
    },
    data: {
      rollupStatus: "STALE",
    },
  });

  return { processed, errors };
}

/**
 * Mark rollups as stale when BOM or costs change
 */
export async function markRollupStale(partId: string): Promise<void> {
  await prisma.partCostRollup.updateMany({
    where: { partId },
    data: { rollupStatus: "STALE" },
  });
}

/**
 * Get rollup status summary
 */
export async function getRollupStatus(): Promise<{
  current: number;
  stale: number;
  pending: number;
  missingCost: number;
}> {
  const [current, stale, pending] = await Promise.all([
    prisma.partCostRollup.count({ where: { rollupStatus: "CURRENT" } }),
    prisma.partCostRollup.count({ where: { rollupStatus: "STALE" } }),
    prisma.partCostRollup.count({ where: { rollupStatus: "PENDING" } }),
  ]);

  // Parts without rollup
  const totalParts = await prisma.part.count({ where: { status: "active" } });
  const partsWithRollup = await prisma.partCostRollup.count();
  const missingCost = totalParts - partsWithRollup;

  return { current, stale, pending, missingCost };
}
