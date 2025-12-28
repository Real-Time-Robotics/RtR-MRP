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

export async function runMrpCalculation(params: MrpParams) {
  const {
    planningHorizonDays,
    includeConfirmed,
    includeDraft,
    includeSafetyStock,
  } = params;

  // 1. Create MRP Run record
  const runNumber = `MRP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const mrpRun = await prisma.mrpRun.create({
    data: {
      runNumber,
      planningHorizon: planningHorizonDays,
      status: "running",
      parameters: JSON.parse(JSON.stringify(params)),
    },
  });

  try {
    // 2. Get demand from Sales Orders
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + planningHorizonDays);

    const statusFilter: string[] = [];
    if (includeConfirmed) statusFilter.push("confirmed", "in_production");
    if (includeDraft) statusFilter.push("draft");

    const salesOrders = await prisma.salesOrder.findMany({
      where: {
        status: { in: statusFilter },
        requiredDate: { lte: cutoffDate },
      },
      include: {
        lines: {
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
      },
    });

    // 3. Explode BOMs to get part requirements
    const partRequirements = new Map<string, PartRequirement>();

    for (const order of salesOrders) {
      for (const line of order.lines) {
        const bom = line.product.bomHeaders[0];
        if (!bom) continue;

        for (const bomLine of bom.bomLines) {
          const requiredQty = Math.ceil(
            bomLine.quantity * line.quantity * (1 + bomLine.scrapRate)
          );

          const existing = partRequirements.get(bomLine.partId);
          if (existing) {
            existing.requiredQty += requiredQty;
            existing.sourceOrders.push({
              orderId: order.id,
              orderNumber: order.orderNumber,
              quantity: requiredQty,
              dueDate: order.requiredDate,
            });
          } else {
            partRequirements.set(bomLine.partId, {
              partId: bomLine.partId,
              partNumber: "",
              partName: "",
              requiredQty,
              currentStock: 0,
              reservedQty: 0,
              availableStock: 0,
              incomingQty: 0,
              netRequirement: 0,
              safetyStock: 0,
              reorderPoint: 0,
              sourceOrders: [
                {
                  orderId: order.id,
                  orderNumber: order.orderNumber,
                  quantity: requiredQty,
                  dueDate: order.requiredDate,
                },
              ],
            });
          }
        }
      }
    }

    // 4. Get current inventory and part info
    const partIds = Array.from(partRequirements.keys());

    if (partIds.length === 0) {
      // No requirements found
      await prisma.mrpRun.update({
        where: { id: mrpRun.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          totalParts: 0,
          purchaseSuggestions: 0,
          expediteAlerts: 0,
          shortageWarnings: 0,
        },
      });
      return mrpRun;
    }

    const parts = await prisma.part.findMany({
      where: { id: { in: partIds } },
    });

    const inventory = await prisma.inventory.groupBy({
      by: ["partId"],
      where: { partId: { in: partIds } },
      _sum: { quantity: true, reservedQty: true },
    });

    // 5. Get incoming from open POs
    const openPOLines = await prisma.purchaseOrderLine.findMany({
      where: {
        partId: { in: partIds },
        po: { status: { in: ["sent", "confirmed", "partial"] } },
      },
      include: { po: true },
    });

    const incomingByPart = new Map<string, number>();
    for (const poLine of openPOLines) {
      const incoming = poLine.quantity - poLine.receivedQty;
      const current = incomingByPart.get(poLine.partId) || 0;
      incomingByPart.set(poLine.partId, current + incoming);
    }

    // 6. Calculate net requirements
    for (const [partId, req] of Array.from(partRequirements.entries())) {
      const part = parts.find((p) => p.id === partId);
      const inv = inventory.find((i) => i.partId === partId);

      req.partNumber = part?.partNumber || "";
      req.partName = part?.name || "";
      req.currentStock = inv?._sum.quantity || 0;
      req.reservedQty = inv?._sum.reservedQty || 0;
      req.availableStock = req.currentStock - req.reservedQty;
      req.incomingQty = incomingByPart.get(partId) || 0;
      req.safetyStock = includeSafetyStock ? (part?.safetyStock || 0) : 0;
      req.reorderPoint = part?.reorderPoint || 0;

      // Net Requirement = Required - Available - Incoming + Safety Stock
      req.netRequirement = Math.max(
        0,
        req.requiredQty - req.availableStock - req.incomingQty + req.safetyStock
      );
    }

    // 7. Generate suggestions
    const suggestions: MrpSuggestionData[] = [];

    for (const [partId, req] of Array.from(partRequirements.entries())) {
      const part = parts.find((p) => p.id === partId);

      if (req.netRequirement > 0) {
        // Need to purchase
        const preferredSupplier = await prisma.partSupplier.findFirst({
          where: { partId, isPreferred: true },
          include: { supplier: true },
        });

        const earliestOrder = req.sourceOrders.sort(
          (a: { dueDate: Date }, b: { dueDate: Date }) => a.dueDate.getTime() - b.dueDate.getTime()
        )[0];

        const leadTime = preferredSupplier?.leadTimeDays || 14;
        const orderDate = new Date(earliestOrder.dueDate);
        orderDate.setDate(orderDate.getDate() - leadTime - 7);

        suggestions.push({
          partId,
          actionType: "PURCHASE",
          priority: req.netRequirement > req.safetyStock * 2 ? "HIGH" : "MEDIUM",
          suggestedQty: req.netRequirement,
          suggestedDate: orderDate < new Date() ? new Date() : orderDate,
          reason: `Shortage of ${req.netRequirement} units for ${earliestOrder.orderNumber}`,
          sourceOrderId: earliestOrder.orderId,
          supplierId: preferredSupplier?.supplierId,
          estimatedCost: req.netRequirement * (part?.unitCost || 0),
          currentStock: req.availableStock,
          requiredQty: req.requiredQty,
          shortageQty: req.netRequirement,
        });
      } else if (
        req.availableStock < req.reorderPoint &&
        req.netRequirement === 0
      ) {
        const hasOpenPO = (incomingByPart.get(partId) || 0) > 0;
        if (hasOpenPO) {
          suggestions.push({
            partId,
            actionType: "EXPEDITE",
            priority: "MEDIUM",
            reason: `Stock below reorder point. Open PO exists - consider expediting.`,
            currentStock: req.availableStock,
            requiredQty: req.requiredQty,
          });
        }
      } else if (req.availableStock > req.requiredQty * 2) {
        suggestions.push({
          partId,
          actionType: "DEFER",
          priority: "LOW",
          reason: `Excess stock (${req.availableStock} available, only ${req.requiredQty} needed). Defer next order.`,
          currentStock: req.availableStock,
          requiredQty: req.requiredQty,
        });
      }
    }

    // 8. Save suggestions
    if (suggestions.length > 0) {
      await prisma.mrpSuggestion.createMany({
        data: suggestions.map((s) => ({
          mrpRunId: mrpRun.id,
          partId: s.partId,
          actionType: s.actionType,
          priority: s.priority,
          suggestedQty: s.suggestedQty,
          suggestedDate: s.suggestedDate,
          reason: s.reason,
          sourceOrderId: s.sourceOrderId,
          supplierId: s.supplierId,
          estimatedCost: s.estimatedCost,
          currentStock: s.currentStock,
          requiredQty: s.requiredQty,
          shortageQty: s.shortageQty,
          status: "pending",
        })),
      });
    }

    // 9. Update MRP Run status
    await prisma.mrpRun.update({
      where: { id: mrpRun.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        totalParts: partRequirements.size,
        purchaseSuggestions: suggestions.filter((s) => s.actionType === "PURCHASE")
          .length,
        expediteAlerts: suggestions.filter((s) => s.actionType === "EXPEDITE")
          .length,
        shortageWarnings: suggestions.filter((s) => s.priority === "HIGH").length,
      },
    });

    return mrpRun;
  } catch (error) {
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
    include: { part: true, supplier: true },
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
            unitPrice: suggestion.part.unitCost,
            lineTotal: (suggestion.suggestedQty || 0) * suggestion.part.unitCost,
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
