// src/lib/quality/rework-wo-service.ts
// R10: Rework Work Order Flow — create rework WOs from NCR disposition

import { prisma } from "@/lib/prisma";

interface ReworkWOInput {
  ncrId: string;
  reworkInstructions: string;
  quantity?: number; // Override NCR quantity if partial rework
  priority?: string;
  userId: string;
  notes?: string;
}

interface ReworkWOResult {
  success: boolean;
  reworkWOId?: string;
  reworkWONumber?: string;
  originalWOId?: string;
  ncrId: string;
  quantity: number;
  errors: string[];
}

/**
 * Create a rework Work Order linked to an NCR with REWORK disposition.
 * Copies the BOM from the original WO/product and links back to the NCR.
 */
export async function createReworkWorkOrder(
  input: ReworkWOInput
): Promise<ReworkWOResult> {
  const { ncrId, reworkInstructions, priority, userId, notes } = input;
  const errors: string[] = [];

  // 1. Load NCR with related entities
  const ncr = await prisma.nCR.findUnique({
    where: { id: ncrId },
    include: {
      workOrder: {
        include: {
          product: {
            include: {
              bomHeaders: {
                where: { status: "active" },
                include: { bomLines: true },
              },
            },
          },
        },
      },
      part: true,
    },
  });

  if (!ncr) {
    return { success: false, ncrId, quantity: 0, errors: ["NCR not found"] };
  }

  if (ncr.disposition !== "REWORK") {
    return {
      success: false,
      ncrId,
      quantity: 0,
      errors: [`NCR disposition must be REWORK (current: ${ncr.disposition})`],
    };
  }

  if (ncr.reworkWorkOrderId) {
    return {
      success: false,
      ncrId,
      quantity: 0,
      reworkWOId: ncr.reworkWorkOrderId,
      errors: ["Rework WO already created for this NCR"],
    };
  }

  const quantity = input.quantity || ncr.quantityAffected;
  if (quantity <= 0) {
    return { success: false, ncrId, quantity: 0, errors: ["Rework quantity must be > 0"] };
  }

  // 2. Determine product and BOM for rework
  const originalWO = ncr.workOrder;
  const product = originalWO?.product;
  const bom = product?.bomHeaders?.[0];

  if (!product) {
    // If no WO/product linked, we can still create a rework WO without BOM
    if (!ncr.productId) {
      return {
        success: false,
        ncrId,
        quantity,
        errors: ["No product linked to NCR — cannot create rework WO"],
      };
    }
  }

  const productId = product?.id || ncr.productId!;

  // 3. Create rework WO
  const woNumber = `RW-${ncr.ncrNumber}`;

  const reworkWO = await prisma.$transaction(async (tx) => {
    // Create the rework work order
    const wo = await tx.workOrder.create({
      data: {
        woNumber,
        productId,
        quantity,
        priority: priority || ncr.priority || "high",
        status: "draft",
        woType: "DISCRETE",
        notes: [
          `[REWORK WO] Created from NCR: ${ncr.ncrNumber}`,
          `Original WO: ${originalWO?.woNumber || "N/A"}`,
          `Rework instructions: ${reworkInstructions}`,
          notes ? `Notes: ${notes}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        plannedStart: new Date(),
        // Rework WOs typically need fewer materials — only create allocations
        // if BOM exists, at reduced quantities (rework usually reuses defective parts)
        allocations: bom
          ? {
              create: bom.bomLines
                .filter((line) => {
                  // For rework, only include consumable materials (not the main assembly)
                  // This is a heuristic — rework typically needs fasteners, adhesives, etc.
                  return line.quantity < 1; // Sub-assembly components
                })
                .map((line) => ({
                  partId: line.partId,
                  requiredQty: Math.ceil(line.quantity * quantity * 0.5), // 50% of normal — rework reuses existing materials
                })),
            }
          : undefined,
      },
    });

    // Update NCR with rework WO reference
    await tx.nCR.update({
      where: { id: ncrId },
      data: {
        reworkWorkOrderId: wo.id,
        reworkInstructions,
        status: "in_rework",
      },
    });

    // Create NCR history entry
    await tx.nCRHistory.create({
      data: {
        ncrId,
        action: "STATUS_CHANGE",
        fromStatus: ncr.status,
        toStatus: "in_rework",
        comment: `Rework WO ${woNumber} created (${quantity} units)`,
        userId,
      },
    });

    return wo;
  });

  return {
    success: true,
    reworkWOId: reworkWO.id,
    reworkWONumber: reworkWO.woNumber,
    originalWOId: originalWO?.id,
    ncrId,
    quantity,
    errors,
  };
}

/**
 * Complete rework WO and update the linked NCR to pending_verification.
 */
export async function completeReworkWO(
  workOrderId: string,
  completedQty: number,
  userId: string,
  notes?: string
): Promise<{
  success: boolean;
  ncrId?: string;
  passedQty: number;
  failedQty: number;
  errors: string[];
}> {
  const errors: string[] = [];

  // Find the NCR linked to this rework WO
  const ncr = await prisma.nCR.findFirst({
    where: { reworkWorkOrderId: workOrderId },
  });

  if (!ncr) {
    return { success: false, passedQty: 0, failedQty: 0, errors: ["No NCR linked to this rework WO"] };
  }

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
  });

  if (!workOrder) {
    return { success: false, passedQty: 0, failedQty: 0, errors: ["Work order not found"] };
  }

  const failedQty = ncr.quantityAffected - completedQty;

  await prisma.$transaction(async (tx) => {
    // Update WO as completed
    await tx.workOrder.update({
      where: { id: workOrderId },
      data: {
        status: "completed",
        completedQty,
        actualEnd: new Date(),
      },
    });

    // Move NCR to pending_verification
    await tx.nCR.update({
      where: { id: ncr.id },
      data: {
        status: "pending_verification",
      },
    });

    // Add history
    await tx.nCRHistory.create({
      data: {
        ncrId: ncr.id,
        action: "STATUS_CHANGE",
        fromStatus: "in_rework",
        toStatus: "pending_verification",
        comment: `Rework completed: ${completedQty}/${ncr.quantityAffected} passed. ${notes || ""}`.trim(),
        userId,
      },
    });

    // If some units failed rework, create a scrap transaction
    if (failedQty > 0 && ncr.lotNumber) {
      await tx.lotTransaction.create({
        data: {
          lotNumber: ncr.lotNumber,
          transactionType: "SCRAPPED",
          partId: ncr.partId || "",
          quantity: failedQty,
          previousQty: ncr.quantityAffected,
          newQty: completedQty,
          workOrderId,
          userId,
          notes: `Rework scrap: ${failedQty} units failed rework from NCR ${ncr.ncrNumber}`,
        },
      });
    }
  });

  return {
    success: true,
    ncrId: ncr.id,
    passedQty: completedQty,
    failedQty: Math.max(0, failedQty),
    errors,
  };
}

/**
 * Get all NCRs with REWORK disposition that don't yet have a rework WO.
 */
export async function getPendingReworkNCRs(): Promise<
  Array<{
    ncrId: string;
    ncrNumber: string;
    partNumber: string | null;
    productName: string | null;
    quantityAffected: number;
    originalWONumber: string | null;
    priority: string;
  }>
> {
  const ncrs = await prisma.nCR.findMany({
    where: {
      disposition: "REWORK",
      reworkWorkOrderId: null,
      status: { in: ["disposition_approved", "pending_disposition"] },
    },
    include: {
      part: { select: { partNumber: true } },
      workOrder: { select: { woNumber: true, product: { select: { name: true } } } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  return ncrs.map((ncr) => ({
    ncrId: ncr.id,
    ncrNumber: ncr.ncrNumber,
    partNumber: ncr.part?.partNumber || null,
    productName: ncr.workOrder?.product?.name || null,
    quantityAffected: ncr.quantityAffected,
    originalWONumber: ncr.workOrder?.woNumber || null,
    priority: ncr.priority,
  }));
}
