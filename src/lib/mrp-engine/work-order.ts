/**
 * Work Order Management
 * Create work orders and update their status.
 */

import prisma from "../prisma";
import { logger } from "@/lib/logger";
import { triggerWorkOrderWorkflow } from "../workflow/workflow-triggers";

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

  return prisma.workOrder.update({
    where: { id: workOrderId },
    data: updateData,
    include: {
      product: true,
      allocations: { include: { part: true } },
    },
  });
}
