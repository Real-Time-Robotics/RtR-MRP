// src/lib/inventory/cycle-count-service.ts
// R07: Cycle counting with ABC-based scheduling

import { prisma } from "@/lib/prisma";

interface CycleCountItem {
  inventoryId: string;
  partId: string;
  partNumber: string;
  partName: string;
  warehouseCode: string;
  lotNumber: string | null;
  systemQty: number;
  abcClass: string | null;
  lastCountDate: Date | null;
  daysSinceLastCount: number | null;
}

interface CycleCountResult {
  inventoryId: string;
  countedQty: number;
  systemQty: number;
  variance: number;
  variancePercent: number;
  adjustmentCreated: boolean;
}

// ABC-based count frequency (days between counts)
const ABC_FREQUENCY: Record<string, number> = {
  A: 30, // Monthly
  B: 90, // Quarterly
  C: 180, // Semi-annually
};

/**
 * Generate a cycle count list based on ABC classification and last count dates.
 * Parts with class A are counted more frequently than B or C.
 */
export async function generateCycleCountList(
  warehouseId?: string,
  maxItems: number = 50
): Promise<CycleCountItem[]> {
  const now = new Date();

  const whereClause: Record<string, unknown> = {
    quantity: { gt: 0 },
  };
  if (warehouseId) {
    whereClause.warehouseId = warehouseId;
  }

  const inventory = await prisma.inventory.findMany({
    where: whereClause,
    include: {
      part: { select: { partNumber: true, name: true, abcClass: true } },
      warehouse: { select: { code: true } },
    },
  });

  // Score each item: higher score = more urgent to count
  const scored = inventory.map((inv) => {
    const abcClass = inv.part.abcClass || "C";
    const frequency = ABC_FREQUENCY[abcClass] || 180;
    const lastCount = inv.lastCountDate;
    const daysSince = lastCount
      ? Math.floor((now.getTime() - lastCount.getTime()) / (1000 * 60 * 60 * 24))
      : 999; // Never counted = highest priority

    // Score: how overdue is this item? (daysSince / frequency)
    const score = daysSince / frequency;

    return {
      inventoryId: inv.id,
      partId: inv.partId,
      partNumber: inv.part.partNumber,
      partName: inv.part.name,
      warehouseCode: inv.warehouse.code,
      lotNumber: inv.lotNumber,
      systemQty: inv.quantity,
      abcClass: inv.part.abcClass,
      lastCountDate: inv.lastCountDate,
      daysSinceLastCount: lastCount ? daysSince : null,
      score,
    };
  });

  // Sort by score descending (most overdue first), take top N
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxItems).map(({ score: _s, ...item }) => item);
}

/**
 * Record a cycle count result and create adjustment if variance exists.
 */
export async function recordCycleCount(
  inventoryId: string,
  countedQty: number,
  userId: string,
  notes?: string
): Promise<CycleCountResult> {
  const inventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: { part: true, warehouse: true },
  });

  if (!inventory) {
    throw new Error("Inventory record not found");
  }

  const systemQty = inventory.quantity;
  const variance = countedQty - systemQty;
  const variancePercent = systemQty > 0 ? (variance / systemQty) * 100 : 0;

  let adjustmentCreated = false;

  await prisma.$transaction(async (tx) => {
    // Update last count date
    await tx.inventory.update({
      where: { id: inventoryId },
      data: { lastCountDate: new Date() },
    });

    // If variance exists, create adjustment
    if (variance !== 0) {
      await tx.inventory.update({
        where: { id: inventoryId },
        data: { quantity: countedQty },
      });

      // Create lot transaction for adjustment
      await tx.lotTransaction.create({
        data: {
          lotNumber: inventory.lotNumber || `CC-${inventoryId.slice(-8)}`,
          transactionType: "ADJUSTED",
          partId: inventory.partId,
          quantity: variance,
          previousQty: systemQty,
          newQty: countedQty,
          fromWarehouseId: inventory.warehouseId,
          toWarehouseId: inventory.warehouseId,
          userId,
          notes: `Cycle count adjustment: ${notes || ""}. System: ${systemQty}, Counted: ${countedQty}, Variance: ${variance}`,
        },
      });

      adjustmentCreated = true;
    }
  });

  return {
    inventoryId,
    countedQty,
    systemQty,
    variance,
    variancePercent,
    adjustmentCreated,
  };
}
