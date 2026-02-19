// src/lib/manufacturing/partial-release-service.ts
// R09: Partial Work Order Release — start production with available materials only

import { prisma } from "@/lib/prisma";

interface PartialReleaseCheck {
  workOrderId: string;
  woNumber: string;
  totalLines: number;
  availableLines: number;
  shortageLines: ShortageDetail[];
  maxProducibleQty: number;
  woQuantity: number;
  canPartialRelease: boolean;
}

interface ShortageDetail {
  partId: string;
  partNumber: string;
  partName: string;
  requiredQty: number;
  availableQty: number;
  shortageQty: number;
  shortagePercent: number;
}

interface PartialReleaseResult {
  success: boolean;
  workOrderId: string;
  releasedQty: number;
  originalQty: number;
  issuedAllocations: number;
  remainingShortages: ShortageDetail[];
  errors: string[];
}

/**
 * Check material availability and calculate the maximum producible quantity
 * for a work order without waiting for all materials.
 */
export async function checkPartialAvailability(
  workOrderId: string
): Promise<PartialReleaseCheck> {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      allocations: {
        include: { part: true },
      },
    },
  });

  if (!workOrder) {
    throw new Error("Work order not found");
  }

  const shortageLines: ShortageDetail[] = [];
  let maxProducibleRatio = Infinity;

  for (const alloc of workOrder.allocations) {
    // Get total available inventory across all warehouses
    const inventoryAgg = await prisma.inventory.aggregate({
      where: {
        partId: alloc.partId,
        quantity: { gt: 0 },
      },
      _sum: { quantity: true, reservedQty: true },
    });

    const totalQty = inventoryAgg._sum.quantity || 0;
    const reservedQty = inventoryAgg._sum.reservedQty || 0;
    const availableQty = Math.max(0, totalQty - reservedQty) + alloc.allocatedQty;

    if (availableQty < alloc.requiredQty) {
      const shortageQty = alloc.requiredQty - availableQty;
      shortageLines.push({
        partId: alloc.partId,
        partNumber: alloc.part.partNumber,
        partName: alloc.part.name,
        requiredQty: alloc.requiredQty,
        availableQty,
        shortageQty,
        shortagePercent:
          alloc.requiredQty > 0
            ? (shortageQty / alloc.requiredQty) * 100
            : 0,
      });
    }

    // Calculate max producible ratio based on BOM proportion
    if (alloc.requiredQty > 0) {
      const perUnitRequired = alloc.requiredQty / workOrder.quantity;
      const canProduce = perUnitRequired > 0
        ? Math.floor(availableQty / perUnitRequired)
        : workOrder.quantity;
      maxProducibleRatio = Math.min(maxProducibleRatio, canProduce);
    }
  }

  const maxProducibleQty =
    maxProducibleRatio === Infinity
      ? workOrder.quantity
      : Math.min(maxProducibleRatio, workOrder.quantity);

  return {
    workOrderId,
    woNumber: workOrder.woNumber,
    totalLines: workOrder.allocations.length,
    availableLines: workOrder.allocations.length - shortageLines.length,
    shortageLines,
    maxProducibleQty,
    woQuantity: workOrder.quantity,
    canPartialRelease: maxProducibleQty > 0 && shortageLines.length > 0,
  };
}

/**
 * Release a work order for partial production with only available materials.
 * Issues materials proportionally for the specified release quantity.
 */
