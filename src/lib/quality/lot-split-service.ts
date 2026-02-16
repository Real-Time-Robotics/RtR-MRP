// src/lib/quality/lot-split-service.ts
// Lot splitting service for Accept/Reject/Rework disposition after inspection
// Pattern: follows hold-service.ts

import { prisma } from "@/lib/prisma";
import { generateNCRNumber } from "./ncr-workflow";

// ============================================================================
// Interfaces
// ============================================================================

interface LotSplitInput {
  inventoryId: string;
  acceptQty: number;
  rejectQty: number;
  reworkQty: number;
  notes?: string;
  userId: string;
}

interface LotSplitResult {
  success: boolean;
  acceptLot?: string;
  rejectLot?: string;
  reworkLot?: string;
  ncrNumber?: string;
  reworkWONumber?: string;
  errors: string[];
}

// ============================================================================
// Helpers
// ============================================================================

function generateChildLotNumber(parentLot: string, suffix: string): string {
  // LOT-001 → LOT-001-A, LOT-001-R, LOT-001-RW
  return `${parentLot}-${suffix}`;
}

async function generateWONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const lastWO = await prisma.workOrder.findFirst({
    orderBy: { createdAt: "desc" },
    select: { woNumber: true },
  });
  const nextNum = lastWO
    ? parseInt(lastWO.woNumber.replace(/\D/g, "") || "0", 10) + 1
    : 1;
  return `WO-${year}-${String(nextNum).padStart(6, "0")}`;
}

// ============================================================================
// Core Split Function
// ============================================================================

/**
 * Split a lot into Accept / Reject / Rework dispositions.
 *
 * - Accept → MAIN warehouse
 * - Reject → QUARANTINE warehouse + auto-create NCR
 * - Rework → WIP warehouse + auto-create rework Work Order
 */
