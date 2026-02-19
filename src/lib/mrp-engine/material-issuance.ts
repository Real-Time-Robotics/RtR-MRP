/**
 * Material Issuance
 * Issue materials from work orders (actual warehouse withdrawal) and ad-hoc issuance.
 */

import prisma from "../prisma";
import { logger } from "@/lib/logger";
import { isFeatureEnabled, FEATURE_FLAGS } from "../features/feature-flags";
import { recordMaterialCost } from "../finance/wo-cost-service";

// Issue materials from work order (actual warehouse withdrawal)
// When USE_WIP_WAREHOUSE flag is ON: deducts from source + creates in WIP
// When OFF: deducts from source only (original behavior)
export async function issueMaterials(workOrderId: string, allocationIds?: string[]) {
  const useWip = await isFeatureEnabled(FEATURE_FLAGS.USE_WIP_WAREHOUSE);
  const wipWarehouse = useWip
    ? await prisma.warehouse.findFirst({ where: { type: "WIP", status: "active" } })
    : null;

  // 1. Get allocated (not yet fully issued) allocations
  const whereClause: Record<string, unknown> = {
    workOrderId,
    status: "allocated",
    allocatedQty: { gt: 0 },
  };
  if (allocationIds && allocationIds.length > 0) {
    whereClause.id = { in: allocationIds };
  }

  const allocations = await prisma.materialAllocation.findMany({
    where: whereClause,
    include: { part: true },
  });

  for (const alloc of allocations) {
    const issueQty = alloc.allocatedQty - alloc.issuedQty;
    if (issueQty <= 0) continue;

    // Find inventory record matching the allocation
    const inventory = await prisma.inventory.findFirst({
      where: {
        partId: alloc.partId,
        warehouseId: alloc.warehouseId!,
        ...(alloc.lotNumber ? { lotNumber: alloc.lotNumber } : {}),
      },
    });

    if (!inventory || inventory.quantity < issueQty) {
      continue; // Skip if insufficient inventory
    }

    // Decrement inventory quantity and reserved qty
    await prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: { decrement: issueQty },
        reservedQty: { decrement: Math.min(issueQty, inventory.reservedQty) },
      },
    });

    // Update allocation: mark as issued
    await prisma.materialAllocation.update({
      where: { id: alloc.id },
      data: {
        issuedQty: alloc.issuedQty + issueQty,
        status: "issued",
      },
    });

    // Record actual material cost (non-blocking)
    try {
      await recordMaterialCost({
        workOrderId,
        partId: alloc.partId,
        quantity: issueQty,
        unitCost: alloc.part.unitCost,
        lotNumber: alloc.lotNumber || undefined,
        sourceId: alloc.id,
      });
    } catch (err) {
      logger.logError(err instanceof Error ? err : new Error(String(err)), { context: 'mrp-engine', operation: 'recordMaterialCost' });
    }

    // Create LotTransaction for source deduction
    if (alloc.lotNumber) {
      await prisma.lotTransaction.create({
        data: {
          lotNumber: alloc.lotNumber,
          transactionType: "ISSUED",
          partId: alloc.partId,
          quantity: issueQty,
          previousQty: inventory.quantity,
          newQty: inventory.quantity - issueQty,
          workOrderId,
          fromWarehouseId: alloc.warehouseId,
          toWarehouseId: wipWarehouse?.id || undefined,
          notes: useWip && wipWarehouse ? "Issued to WIP" : `Issued to WO ${workOrderId}`,
          userId: "system",
        },
      });
    }

    // WIP tracking: create/increment inventory in WIP warehouse
    if (useWip && wipWarehouse) {
      const lotNum = alloc.lotNumber || null;
      await prisma.inventory.upsert({
        where: {
          partId_warehouseId_lotNumber: {
            partId: alloc.partId,
            warehouseId: wipWarehouse.id,
            lotNumber: lotNum ?? "",
          },
        },
        create: {
          partId: alloc.partId,
          warehouseId: wipWarehouse.id,
          quantity: issueQty,
          lotNumber: lotNum,
        },
        update: {
          quantity: { increment: issueQty },
        },
      });

      // Log WIP receipt transaction
      if (alloc.lotNumber) {
        const wipInv = await prisma.inventory.findFirst({
          where: {
            partId: alloc.partId,
            warehouseId: wipWarehouse.id,
            lotNumber: alloc.lotNumber,
          },
        });
        await prisma.lotTransaction.create({
          data: {
            lotNumber: alloc.lotNumber,
            transactionType: "RECEIVED",
            partId: alloc.partId,
            quantity: issueQty,
            previousQty: (wipInv?.quantity || issueQty) - issueQty,
            newQty: wipInv?.quantity || issueQty,
            workOrderId,
            toWarehouseId: wipWarehouse.id,
            fromWarehouseId: alloc.warehouseId,
            notes: `Received from ${alloc.warehouseId} to WIP for production`,
            userId: "system",
          },
        });
      }
    }
  }

  const updated = await prisma.materialAllocation.findMany({
    where: { workOrderId },
    include: { part: true },
  });

  const fullyIssued = updated.every((a) => a.issuedQty >= a.requiredQty);

  return { allocations: updated, fullyIssued };
}