export async function releasePartialWorkOrder(
  workOrderId: string,
  releaseQty: number,
  userId: string,
  notes?: string
): Promise<PartialReleaseResult> {
  const errors: string[] = [];

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      allocations: {
        include: { part: true },
      },
    },
  });

  if (!workOrder) {
    return { success: false, workOrderId, releasedQty: 0, originalQty: 0, issuedAllocations: 0, remainingShortages: [], errors: ["Work order not found"] };
  }

  if (!["draft", "planned"].includes(workOrder.status.toLowerCase())) {
    return { success: false, workOrderId, releasedQty: 0, originalQty: workOrder.quantity, issuedAllocations: 0, remainingShortages: [], errors: [`Work order must be in draft/planned status (current: ${workOrder.status})`] };
  }

  if (releaseQty <= 0 || releaseQty > workOrder.quantity) {
    return { success: false, workOrderId, releasedQty: 0, originalQty: workOrder.quantity, issuedAllocations: 0, remainingShortages: [], errors: [`Invalid release qty: ${releaseQty} (WO qty: ${workOrder.quantity})`] };
  }

  const ratio = releaseQty / workOrder.quantity;
  let issuedCount = 0;
  const remainingShortages: ShortageDetail[] = [];

  await prisma.$transaction(async (tx) => {
    // Update WO status to in_progress with partial flag in notes
    await tx.workOrder.update({
      where: { id: workOrderId },
      data: {
        status: "in_progress",
        actualStart: new Date(),
        notes: [
          workOrder.notes,
          `[PARTIAL RELEASE] ${releaseQty}/${workOrder.quantity} units released by ${userId}`,
          notes ? `Reason: ${notes}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    });

    // Issue materials proportionally
    for (const alloc of workOrder.allocations) {
      const proportionalQty = Math.ceil(alloc.requiredQty * ratio);

      // Find available inventory
      const inventoryRecords = await tx.inventory.findMany({
        where: {
          partId: alloc.partId,
          quantity: { gt: 0 },
        },
        orderBy: { createdAt: "asc" }, // FIFO by default for partial release
      });

      let remaining = proportionalQty;

      for (const inv of inventoryRecords) {
        if (remaining <= 0) break;

        const available = inv.quantity - inv.reservedQty;
        if (available <= 0) continue;

        const issueQty = Math.min(remaining, available);

        await tx.inventory.update({
          where: { id: inv.id },
          data: {
            quantity: { decrement: issueQty },
          },
        });

        remaining -= issueQty;
      }

      const actualIssued = proportionalQty - Math.max(0, remaining);

      if (actualIssued > 0) {
        await tx.materialAllocation.update({
          where: { id: alloc.id },
          data: {
            issuedQty: { increment: actualIssued },
            status: actualIssued >= alloc.requiredQty ? "issued" : "allocated",
          },
        });

        // Create lot transaction
        await tx.lotTransaction.create({
          data: {
            lotNumber: alloc.lotNumber || `PARTIAL-${workOrderId.slice(-8)}`,
            transactionType: "ISSUED",
            partId: alloc.partId,
            quantity: actualIssued,
            previousQty: 0,
            newQty: 0,
            workOrderId,
            userId,
            notes: `Partial release: ${actualIssued}/${alloc.requiredQty} (${releaseQty}/${workOrder.quantity} units)`,
          },
        });

        issuedCount++;
      }

      if (remaining > 0) {
        remainingShortages.push({
          partId: alloc.partId,
          partNumber: alloc.part.partNumber,
          partName: alloc.part.name,
          requiredQty: proportionalQty,
          availableQty: actualIssued,
          shortageQty: remaining,
          shortagePercent:
            proportionalQty > 0 ? (remaining / proportionalQty) * 100 : 0,
        });
      }
    }
  });

  return {
    success: true,
    workOrderId,
    releasedQty: releaseQty,
    originalQty: workOrder.quantity,
    issuedAllocations: issuedCount,
    remainingShortages,
    errors,
  };
}

/**
 * Get all work orders that can benefit from partial release
 * (have some but not all materials available).
 */
export async function getPartialReleaseCandidates(): Promise<
  Array<{
    workOrderId: string;
    woNumber: string;
    woQuantity: number;
    maxProducibleQty: number;
    availabilityPercent: number;
  }>
> {
  const pendingWOs = await prisma.workOrder.findMany({
    where: {
      status: { in: ["draft", "planned"] },
    },
    select: { id: true, woNumber: true, quantity: true },
  });

  const candidates = [];

  for (const wo of pendingWOs) {
    const check = await checkPartialAvailability(wo.id);
    if (check.canPartialRelease) {
      candidates.push({
        workOrderId: wo.id,
        woNumber: wo.woNumber,
        woQuantity: wo.quantity,
        maxProducibleQty: check.maxProducibleQty,
        availabilityPercent:
          wo.quantity > 0
            ? (check.maxProducibleQty / wo.quantity) * 100
            : 0,
      });
    }
  }

  return candidates.sort(
    (a, b) => b.availabilityPercent - a.availabilityPercent
  );
}
