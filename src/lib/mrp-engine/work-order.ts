/**
 * Work Order Management
 * Create work orders and update their status.
 */

import prisma from "../prisma";
import { logger } from "@/lib/logger";
import { triggerWorkOrderWorkflow } from "../workflow/workflow-triggers";
import { generateSerial, SerialNumberingRuleNotFoundError } from "@/lib/serial/numbering";

// Create Work Order from Sales Order
export async function createWorkOrder(
  productId: string,
  quantity: number,
  salesOrderId?: string,
  salesOrderLine?: number,
  plannedStart?: Date,
  priority: string = "normal",
  userId?: string,
  woType: "DISCRETE" | "BATCH" = "DISCRETE",
  batchSize?: number
) {
  const woNumber = `WO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  // For BATCH work orders, auto-generate an output lot number
  const outputLotNumber = woType === "BATCH"
    ? `LOT-${woNumber}`
    : undefined;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      bomHeaders: {
        where: { status: "active" },
        include: { bomLines: true },
      },
    },
  });

  const bom = product?.bomHeaders[0];
  const assemblyHours = product?.assemblyHours || 16;
  const testingHours = product?.testingHours || 4;
  const totalHours = (assemblyHours + testingHours) * quantity;

  const start = plannedStart || new Date();
  const end = new Date(start);
  end.setHours(end.getHours() + totalHours);

  const workOrder = await prisma.workOrder.create({
    data: {
      woNumber,
      productId,
      quantity,
      salesOrderId,
      salesOrderLine,
      priority,
      status: "draft",
      woType,
      batchSize: woType === "BATCH" ? (batchSize ?? quantity) : undefined,
      outputLotNumber,
      plannedStart: start,
      plannedEnd: end,
      allocations: bom
        ? {
          create: bom.bomLines.map((line) => ({
            partId: line.partId,
            requiredQty: Math.ceil(
              line.quantity * quantity * (1 + line.scrapRate)
            ),
          })),
        }
        : undefined,
    },
    include: {
      allocations: true,
      product: true,
    },
  });

  // Trigger approval workflow (non-blocking)
  if (userId) {
    try {
      await triggerWorkOrderWorkflow(workOrder.id, userId, {
        productId,
        productName: product?.name,
        quantity,
        priority,
        plannedStart: start.toISOString(),
      });
    } catch (err) {
      logger.logError(err instanceof Error ? err : new Error(String(err)), { context: 'mrp-engine', operation: 'woWorkflowTrigger' });
    }
  }

  return workOrder;
}

// Update work order status
export async function updateWorkOrderStatus(
  workOrderId: string,
  status: string,
  completedQty?: number,
  scrapQty?: number
) {
  const normalizedStatus = status.toUpperCase();
  const updateData: {
    status: string;
    completedQty?: number;
    scrapQty?: number;
    actualStart?: Date;
    actualEnd?: Date;
  } = { status: normalizedStatus };

  if (normalizedStatus === "IN_PROGRESS") {
    updateData.actualStart = new Date();
  }

  if (normalizedStatus === "COMPLETED") {
    updateData.actualEnd = new Date();
    if (completedQty !== undefined) {
      updateData.completedQty = completedQty;
    }
    if (scrapQty !== undefined) {
      updateData.scrapQty = scrapQty;
    }
  }

  const workOrder = await prisma.workOrder.update({
    where: { id: workOrderId },
    data: updateData,
    include: {
      product: true,
      allocations: { include: { part: true } },
      productionReceipt: true,
    },
  });

  // Sprint 27 TIP-S27-03: Auto-generate serial units on WO completion
  if (normalizedStatus === "COMPLETED") {
    try {
      await generateSerialsForCompletedWO(workOrder, completedQty);
    } catch (err) {
      logger.warn("Serial generation skipped on WO complete", {
        workOrderId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return workOrder;
}

// =============================================================================
// SERIAL GENERATION ON WO COMPLETE (TIP-S27-03)
// =============================================================================

async function generateSerialsForCompletedWO(
  workOrder: { id: string; productId: string; completedQty: number; productionReceipt: { id: string } | null },
  completedQtyOverride?: number
): Promise<void> {
  // Find ModuleDesign linked to this product
  const moduleDesign = await prisma.moduleDesign.findFirst({
    where: { productId: workOrder.productId },
  });

  if (!moduleDesign) {
    // No module design → not serial-controlled, skip silently
    return;
  }

  const qty = completedQtyOverride ?? workOrder.completedQty;
  if (qty <= 0) return;

  try {
    for (let i = 0; i < qty; i++) {
      const serial = await generateSerial({ moduleDesignId: moduleDesign.id });
      await prisma.serialUnit.create({
        data: {
          serial,
          productId: workOrder.productId,
          moduleDesignId: moduleDesign.id,
          status: 'IN_STOCK',
          source: 'MANUFACTURED',
          productionReceiptId: workOrder.productionReceipt?.id || null,
        },
      });
    }
    logger.info("Serial units generated on WO complete", {
      workOrderId: workOrder.id,
      count: qty,
      moduleDesignId: moduleDesign.id,
    });
  } catch (err) {
    if (err instanceof SerialNumberingRuleNotFoundError) {
      // No numbering rule → log warning, don't block WO completion
      logger.warn("Serial numbering rule not found, skipping serial generation", {
        workOrderId: workOrder.id,
        moduleDesignId: moduleDesign.id,
      });
      // Flag on production receipt if available
      if (workOrder.productionReceipt) {
        await prisma.productionReceipt.update({
          where: { id: workOrder.productionReceipt.id },
          data: {
            notes: `[AUTO] Serial generation skipped: no numbering rule for module ${moduleDesign.code}`,
          },
        }).catch(() => { /* best-effort */ });
      }
      return;
    }
    throw err;
  }
}
