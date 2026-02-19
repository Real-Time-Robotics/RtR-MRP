/**
 * Material Allocation
 * Regenerate and allocate materials to work orders using picking strategies.
 */

import prisma from "../prisma";
import { allocateByStrategy } from "../inventory/picking-engine";

// Regenerate material allocations from active BOM for an existing work order
export async function regenerateAllocations(workOrderId: string) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      product: {
        include: {
          bomHeaders: {
            where: { status: "active" },
            include: { bomLines: true },
          },
        },
      },
      allocations: true,
    },
  });

  if (!workOrder) throw new Error("Work order not found");

  const bom = workOrder.product.bomHeaders[0];
  if (!bom) {
    return { allocations: workOrder.allocations, regenerated: false, reason: "No active BOM found" };
  }

  // Delete existing pending allocations (keep allocated/issued ones)
  if (workOrder.allocations.length > 0) {
    await prisma.materialAllocation.deleteMany({
      where: { workOrderId, status: "pending" },
    });
  }

  // Create new allocations from BOM
  const newAllocations = [];
  for (const line of bom.bomLines) {
    const requiredQty = Math.ceil(line.quantity * workOrder.quantity * (1 + line.scrapRate));

    // Check if this part already has a non-pending allocation
    const existing = workOrder.allocations.find(
      (a) => a.partId === line.partId && a.status !== "pending"
    );
    if (existing) continue;

    newAllocations.push({
      workOrderId,
      partId: line.partId,
      requiredQty,
    });
  }

  if (newAllocations.length > 0) {
    await prisma.materialAllocation.createMany({
      data: newAllocations,
      skipDuplicates: true,
    });
  }

  const updated = await prisma.materialAllocation.findMany({
    where: { workOrderId },
    include: { part: true },
  });

  return { allocations: updated, regenerated: true };
}

// Allocate materials to work order
export async function allocateMaterials(workOrderId: string) {
  const allocations = await prisma.materialAllocation.findMany({
    where: { workOrderId, status: "pending" },
  });

  for (const alloc of allocations) {
    // Use picking engine for strategy-aware allocation (FIFO/FEFO/ANY)
    // Find any warehouse that has this part
    const inventoryRecord = await prisma.inventory.findFirst({
      where: { partId: alloc.partId, quantity: { gt: 0 } },
      select: { warehouseId: true },
    });

    if (inventoryRecord) {
      const pickResult = await allocateByStrategy({
        partId: alloc.partId,
        warehouseId: inventoryRecord.warehouseId,
        requiredQty: alloc.requiredQty,
      });

      if (pickResult.allocations.length > 0) {
        // Use the first allocation (primary lot)
        const pick = pickResult.allocations[0];
        const allocateQty = Math.min(pick.quantity, alloc.requiredQty);

        if (allocateQty > 0) {
          await prisma.inventory.update({
            where: { id: pick.inventoryId },
            data: { reservedQty: { increment: allocateQty } },
          });

          await prisma.materialAllocation.update({
            where: { id: alloc.id },
            data: {
              allocatedQty: allocateQty,
              warehouseId: inventoryRecord.warehouseId,
              lotNumber: pick.lotNumber,
              status: allocateQty >= alloc.requiredQty ? "allocated" : "pending",
            },
          });
        }
      }
    }
  }

  const updated = await prisma.materialAllocation.findMany({
    where: { workOrderId },
    include: { part: true },
  });

  const fullyAllocated = updated.every((a) => a.allocatedQty >= a.requiredQty);

  return { allocations: updated, fullyAllocated };
}
