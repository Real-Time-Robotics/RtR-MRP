// src/lib/quality/hold-service.ts
// Release or Reject inventory from HOLD warehouse

import { prisma } from "@/lib/prisma";
import { generateNCRNumber } from "./ncr-workflow";

export type HoldDecision = "RELEASE" | "REJECT";

interface HoldDecisionInput {
  inventoryId: string;
  decision: HoldDecision;
  quantity: number;
  notes?: string;
  reviewedBy: string;
}

interface HoldDecisionResult {
  success: boolean;
  fromWarehouse: string;
  toWarehouse: string;
  ncrNumber?: string;
  errors: string[];
}

/**
 * Release or Reject inventory from HOLD warehouse
 *
 * RELEASE → Move to MAIN (approved for use)
 * REJECT  → Move to QUARANTINE (auto-create NCR)
 */
export async function executeHoldDecision(
  input: HoldDecisionInput
): Promise<HoldDecisionResult> {
  const { inventoryId, decision, quantity, notes, reviewedBy } = input;

  // 1. Get inventory record
  const holdInventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: { warehouse: true, part: true },
  });

  if (!holdInventory) {
    return { success: false, fromWarehouse: "", toWarehouse: "", errors: ["Inventory not found"] };
  }

  if (holdInventory.warehouse.type !== "HOLD") {
    return { success: false, fromWarehouse: "", toWarehouse: "", errors: ["Inventory is not in HOLD warehouse"] };
  }

  if (holdInventory.quantity < quantity) {
    return {
      success: false,
      fromWarehouse: holdInventory.warehouse.code,
      toWarehouse: "",
      errors: [`Insufficient quantity (have ${holdInventory.quantity}, need ${quantity})`],
    };
  }

  // 2. Determine target warehouse
  let targetWarehouse;

  switch (decision) {
    case "RELEASE":
      targetWarehouse = await prisma.warehouse.findFirst({
        where: { OR: [{ type: "MAIN" }, { isDefault: true }] },
      });
      break;

    case "REJECT":
      targetWarehouse = await prisma.warehouse.findFirst({ where: { type: "QUARANTINE" } });
      break;

    default:
      return { success: false, fromWarehouse: holdInventory.warehouse.code, toWarehouse: "", errors: ["Invalid decision"] };
  }

  if (!targetWarehouse) {
    return { success: false, fromWarehouse: holdInventory.warehouse.code, toWarehouse: "", errors: ["Target warehouse not found"] };
  }

  // 3. Execute transfer
  try {
    let ncrNumber: string | undefined;

    await prisma.$transaction(async (tx) => {
      // Deduct from HOLD
      await tx.inventory.update({
        where: { id: inventoryId },
        data: { quantity: { decrement: quantity } },
      });

      await tx.lotTransaction.create({
        data: {
          lotNumber: holdInventory.lotNumber || `HOLD-${inventoryId.slice(-8)}`,
          transactionType: "ADJUSTED",
          partId: holdInventory.partId,
          quantity: -quantity,
          fromWarehouseId: holdInventory.warehouseId,
          toWarehouseId: targetWarehouse.id,
          notes: `${decision} from HOLD: ${notes || ""}`,
          userId: reviewedBy,
        },
      });

      // Add to target warehouse
      await tx.inventory.upsert({
        where: {
          partId_warehouseId_lotNumber: {
            partId: holdInventory.partId,
            warehouseId: targetWarehouse.id,
            lotNumber: holdInventory.lotNumber ?? "",
          },
        },
        create: {
          partId: holdInventory.partId,
          warehouseId: targetWarehouse.id,
          lotNumber: holdInventory.lotNumber,
          quantity: quantity,
        },
        update: {
          quantity: { increment: quantity },
        },
      });

      await tx.lotTransaction.create({
        data: {
          lotNumber: holdInventory.lotNumber || `HOLD-${inventoryId.slice(-8)}`,
          transactionType: decision === "RELEASE" ? "RECEIVED" : "INSPECTED",
          partId: holdInventory.partId,
          quantity: quantity,
          fromWarehouseId: holdInventory.warehouseId,
          toWarehouseId: targetWarehouse.id,
          notes: decision === "RELEASE"
            ? `Released from HOLD: ${notes || "Approved for use"}`
            : `Rejected from HOLD: ${notes || "Failed review"}`,
          userId: reviewedBy,
        },
      });

      // If REJECT, auto-create NCR
      if (decision === "REJECT") {
        ncrNumber = await generateNCRNumber();

        const ncr = await tx.nCR.create({
          data: {
            ncrNumber,
            source: "IN_PROCESS",
            partId: holdInventory.partId,
            lotNumber: holdInventory.lotNumber,
            quantityAffected: quantity,
            title: `Rejected from HOLD review`,
            description: `Inventory rejected during HOLD review: ${notes || "Failed quality review"}`,
            status: "open",
            priority: "medium",
            createdBy: reviewedBy,
          },
        });

        await tx.nCRHistory.create({
          data: {
            ncrId: ncr.id,
            action: "CREATED",
            toStatus: "open",
            comment: "Auto-created from HOLD rejection",
            userId: reviewedBy,
          },
        });
      }
    });

    return {
      success: true,
      fromWarehouse: holdInventory.warehouse.code,
      toWarehouse: targetWarehouse.code,
      ncrNumber,
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      fromWarehouse: holdInventory.warehouse.code,
      toWarehouse: "",
      errors: [error instanceof Error ? error.message : "Decision execution failed"],
    };
  }
}

/**
 * Get all inventory in HOLD warehouse pending review
 */
export async function getHoldInventory() {
  const holdWarehouse = await prisma.warehouse.findFirst({ where: { type: "HOLD" } });
  if (!holdWarehouse) return [];

  return prisma.inventory.findMany({
    where: {
      warehouseId: holdWarehouse.id,
      quantity: { gt: 0 },
    },
    include: { part: true },
    orderBy: { createdAt: "asc" },
  });
}