// Issue ad-hoc materials (non-WO: maintenance, samples, scrap, internal use)
export async function issueAdHocMaterials(params: {
  partId: string;
  warehouseId: string;
  quantity: number;
  lotNumber?: string;
  reason: string;
  issueType: string;
  userId: string;
  notes?: string;
  workOrderId?: string;
}) {
  const { partId, warehouseId, quantity, lotNumber, reason, issueType, userId, notes, workOrderId } = params;

  // Find matching inventory record
  const whereClause: Record<string, unknown> = {
    partId,
    warehouseId,
  };
  if (lotNumber) {
    whereClause.lotNumber = lotNumber;
  }

  const inventory = await prisma.inventory.findFirst({
    where: whereClause,
    include: { part: true, warehouse: true },
  });

  if (!inventory) {
    throw new Error("Không tìm thấy tồn kho cho part/kho này");
  }

  const available = inventory.quantity - inventory.reservedQty;
  if (available < quantity) {
    throw new Error(`Không đủ tồn kho. Khả dụng: ${available}, yêu cầu: ${quantity}`);
  }

  // Decrement inventory
  await prisma.inventory.update({
    where: { id: inventory.id },
    data: {
      quantity: { decrement: quantity },
    },
  });

  // If issuing for a Work Order, update MaterialAllocation
  if (workOrderId) {
    const existingAlloc = await prisma.materialAllocation.findUnique({
      where: { workOrderId_partId: { workOrderId, partId } },
    });

    if (existingAlloc) {
      // Part already in WO checklist — increase allocated/issued only (required stays as BOM standard)
      await prisma.materialAllocation.update({
        where: { id: existingAlloc.id },
        data: {
          allocatedQty: { increment: quantity },
          issuedQty: { increment: quantity },
        },
      });
    } else {
      // New part for this WO — create allocation as fully issued
      await prisma.materialAllocation.create({
        data: {
          workOrderId,
          partId,
          requiredQty: quantity,
          allocatedQty: quantity,
          issuedQty: quantity,
          warehouseId,
          lotNumber: lotNumber || undefined,
          status: "issued",
        },
      });
    }
  }

  // Create LotTransaction for traceability
  const txLotNumber = lotNumber || `ADHOC-${Date.now()}`;
  const transaction = await prisma.lotTransaction.create({
    data: {
      lotNumber: txLotNumber,
      transactionType: "ISSUED",
      partId,
      quantity,
      previousQty: inventory.quantity,
      newQty: inventory.quantity - quantity,
      fromWarehouseId: warehouseId,
      workOrderId: workOrderId || undefined,
      userId,
      notes: `[${issueType.toUpperCase()}] ${reason}${notes ? ` - ${notes}` : ""}`,
    },
  });

  return {
    transaction,
    inventory: {
      id: inventory.id,
      partNumber: inventory.part.partNumber,
      partName: inventory.part.name,
      warehouse: inventory.warehouse.name,
      previousQty: inventory.quantity,
      newQty: inventory.quantity - quantity,
      issuedQty: quantity,
    },
  };
}