export async function splitLot(input: LotSplitInput): Promise<LotSplitResult> {
  const { inventoryId, acceptQty, rejectQty, reworkQty, notes, userId } = input;
  const totalSplit = acceptQty + rejectQty + reworkQty;

  // 1. Validate source inventory
  const sourceInventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: { warehouse: true, part: true },
  });

  if (!sourceInventory) {
    return { success: false, errors: ["Source inventory record not found"] };
  }

  if (sourceInventory.quantity < totalSplit) {
    return {
      success: false,
      errors: [
        `Split total (${totalSplit}) exceeds available quantity (${sourceInventory.quantity})`,
      ],
    };
  }

  if (totalSplit <= 0) {
    return { success: false, errors: ["Split quantities must sum to > 0"] };
  }

  const parentLot = sourceInventory.lotNumber || `INV-${inventoryId.slice(-8)}`;

  // 2. Look up target warehouses
  const [mainWarehouse, quarantineWarehouse, wipWarehouse] = await Promise.all([
    prisma.warehouse.findFirst({ where: { OR: [{ type: "MAIN" }, { isDefault: true }] } }),
    prisma.warehouse.findFirst({ where: { type: "QUARANTINE" } }),
    prisma.warehouse.findFirst({ where: { type: "WIP", status: "active" } }),
  ]);

  const errors: string[] = [];
  if (acceptQty > 0 && !mainWarehouse) errors.push("No MAIN warehouse found for accepted material");
  if (rejectQty > 0 && !quarantineWarehouse) errors.push("No QUARANTINE warehouse found for rejected material");
  if (reworkQty > 0 && !wipWarehouse) errors.push("No WIP warehouse found for rework material");

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // 3. Execute split in transaction
  try {
    let acceptLot: string | undefined;
    let rejectLot: string | undefined;
    let reworkLot: string | undefined;
    let ncrNumber: string | undefined;
    let reworkWONumber: string | undefined;

    await prisma.$transaction(async (tx) => {
      // Deduct from source
      await tx.inventory.update({
        where: { id: inventoryId },
        data: { quantity: { decrement: totalSplit } },
      });

      // Log source deduction
      await tx.lotTransaction.create({
        data: {
          lotNumber: parentLot,
          transactionType: "ADJUSTED",
          partId: sourceInventory.partId,
          quantity: -totalSplit,
          previousQty: sourceInventory.quantity,
          newQty: sourceInventory.quantity - totalSplit,
          fromWarehouseId: sourceInventory.warehouseId,
          notes: `Lot split: ${notes || "Quality disposition"}`,
          userId,
          parentLots: [parentLot],
        },
      });

      // --- Accept lot ---
      if (acceptQty > 0 && mainWarehouse) {
        acceptLot = generateChildLotNumber(parentLot, "A");

        await tx.inventory.upsert({
          where: {
            partId_warehouseId_lotNumber: {
              partId: sourceInventory.partId,
              warehouseId: mainWarehouse.id,
              lotNumber: acceptLot,
            },
          },
          create: {
            partId: sourceInventory.partId,
            warehouseId: mainWarehouse.id,
            quantity: acceptQty,
            lotNumber: acceptLot,
            expiryDate: sourceInventory.expiryDate,
          },
          update: {
            quantity: { increment: acceptQty },
          },
        });

        await tx.lotTransaction.create({
          data: {
            lotNumber: acceptLot,
            transactionType: "RECEIVED",
            partId: sourceInventory.partId,
            quantity: acceptQty,
            toWarehouseId: mainWarehouse.id,
            fromWarehouseId: sourceInventory.warehouseId,
            notes: `Accepted from lot split: ${parentLot}`,
            userId,
            parentLots: [parentLot],
          },
        });
      }

      // --- Reject lot ---
      if (rejectQty > 0 && quarantineWarehouse) {
        rejectLot = generateChildLotNumber(parentLot, "R");

        await tx.inventory.upsert({
          where: {
            partId_warehouseId_lotNumber: {
              partId: sourceInventory.partId,
              warehouseId: quarantineWarehouse.id,
              lotNumber: rejectLot,
            },
          },
          create: {
            partId: sourceInventory.partId,
            warehouseId: quarantineWarehouse.id,
            quantity: rejectQty,
            lotNumber: rejectLot,
            expiryDate: sourceInventory.expiryDate,
          },
          update: {
            quantity: { increment: rejectQty },
          },
        });

        await tx.lotTransaction.create({
          data: {
            lotNumber: rejectLot,
            transactionType: "INSPECTED",
            partId: sourceInventory.partId,
            quantity: rejectQty,
            toWarehouseId: quarantineWarehouse.id,
            fromWarehouseId: sourceInventory.warehouseId,
            notes: `Rejected from lot split: ${parentLot}`,
            userId,
            parentLots: [parentLot],
          },
        });

        // Auto-create NCR
        ncrNumber = await generateNCRNumber();
        const ncr = await tx.nCR.create({
          data: {
            ncrNumber,
            source: "IN_PROCESS",
            partId: sourceInventory.partId,
            lotNumber: rejectLot,
            quantityAffected: rejectQty,
            title: `Rejected lot from split: ${parentLot}`,
            description: `Lot split rejection: ${notes || "Failed quality inspection"}`,
            status: "open",
            priority: "medium",
            disposition: "SCRAP",
            createdBy: userId,
          },
        });

        await tx.nCRHistory.create({
          data: {
            ncrId: ncr.id,
            action: "CREATED",
            toStatus: "open",
            comment: `Auto-created from lot split of ${parentLot}`,
            userId,
          },
        });
      }

      // --- Rework lot ---
      if (reworkQty > 0 && wipWarehouse) {
        reworkLot = generateChildLotNumber(parentLot, "RW");

        await tx.inventory.upsert({
          where: {
            partId_warehouseId_lotNumber: {
              partId: sourceInventory.partId,
              warehouseId: wipWarehouse.id,
              lotNumber: reworkLot,
            },
          },
          create: {
            partId: sourceInventory.partId,
            warehouseId: wipWarehouse.id,
            quantity: reworkQty,
            lotNumber: reworkLot,
            expiryDate: sourceInventory.expiryDate,
          },
          update: {
            quantity: { increment: reworkQty },
          },
        });

        await tx.lotTransaction.create({
          data: {
            lotNumber: reworkLot,
            transactionType: "RECEIVED",
            partId: sourceInventory.partId,
            quantity: reworkQty,
            toWarehouseId: wipWarehouse.id,
            fromWarehouseId: sourceInventory.warehouseId,
            notes: `Rework from lot split: ${parentLot}`,
            userId,
            parentLots: [parentLot],
          },
        });

        // Auto-create rework Work Order
        // Find a product linked to this part (or use a generic rework product)
        const product = await tx.product.findFirst({
          where: { status: "active" },
          select: { id: true },
        });

        if (product) {
          reworkWONumber = await generateWONumber();
          await tx.workOrder.create({
            data: {
              woNumber: reworkWONumber,
              productId: product.id,
              quantity: reworkQty,
              priority: "high",
              status: "draft",
              woType: "DISCRETE",
              notes: `Rework WO from lot split: ${parentLot}. ${notes || ""}`.trim(),
              allocations: {
                create: [
                  {
                    partId: sourceInventory.partId,
                    requiredQty: reworkQty,
                    allocatedQty: 0,
                    issuedQty: 0,
                    status: "pending",
                  },
                ],
              },
            },
          });
        }
      }
    });

    return {
      success: true,
      acceptLot,
      rejectLot,
      reworkLot,
      ncrNumber,
      reworkWONumber,
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Lot split failed"],
    };
  }
}

/**
 * Get all lots that were created from splitting a parent lot.
 */
export async function getChildLots(parentLotNumber: string) {
  return prisma.lotTransaction.findMany({
    where: {
      parentLots: { array_contains: [parentLotNumber] },
      quantity: { gt: 0 },
    },
    orderBy: { createdAt: "desc" },
  });
}
