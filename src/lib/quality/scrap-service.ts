// src/lib/quality/scrap-service.ts
// Dispose scrap inventory — final write-off from system

import { prisma } from "@/lib/prisma";

export type DisposalMethod = "PHYSICAL_DESTRUCTION" | "RECYCLING" | "HAZARDOUS_WASTE" | "OTHER";

interface DisposeInput {
  inventoryId: string;
  quantity: number;
  disposalMethod: DisposalMethod;
  disposalReference?: string;
  notes?: string;
}

interface DisposeResult {
  success: boolean;
  transactionId: string | null;
  writeOffValue: number;
  errors: string[];
}

/**
 * Dispose scrap inventory — final write-off from system
 */
export async function disposeScrapInventory(
  input: DisposeInput,
  disposedBy: string
): Promise<DisposeResult> {
  const { inventoryId, quantity, disposalMethod, disposalReference, notes } = input;

  // 1. Get inventory record
  const scrapInventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: { warehouse: true, part: true },
  });

  if (!scrapInventory) {
    return { success: false, transactionId: null, writeOffValue: 0, errors: ["Inventory not found"] };
  }

  if (scrapInventory.warehouse.type !== "SCRAP") {
    return { success: false, transactionId: null, writeOffValue: 0, errors: ["Inventory is not in SCRAP warehouse"] };
  }

  if (scrapInventory.quantity < quantity) {
    return { success: false, transactionId: null, writeOffValue: 0, errors: [`Insufficient quantity (have ${scrapInventory.quantity}, need ${quantity})`] };
  }

  // Calculate write-off value
  const writeOffValue = quantity * (scrapInventory.part.unitCost || 0);

  // 2. Execute disposal
  try {
    let transactionId: string = "";

    await prisma.$transaction(async (tx) => {
      // Deduct from SCRAP (final removal from inventory)
      await tx.inventory.update({
        where: { id: inventoryId },
        data: { quantity: { decrement: quantity } },
      });

      // Create disposal transaction
      const disposalTx = await tx.lotTransaction.create({
        data: {
          lotNumber: scrapInventory.lotNumber || `SCRAP-${inventoryId.slice(-8)}`,
          transactionType: "SCRAPPED",
          partId: scrapInventory.partId,
          quantity: -quantity,
          fromWarehouseId: scrapInventory.warehouseId,
          notes: `${disposalMethod}: ${notes || "Scrap disposal"} | Ref: ${disposalReference || "N/A"} | Value: ${writeOffValue}`,
          userId: disposedBy,
        },
      });
      transactionId = disposalTx.id;

      // Create disposal record for audit
      await tx.scrapDisposal.create({
        data: {
          partId: scrapInventory.partId,
          lotNumber: scrapInventory.lotNumber,
          quantity: quantity,
          unitCost: scrapInventory.part.unitCost || 0,
          totalValue: writeOffValue,
          disposalMethod: disposalMethod,
          disposalReference: disposalReference,
          notes: notes,
          disposedBy: disposedBy,
          disposedAt: new Date(),
        },
      });
    });

    return {
      success: true,
      transactionId,
      writeOffValue,
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      transactionId: null,
      writeOffValue: 0,
      errors: [error instanceof Error ? error.message : "Disposal failed"],
    };
  }
}

/**
 * Get all inventory in SCRAP warehouse pending disposal
 */
export async function getScrapInventory() {
  const scrapWarehouse = await prisma.warehouse.findFirst({ where: { type: "SCRAP" } });
  if (!scrapWarehouse) return [];

  return prisma.inventory.findMany({
    where: {
      warehouseId: scrapWarehouse.id,
      quantity: { gt: 0 },
    },
    include: { part: true },
    orderBy: { createdAt: "asc" },
  });
}
