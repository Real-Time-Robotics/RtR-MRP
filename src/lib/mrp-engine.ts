import prisma from "./prisma";

interface MrpParams {
  planningHorizonDays: number;
  includeConfirmed: boolean;
  includeDraft: boolean;
  includeSafetyStock: boolean;
}

interface PartRequirement {
  partId: string;
  partNumber: string;
  partName: string;
  requiredQty: number;
  currentStock: number;
  reservedQty: number;
  availableStock: number;
  incomingQty: number;
  netRequirement: number;
  safetyStock: number;
  reorderPoint: number;
  sourceOrders: Array<{
    orderId: string;
    orderNumber: string;
    quantity: number;
    dueDate: Date;
  }>;
}

interface MrpSuggestionData {
  partId: string;
  actionType: "PURCHASE" | "EXPEDITE" | "DEFER" | "CANCEL";
  priority: "HIGH" | "MEDIUM" | "LOW";
  suggestedQty?: number;
  suggestedDate?: Date;
  reason: string;
  sourceOrderId?: string;
  supplierId?: string;
  estimatedCost?: number;
  currentStock?: number;
  requiredQty?: number;
  shortageQty?: number;
}

import { MrpEngine } from "./mrp/mrp-core";

export async function runMrpCalculation(params: MrpParams) {
  // 1. Create MRP Run record
  const runNumber = `MRP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const mrpRun = await prisma.mrpRun.create({
    data: {
      runNumber,
      planningHorizon: params.planningHorizonDays,
      status: "running",
      parameters: JSON.parse(JSON.stringify(params)),
    },
  });

  try {
    // 2. Instantiate and run the New Recursive Engine
    // We pass the runId and params. The engine handles the heavy lifting.
    const engine = new MrpEngine(mrpRun.id, {
      runId: mrpRun.id,
      ...params
    });

    const result = await engine.execute();

    if (!result.success) {
      throw new Error("MRP Engine Failure");
    }

    // 3. Update Status (Engine might update suggestion counts, but we update status here to be sure)
    const updatedRun = await prisma.mrpRun.update({
      where: { id: mrpRun.id },
      data: {
        status: "completed",
        completedAt: new Date(),
      }
    });

    return updatedRun;

  } catch (error) {
    console.error("MRP Calculation Failed", error);
    await prisma.mrpRun.update({
      where: { id: mrpRun.id },
      data: { status: "failed" },
    });
    throw error;
  }
}

// Approve suggestion and optionally create PO
export async function approveSuggestion(
  suggestionId: string,
  userId: string,
  createPO: boolean = false
) {
  const suggestion = await prisma.mrpSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: "approved",
      approvedBy: userId,
      approvedAt: new Date(),
    },
    include: { part: { include: { costs: true } }, supplier: true },
  });

  if (
    createPO &&
    suggestion.actionType === "PURCHASE" &&
    suggestion.supplierId
  ) {
    const poNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: suggestion.supplierId,
        orderDate: new Date(),
        expectedDate: suggestion.suggestedDate || new Date(),
        status: "draft",
        totalAmount: suggestion.estimatedCost,
        notes: `Auto-generated from MRP suggestion`,
        lines: {
          create: {
            lineNumber: 1,
            partId: suggestion.partId,
            quantity: suggestion.suggestedQty || 0,
            // @ts-ignore
            unitPrice: suggestion.part.costs?.[0]?.unitCost || 0,
            // @ts-ignore
            lineTotal: (suggestion.suggestedQty || 0) * (suggestion.part.costs?.[0]?.unitCost || 0),
          },
        },
      },
    });

    await prisma.mrpSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: "converted",
        convertedPoId: po.id,
      },
    });

    return { suggestion, po };
  }

  return { suggestion };
}

// Reject suggestion
export async function rejectSuggestion(suggestionId: string, userId: string) {
  return prisma.mrpSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: "rejected",
      approvedBy: userId,
      approvedAt: new Date(),
    },
  });
}

// Create Work Order from Sales Order
export async function createWorkOrder(
  productId: string,
  quantity: number,
  salesOrderId?: string,
  salesOrderLine?: number,
  plannedStart?: Date,
  priority: string = "normal"
) {
  const woNumber = `WO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

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

  return workOrder;
}

// Allocate materials to work order
export async function allocateMaterials(workOrderId: string) {
  const allocations = await prisma.materialAllocation.findMany({
    where: { workOrderId, status: "pending" },
  });

  for (const alloc of allocations) {
    const inventory = await prisma.inventory.findFirst({
      where: {
        partId: alloc.partId,
        quantity: { gt: 0 },
      },
      orderBy: { quantity: "desc" },
    });

    if (inventory) {
      const availableQty = inventory.quantity - inventory.reservedQty;
      const allocateQty = Math.min(availableQty, alloc.requiredQty);

      if (allocateQty > 0) {
        await prisma.inventory.update({
          where: { id: inventory.id },
          data: { reservedQty: { increment: allocateQty } },
        });

        await prisma.materialAllocation.update({
          where: { id: alloc.id },
          data: {
            allocatedQty: allocateQty,
            warehouseId: inventory.warehouseId,
            lotNumber: inventory.lotNumber,
            status: allocateQty >= alloc.requiredQty ? "allocated" : "pending",
          },
        });
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

// Update work order status
export async function updateWorkOrderStatus(
  workOrderId: string,
  status: string,
  completedQty?: number
) {
  const updateData: {
    status: string;
    completedQty?: number;
    actualStart?: Date;
    actualEnd?: Date;
  } = { status };

  if (status === "in_progress") {
    updateData.actualStart = new Date();
  }

  if (status === "completed") {
    updateData.actualEnd = new Date();
    if (completedQty !== undefined) {
      updateData.completedQty = completedQty;
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
