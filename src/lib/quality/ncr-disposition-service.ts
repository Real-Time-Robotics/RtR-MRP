// src/lib/quality/ncr-disposition-service.ts
// Execute NCR dispositions — move inventory from QUARANTINE to appropriate warehouse

import { prisma } from "@/lib/prisma";
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/features/feature-flags";

export type DispositionType = "SCRAP" | "REWORK" | "RETURN_TO_VENDOR" | "USE_AS_IS";

interface DispositionInput {
  ncrId: string;
  disposition: DispositionType;
  quantity: number;
  notes?: string;
  returnRmaNumber?: string;
  deviationNumber?: string;
}

interface DispositionResult {
  success: boolean;
  fromWarehouse: string;
  toWarehouse: string | null;
  transactionIds: string[];
  errors: string[];
}

export async function executeNcrDisposition(
  input: DispositionInput,
  executedBy: string
): Promise<DispositionResult> {
  const { ncrId, disposition, quantity, notes } = input;
  const transactionIds: string[] = [];

  // 1. Get NCR details
  const ncr = await prisma.nCR.findUnique({
    where: { id: ncrId },
    include: { part: true },
  });

  if (!ncr) {
    return { success: false, fromWarehouse: "", toWarehouse: null, transactionIds: [], errors: ["NCR not found"] };
  }

  if (ncr.status === "closed" || ncr.status === "voided") {
    return { success: false, fromWarehouse: "", toWarehouse: null, transactionIds: [], errors: ["NCR already closed/voided"] };
  }

  if (!ncr.partId) {
    return { success: false, fromWarehouse: "", toWarehouse: null, transactionIds: [], errors: ["NCR has no associated part"] };
  }

  // 2. Get QUARANTINE warehouse
  const quarantineWh = await prisma.warehouse.findFirst({ where: { type: "QUARANTINE" } });
  if (!quarantineWh) {
    return { success: false, fromWarehouse: "", toWarehouse: null, transactionIds: [], errors: ["QUARANTINE warehouse not found"] };
  }

  // 3. Check quarantine inventory
  const quarantineInv = await prisma.inventory.findFirst({
    where: {
      partId: ncr.partId,
      warehouseId: quarantineWh.id,
      ...(ncr.lotNumber ? { lotNumber: ncr.lotNumber } : {}),
      quantity: { gte: quantity },
    },
  });

  if (!quarantineInv) {
    return {
      success: false,
      fromWarehouse: quarantineWh.code,
      toWarehouse: null,
      transactionIds: [],
      errors: [`Insufficient quarantine inventory for part ${ncr.part?.partNumber || ncr.partId}`],
    };
  }

  // 4. Determine target warehouse based on disposition
  let targetWarehouse: { id: string; code: string } | null = null;
  let transactionType: string;
  let txNotes: string;

  switch (disposition) {
    case "SCRAP":
      targetWarehouse = await prisma.warehouse.findFirst({ where: { type: "SCRAP" } });
      transactionType = "SCRAPPED";
      txNotes = `NCR ${ncr.ncrNumber}: Scrapped - ${notes || "Defective material"}`;
      break;

    case "REWORK": {
      const useWip = await isFeatureEnabled(FEATURE_FLAGS.USE_WIP_WAREHOUSE);
      if (useWip) {
        targetWarehouse = await prisma.warehouse.findFirst({ where: { type: "WIP" } });
      } else {
        targetWarehouse = await prisma.warehouse.findFirst({
          where: { OR: [{ type: "MAIN" }, { isDefault: true }] },
        });
      }
      transactionType = "ISSUED";
      txNotes = `NCR ${ncr.ncrNumber}: Sent for rework - ${notes || ""}`;
      break;
    }

    case "RETURN_TO_VENDOR":
      targetWarehouse = null; // Leaves inventory system
      transactionType = "SHIPPED";
      txNotes = `NCR ${ncr.ncrNumber}: Returned to supplier - RMA: ${input.returnRmaNumber || "N/A"}`;
      break;

    case "USE_AS_IS":
      targetWarehouse = await prisma.warehouse.findFirst({
        where: { OR: [{ type: "MAIN" }, { isDefault: true }] },
      });
      transactionType = "ADJUSTED";
      txNotes = `NCR ${ncr.ncrNumber}: Accepted with deviation ${input.deviationNumber || ""} - ${notes || ""}`;
      break;

    default:
      return { success: false, fromWarehouse: quarantineWh.code, toWarehouse: null, transactionIds: [], errors: ["Invalid disposition type"] };
  }

  // 5. Execute transfer in transaction
  try {
    await prisma.$transaction(async (tx) => {
      // 5a. Deduct from QUARANTINE
      await tx.inventory.update({
        where: { id: quarantineInv.id },
        data: { quantity: { decrement: quantity } },
      });

      const outTx = await tx.lotTransaction.create({
        data: {
          lotNumber: ncr.lotNumber || `NCR-${ncr.ncrNumber}`,
          transactionType: "ADJUSTED",
          partId: ncr.partId,
          quantity: -quantity,
          fromWarehouseId: quarantineWh.id,
          toWarehouseId: targetWarehouse?.id || null,
          ncrId: ncr.id,
          notes: `Disposition ${disposition}: out of QUARANTINE`,
          userId: executedBy,
        },
      });
      transactionIds.push(outTx.id);

      // 5b. Add to target warehouse (if not RETURN_TO_VENDOR)
      if (targetWarehouse) {
        await tx.inventory.upsert({
          where: {
            partId_warehouseId_lotNumber: {
              partId: ncr.partId!,
              warehouseId: targetWarehouse.id,
              lotNumber: ncr.lotNumber ?? "",
            },
          },
          create: {
            partId: ncr.partId!,
            warehouseId: targetWarehouse.id,
            lotNumber: ncr.lotNumber,
            quantity: quantity,
          },
          update: {
            quantity: { increment: quantity },
          },
        });

        const inTx = await tx.lotTransaction.create({
          data: {
            lotNumber: ncr.lotNumber || `NCR-${ncr.ncrNumber}`,
            transactionType,
            partId: ncr.partId,
            quantity: quantity,
            fromWarehouseId: quarantineWh.id,
            toWarehouseId: targetWarehouse.id,
            ncrId: ncr.id,
            notes: txNotes,
            userId: executedBy,
          },
        });
        transactionIds.push(inTx.id);
      } else {
        // RETURN_TO_VENDOR — log exit from system
        const exitTx = await tx.lotTransaction.create({
          data: {
            lotNumber: ncr.lotNumber || `NCR-${ncr.ncrNumber}`,
            transactionType: "SHIPPED",
            partId: ncr.partId,
            quantity: -quantity,
            fromWarehouseId: quarantineWh.id,
            ncrId: ncr.id,
            notes: txNotes,
            userId: executedBy,
          },
        });
        transactionIds.push(exitTx.id);
      }

      // 5c. Update NCR
      await tx.nCR.update({
        where: { id: ncrId },
        data: {
          disposition: disposition,
          dispositionReason: notes || null,
          dispositionBy: executedBy,
          dispositionAt: new Date(),
          status: "completed",
        },
      });

      // 5d. Log NCR history
      await tx.nCRHistory.create({
        data: {
          ncrId,
          action: "DISPOSITION_EXECUTED",
          fromStatus: ncr.status,
          toStatus: "completed",
          comment: `${disposition}: ${txNotes}`,
          userId: executedBy,
        },
      });
    });

    return {
      success: true,
      fromWarehouse: quarantineWh.code,
      toWarehouse: targetWarehouse?.code || "RETURNED",
      transactionIds,
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      fromWarehouse: quarantineWh.code,
      toWarehouse: null,
      transactionIds: [],
      errors: [error instanceof Error ? error.message : "Disposition failed"],
    };
  }
}
