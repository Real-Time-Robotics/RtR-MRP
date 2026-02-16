import prisma from "./prisma";
import { isFeatureEnabled, FEATURE_FLAGS } from "./features/feature-flags";
import { allocateByStrategy, getSortedInventory } from "./inventory/picking-engine";
import { triggerWorkOrderWorkflow } from "./workflow/workflow-triggers";
import { recordMaterialCost } from "./finance/wo-cost-service";

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
      console.error('[MRP] WO workflow trigger error:', err);
    }
  }

  return workOrder;
}

// Regenerate material allocations from active BOM for an existing work order
export async function regenerateAllocations(workOrderId: string) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      product: {
        include: {
          bomHeaders: {
            where: { status: "active" },
            include: { bomLines: true },
          },
        },
      },
      allocations: true,
    },
  });

  if (!workOrder) throw new Error("Work order not found");

  const bom = workOrder.product.bomHeaders[0];
  if (!bom) {
    return { allocations: workOrder.allocations, regenerated: false, reason: "No active BOM found" };
  }

  // Delete existing pending allocations (keep allocated/issued ones)
  if (workOrder.allocations.length > 0) {
    await prisma.materialAllocation.deleteMany({
      where: { workOrderId, status: "pending" },
    });
  }

  // Create new allocations from BOM
  const newAllocations = [];
  for (const line of bom.bomLines) {
    const requiredQty = Math.ceil(line.quantity * workOrder.quantity * (1 + line.scrapRate));

    // Check if this part already has a non-pending allocation
    const existing = workOrder.allocations.find(
      (a) => a.partId === line.partId && a.status !== "pending"
    );
    if (existing) continue;

    newAllocations.push({
      workOrderId,
      partId: line.partId,
      requiredQty,
    });
  }

  if (newAllocations.length > 0) {
    await prisma.materialAllocation.createMany({
      data: newAllocations,
      skipDuplicates: true,
    });
  }

  const updated = await prisma.materialAllocation.findMany({
    where: { workOrderId },
    include: { part: true },
  });

  return { allocations: updated, regenerated: true };
}

// Allocate materials to work order
export async function allocateMaterials(workOrderId: string) {
  const allocations = await prisma.materialAllocation.findMany({
    where: { workOrderId, status: "pending" },
  });

  for (const alloc of allocations) {
    // Use picking engine for strategy-aware allocation (FIFO/FEFO/ANY)
    // Find any warehouse that has this part
    const inventoryRecord = await prisma.inventory.findFirst({
      where: { partId: alloc.partId, quantity: { gt: 0 } },
      select: { warehouseId: true },
    });

    if (inventoryRecord) {
      const pickResult = await allocateByStrategy({
        partId: alloc.partId,
        warehouseId: inventoryRecord.warehouseId,
        requiredQty: alloc.requiredQty,
      });

      if (pickResult.allocations.length > 0) {
        // Use the first allocation (primary lot)
        const pick = pickResult.allocations[0];
        const allocateQty = Math.min(pick.quantity, alloc.requiredQty);

        if (allocateQty > 0) {
          await prisma.inventory.update({
            where: { id: pick.inventoryId },
            data: { reservedQty: { increment: allocateQty } },
          });

          await prisma.materialAllocation.update({
            where: { id: alloc.id },
            data: {
              allocatedQty: allocateQty,
              warehouseId: inventoryRecord.warehouseId,
              lotNumber: pick.lotNumber,
              status: allocateQty >= alloc.requiredQty ? "allocated" : "pending",
            },
          });
        }
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
      console.error('[MRP] Failed to record material cost:', err);
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

// Receive production output — creates a PENDING ProductionReceipt for warehouse approval
export async function receiveProductionOutput(workOrderId: string, userId: string) {
  // 1. Load WO + Product, validate status
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: { product: true },
  });

  if (!workOrder) {
    throw new Error("Work order not found");
  }

  const status = workOrder.status.toUpperCase();
  if (!["COMPLETED", "CLOSED"].includes(status)) {
    throw new Error(`Work order phải ở trạng thái COMPLETED hoặc CLOSED (hiện tại: ${workOrder.status})`);
  }

  if (workOrder.completedQty <= 0) {
    throw new Error("Số lượng hoàn thành phải lớn hơn 0");
  }

  // 2. Check for existing ProductionReceipt
  const existingReceipt = await prisma.productionReceipt.findUnique({
    where: { workOrderId },
  });

  if (existingReceipt) {
    if (existingReceipt.status === "PENDING") {
      return {
        status: "PENDING",
        receipt: existingReceipt,
        message: `Phiếu nhập kho đang chờ xác nhận (${existingReceipt.quantity} units)`,
      };
    }
    if (existingReceipt.status === "CONFIRMED") {
      return {
        status: "CONFIRMED",
        receipt: existingReceipt,
        message: `Đã nhập kho trước đó (${existingReceipt.quantity} units, lot: ${existingReceipt.lotNumber})`,
      };
    }
    // REJECTED → delete old receipt so user can resend
    await prisma.productionReceipt.delete({ where: { id: existingReceipt.id } });
  }

  // 2b. Backward-compat: check if WO was already received via old flow (LotTransaction PRODUCED)
  const legacyTransaction = await prisma.lotTransaction.findFirst({
    where: { transactionType: "PRODUCED", workOrderId },
  });
  if (legacyTransaction) {
    return {
      status: "CONFIRMED",
      receipt: null,
      message: `Đã nhập kho trước đó (${legacyTransaction.quantity} units, lot: ${legacyTransaction.lotNumber})`,
    };
  }

  // 3. Find or auto-create Part (FINISHED_GOOD) for the product
  const product = workOrder.product;
  let part = await prisma.part.findFirst({
    where: { partNumber: product.sku },
  });

  if (!part) {
    part = await prisma.part.create({
      data: {
        partNumber: product.sku,
        name: product.name,
        category: "FINISHED_GOOD",
        description: `Thành phẩm: ${product.name}`,
        makeOrBuy: "MAKE",
        status: "active",
      },
    });
  }

  // 4. Determine target warehouse for finished goods
  // When USE_FG_WAREHOUSE is ON → target FINISHED_GOODS warehouse
  // When OFF → target MAIN warehouse (old behavior)
  const useFg = await isFeatureEnabled(FEATURE_FLAGS.USE_FG_WAREHOUSE);
  let warehouse = null;

  if (useFg) {
    warehouse = await prisma.warehouse.findFirst({
      where: { type: "FINISHED_GOODS", status: "active" },
    });
  }

  if (!warehouse) {
    warehouse = await prisma.warehouse.findFirst({
      where: { type: "MAIN", status: "active" },
    });
  }

  if (!warehouse) {
    warehouse = await prisma.warehouse.findFirst({
      where: { isDefault: true, status: "active" },
    });
  }

  if (!warehouse) {
    warehouse = await prisma.warehouse.findFirst({
      where: { status: "active" },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!warehouse) {
    throw new Error("Không tìm thấy kho nào trong hệ thống");
  }

  // 5. Create ProductionReceipt with PENDING status
  const lotNumber = `LOT-WO-${workOrder.woNumber}`;
  const quantity = workOrder.completedQty;
  const receiptNumber = `PR-${workOrder.woNumber}`;

  const receipt = await prisma.productionReceipt.create({
    data: {
      receiptNumber,
      workOrderId,
      productId: product.id,
      partId: part.id,
      quantity,
      lotNumber,
      warehouseId: warehouse.id,
      status: "PENDING",
      requestedBy: userId,
    },
  });

  return {
    status: "PENDING",
    receipt,
    message: `Đã tạo phiếu nhập kho, chờ kho xác nhận (${quantity} ${product.name})`,
  };
}

// Confirm production receipt — warehouse approves and inventory is updated
export async function confirmProductionReceipt(receiptId: string, userId: string) {
  const receipt = await prisma.productionReceipt.findUnique({
    where: { id: receiptId },
    include: { workOrder: true, product: true, warehouse: true },
  });

  if (!receipt) {
    throw new Error("Phiếu nhập kho không tồn tại");
  }

  if (receipt.status !== "PENDING") {
    throw new Error(`Phiếu đã được xử lý (trạng thái: ${receipt.status})`);
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update receipt → CONFIRMED
    const updatedReceipt = await tx.productionReceipt.update({
      where: { id: receiptId },
      data: {
        status: "CONFIRMED",
        confirmedBy: userId,
        confirmedAt: new Date(),
      },
    });

    // 2. Determine target warehouse for finished goods
    // When USE_FG_WAREHOUSE is ON → route to FINISHED_GOODS warehouse
    // When OFF → use receipt's original warehouse (MAIN, old behavior)
    const useFg = await isFeatureEnabled(FEATURE_FLAGS.USE_FG_WAREHOUSE);
    let targetWarehouseId = receipt.warehouseId;

    if (useFg) {
      const fgWarehouse = await tx.warehouse.findFirst({
        where: { type: "FINISHED_GOODS", status: "active" },
      });
      if (fgWarehouse) {
        targetWarehouseId = fgWarehouse.id;
      }
    }

    // 3. Upsert Inventory in target warehouse
    const existingInventory = receipt.partId ? await tx.inventory.findUnique({
      where: {
        partId_warehouseId_lotNumber: {
          partId: receipt.partId,
          warehouseId: targetWarehouseId,
          lotNumber: receipt.lotNumber,
        },
      },
    }) : null;

    let inventory;
    if (existingInventory) {
      inventory = await tx.inventory.update({
        where: { id: existingInventory.id },
        data: { quantity: { increment: receipt.quantity } },
      });
    } else if (receipt.partId) {
      inventory = await tx.inventory.create({
        data: {
          partId: receipt.partId,
          warehouseId: targetWarehouseId,
          lotNumber: receipt.lotNumber,
          quantity: receipt.quantity,
        },
      });
    }

    // 4. Collect parent lots from issued materials (for backward traceability)
    const issuedAllocations = await tx.materialAllocation.findMany({
      where: { workOrderId: receipt.workOrderId, status: "issued" },
      select: { partId: true, lotNumber: true, issuedQty: true },
    });
    const parentLots = issuedAllocations
      .filter((a) => a.lotNumber)
      .map((a) => ({
        lotNumber: a.lotNumber!,
        partId: a.partId,
        quantity: a.issuedQty,
      }));

    // 5. Create LotTransaction PRODUCED with parentLots for traceability
    if (receipt.partId) {
      await tx.lotTransaction.create({
        data: {
          lotNumber: receipt.lotNumber,
          transactionType: "PRODUCED",
          partId: receipt.partId,
          productId: receipt.productId,
          quantity: receipt.quantity,
          previousQty: existingInventory?.quantity ?? 0,
          newQty: (existingInventory?.quantity ?? 0) + receipt.quantity,
          toWarehouseId: targetWarehouseId,
          workOrderId: receipt.workOrderId,
          userId,
          parentLots: parentLots.length > 0 ? parentLots : undefined,
          notes: useFg
            ? `Production output to FG from WO ${receipt.workOrder.woNumber} - ${receipt.product.name} (${receipt.receiptNumber})`
            : `Nhập kho thành phẩm từ WO ${receipt.workOrder.woNumber} - ${receipt.product.name} (phiếu ${receipt.receiptNumber})`,
        },
      });
    }

    // 6. Consume WIP inventory (only if USE_WIP_WAREHOUSE flag is ON)
    const useWip = await isFeatureEnabled(FEATURE_FLAGS.USE_WIP_WAREHOUSE);
    if (useWip) {
      const wipWarehouse = await tx.warehouse.findFirst({
        where: { type: "WIP", status: "active" },
      });
      if (wipWarehouse) {
        const wipInventory = await tx.inventory.findMany({
          where: {
            warehouseId: wipWarehouse.id,
            quantity: { gt: 0 },
          },
        });

        // Filter to items linked to this WO's allocations
        const woAllocations = await tx.materialAllocation.findMany({
          where: { workOrderId: receipt.workOrderId, status: "issued" },
        });
        const allocPartIds = new Set(woAllocations.map((a) => a.partId));

        for (const inv of wipInventory) {
          if (!allocPartIds.has(inv.partId)) continue;

          // Log consumption transaction
          if (inv.lotNumber) {
            await tx.lotTransaction.create({
              data: {
                lotNumber: inv.lotNumber,
                transactionType: "CONSUMED",
                partId: inv.partId,
                quantity: inv.quantity,
                previousQty: inv.quantity,
                newQty: 0,
                workOrderId: receipt.workOrderId,
                fromWarehouseId: wipWarehouse.id,
                notes: `Consumed in production for WO ${receipt.workOrder.woNumber}`,
                userId,
              },
            });
          }

          // Zero out WIP inventory
          await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: 0 },
          });
        }
      }
    }

    return { receipt: updatedReceipt, inventory };
  });

  return {
    ...result,
    message: `Đã xác nhận nhập kho ${receipt.quantity} ${receipt.product.name} vào ${receipt.warehouse.name}`,
  };
}

// Reject production receipt — warehouse rejects with reason
export async function rejectProductionReceipt(receiptId: string, userId: string, reason: string) {
  const receipt = await prisma.productionReceipt.findUnique({
    where: { id: receiptId },
    include: { product: true },
  });

  if (!receipt) {
    throw new Error("Phiếu nhập kho không tồn tại");
  }

  if (receipt.status !== "PENDING") {
    throw new Error(`Phiếu đã được xử lý (trạng thái: ${receipt.status})`);
  }

  const updatedReceipt = await prisma.productionReceipt.update({
    where: { id: receiptId },
    data: {
      status: "REJECTED",
      rejectedBy: userId,
      rejectedAt: new Date(),
      rejectedReason: reason,
    },
  });

  return {
    receipt: updatedReceipt,
    message: `Đã từ chối phiếu nhập kho ${receipt.receiptNumber} (${receipt.product.name})`,
  };
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

// ============ SHIPPING / DELIVERY (Xuất kho & Giao hàng) ============

// Create shipment from Sales Order
export async function createShipment(
  salesOrderId: string,
  userId: string,
  linesToShip?: Array<{ lineNumber: number; quantity: number }>
) {
  const salesOrder = await prisma.salesOrder.findUnique({
    where: { id: salesOrderId },
    include: {
      lines: { include: { product: true }, orderBy: { lineNumber: "asc" } },
      customer: true,
      shipments: true,
    },
  });

  if (!salesOrder) {
    throw new Error("Đơn hàng không tồn tại");
  }

  if (!["completed", "in_progress", "partially_shipped"].includes(salesOrder.status)) {
    throw new Error(
      `Đơn hàng phải ở trạng thái completed, in_progress hoặc partially_shipped (hiện tại: ${salesOrder.status})`
    );
  }

  // Determine which lines to ship
  let shipLines: Array<{ lineNumber: number; productId: string; quantity: number }>;

  if (linesToShip && linesToShip.length > 0) {
    // Partial shipment: validate each line
    shipLines = linesToShip.map((lts) => {
      const orderLine = salesOrder.lines.find((l) => l.lineNumber === lts.lineNumber);
      if (!orderLine) {
        throw new Error(`Dòng ${lts.lineNumber} không tồn tại trong đơn hàng`);
      }
      const remaining = orderLine.quantity - orderLine.shippedQty;
      if (lts.quantity <= 0) {
        throw new Error(`Số lượng xuất cho dòng ${lts.lineNumber} phải > 0`);
      }
      if (lts.quantity > remaining) {
        throw new Error(
          `Dòng ${lts.lineNumber} (${orderLine.product.name}): yêu cầu xuất ${lts.quantity} nhưng chỉ còn ${remaining} chưa xuất`
        );
      }
      return {
        lineNumber: orderLine.lineNumber,
        productId: orderLine.productId,
        quantity: lts.quantity,
      };
    });
  } else {
    // Ship all remaining lines (backward compatible)
    shipLines = salesOrder.lines
      .filter((l) => l.shippedQty < l.quantity)
      .map((l) => ({
        lineNumber: l.lineNumber,
        productId: l.productId,
        quantity: l.quantity - l.shippedQty,
      }));

    if (shipLines.length === 0) {
      throw new Error("Tất cả các dòng đã được xuất kho đầy đủ");
    }
  }

  // Generate unique shipment number with sequence
  const existingCount = salesOrder.shipments.length;
  const sequence = String(existingCount + 1).padStart(3, "0");
  const shipmentNumber = `SHP-${salesOrder.orderNumber}-${sequence}`;

  const shipment = await prisma.shipment.create({
    data: {
      shipmentNumber,
      salesOrderId,
      customerId: salesOrder.customerId,
      status: "PREPARING",
      shippedBy: userId,
      lines: {
        create: shipLines.map((line) => ({
          lineNumber: line.lineNumber,
          productId: line.productId,
          quantity: line.quantity,
        })),
      },
    },
    include: { lines: { include: { product: true } } },
  });

  return {
    shipment,
    message: `Đã tạo phiếu xuất kho ${shipmentNumber}`,
    existing: false,
  };
}

// Pick items for shipment — move from FG/MAIN to SHIP staging area
// Only active when USE_SHIP_WAREHOUSE flag is ON
export async function pickForShipment(shipmentId: string, userId: string) {
  const useShip = await isFeatureEnabled(FEATURE_FLAGS.USE_SHIP_WAREHOUSE);
  if (!useShip) {
    return { success: true, pickedItems: 0, message: "Shipping staging disabled, skipping pick" };
  }

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      salesOrder: true,
      lines: { include: { product: true } },
    },
  });

  if (!shipment) {
    throw new Error("Phiếu xuất kho không tồn tại");
  }

  if (shipment.status !== "PREPARING") {
    throw new Error(`Shipment must be in PREPARING status to pick (current: ${shipment.status})`);
  }

  const shipWarehouse = await prisma.warehouse.findFirst({
    where: { type: "SHIPPING", status: "active" },
  });
  if (!shipWarehouse) {
    throw new Error("SHIPPING warehouse not found");
  }

  // Determine source warehouse: FG if enabled, else MAIN
  const useFg = await isFeatureEnabled(FEATURE_FLAGS.USE_FG_WAREHOUSE);
  let sourceWarehouse = null;
  if (useFg) {
    sourceWarehouse = await prisma.warehouse.findFirst({
      where: { type: "FINISHED_GOODS", status: "active" },
    });
  }
  if (!sourceWarehouse) {
    sourceWarehouse = await prisma.warehouse.findFirst({
      where: { type: "MAIN", status: "active" },
    });
  }
  if (!sourceWarehouse) {
    throw new Error("No source warehouse found for picking");
  }

  let pickedItems = 0;

  await prisma.$transaction(async (tx) => {
    for (const line of shipment.lines) {
      const part = await tx.part.findFirst({
        where: { partNumber: line.product.sku },
      });
      if (!part) {
        throw new Error(`Part not found for product ${line.product.name} (SKU: ${line.product.sku})`);
      }

      // Find inventory in source warehouse using picking strategy
      const sourceInventory = await getSortedInventory(
        part.id,
        sourceWarehouse!.id,
        part.pickingStrategy
      );

      const totalStock = sourceInventory.reduce((sum, inv) => sum + inv.quantity, 0);
      if (totalStock < line.quantity) {
        throw new Error(
          `Insufficient stock for ${line.product.name} in ${sourceWarehouse!.code}. Need: ${line.quantity}, have: ${totalStock}`
        );
      }

      // Deduct from source, add to SHIP
      let remaining = line.quantity;
      for (const inv of sourceInventory) {
        if (remaining <= 0) break;
        const pickQty = Math.min(remaining, inv.quantity);

        // Deduct from source
        await tx.inventory.update({
          where: { id: inv.id },
          data: { quantity: { decrement: pickQty } },
        });

        // Log transfer out
        await tx.lotTransaction.create({
          data: {
            lotNumber: inv.lotNumber || `PICK-${shipment.shipmentNumber}`,
            transactionType: "SHIPPED",
            partId: part.id,
            productId: line.productId,
            quantity: pickQty,
            previousQty: inv.quantity,
            newQty: inv.quantity - pickQty,
            fromWarehouseId: sourceWarehouse!.id,
            toWarehouseId: shipWarehouse.id,
            salesOrderId: shipment.salesOrderId,
            soLineNumber: line.lineNumber,
            userId,
            notes: `Picked for shipment ${shipment.shipmentNumber} - moved to SHIP staging`,
          },
        });

        // Upsert into SHIP warehouse
        const existingShipInv = await tx.inventory.findFirst({
          where: {
            partId: part.id,
            warehouseId: shipWarehouse.id,
            lotNumber: inv.lotNumber ?? null,
          },
        });

        if (existingShipInv) {
          await tx.inventory.update({
            where: { id: existingShipInv.id },
            data: { quantity: { increment: pickQty } },
          });
        } else {
          await tx.inventory.create({
            data: {
              partId: part.id,
              warehouseId: shipWarehouse.id,
              quantity: pickQty,
              lotNumber: inv.lotNumber,
            },
          });
        }

        remaining -= pickQty;
      }

      pickedItems++;
    }

    // Update shipment status to PICKED
    await tx.shipment.update({
      where: { id: shipmentId },
      data: { status: "PICKED" },
    });
  });

  return {
    success: true,
    pickedItems,
    message: `Picked ${pickedItems} items to shipping staging area`,
  };
}

// Confirm shipment — deduct inventory, mark as SHIPPED
export async function confirmShipment(
  shipmentId: string,
  userId: string,
  options?: {
    carrier?: string;
    trackingNumber?: string;
    lotAllocations?: Array<{
      lineNumber: number;
      allocations: Array<{ lotNumber: string; quantity: number }>;
    }>;
  }
) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      salesOrder: true,
      lines: { include: { product: true } },
      customer: true,
    },
  });

  if (!shipment) {
    throw new Error("Phiếu xuất kho không tồn tại");
  }

  // When USE_SHIP_WAREHOUSE is ON, shipment must be PICKED first
  // When OFF, shipment must be PREPARING (old behavior)
  const useShip = await isFeatureEnabled(FEATURE_FLAGS.USE_SHIP_WAREHOUSE);
  const expectedStatus = useShip ? "PICKED" : "PREPARING";

  if (shipment.status !== expectedStatus) {
    throw new Error(
      useShip
        ? `Shipment must be picked before confirming (current: ${shipment.status})`
        : `Phiếu xuất kho đã được xử lý (trạng thái: ${shipment.status})`
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Deduct inventory for each line
    for (const line of shipment.lines) {
      // Find Part by product SKU
      const part = await tx.part.findFirst({
        where: { partNumber: line.product.sku },
      });

      if (!part) {
        throw new Error(
          `Không tìm thấy Part cho sản phẩm ${line.product.name} (SKU: ${line.product.sku})`
        );
      }

      // Determine source warehouse based on feature flags
      // SHIP ON → deduct from SHIPPING (items already staged)
      // SHIP OFF, FG ON → deduct from FINISHED_GOODS
      // Both OFF → deduct from MAIN (old behavior)
      let warehouse = null;

      if (useShip) {
        warehouse = await tx.warehouse.findFirst({
          where: { type: "SHIPPING", status: "active" },
        });
      } else {
        const useFg = await isFeatureEnabled(FEATURE_FLAGS.USE_FG_WAREHOUSE);
        if (useFg) {
          warehouse = await tx.warehouse.findFirst({
            where: { type: "FINISHED_GOODS", status: "active" },
          });
        }
      }

      if (!warehouse) {
        warehouse = await tx.warehouse.findFirst({
          where: { type: "MAIN", status: "active" },
        });
      }
      if (!warehouse) {
        warehouse = await tx.warehouse.findFirst({
          where: { isDefault: true, status: "active" },
        });
      }

      if (!warehouse) {
        throw new Error("Không tìm thấy kho nào trong hệ thống");
      }

      // Check if user provided lot allocations for this line
      const userAllocation = options?.lotAllocations?.find(
        (la) => la.lineNumber === line.lineNumber
      );

      if (userAllocation && userAllocation.allocations.length > 0) {
        // --- User-specified lot allocations ---
        const totalAllocated = userAllocation.allocations.reduce(
          (sum, a) => sum + a.quantity, 0
        );
        if (totalAllocated !== line.quantity) {
          throw new Error(
            `Tổng số lượng phân bổ cho ${line.product.name} (${totalAllocated}) không khớp số lượng yêu cầu (${line.quantity})`
          );
        }

        for (const alloc of userAllocation.allocations) {
          if (alloc.quantity <= 0) continue;

          const inv = await tx.inventory.findFirst({
            where: {
              partId: part.id,
              warehouseId: warehouse.id,
              lotNumber: alloc.lotNumber,
            },
          });

          if (!inv) {
            throw new Error(
              `Không tìm thấy lot ${alloc.lotNumber} cho ${line.product.name} trong kho`
            );
          }

          if (inv.quantity < alloc.quantity) {
            throw new Error(
              `Lot ${alloc.lotNumber} không đủ tồn kho cho ${line.product.name}. Tồn: ${inv.quantity}, yêu cầu: ${alloc.quantity}`
            );
          }

          await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: { decrement: alloc.quantity } },
          });

          await tx.lotTransaction.create({
            data: {
              lotNumber: inv.lotNumber || `SHP-${shipment.shipmentNumber}`,
              transactionType: "SHIPPED",
              partId: part.id,
              productId: line.productId,
              quantity: alloc.quantity,
              previousQty: inv.quantity,
              newQty: inv.quantity - alloc.quantity,
              fromWarehouseId: warehouse.id,
              salesOrderId: shipment.salesOrderId,
              soLineNumber: line.lineNumber,
              userId,
              notes: `Xuất kho ${line.product.name} x${alloc.quantity} (lot ${alloc.lotNumber}) - Đơn hàng ${shipment.salesOrder.orderNumber}`,
            },
          });
        }
      } else {
        // --- Auto-allocate using picking strategy (FIFO/FEFO/ANY) ---
        const inventoryRecords = await getSortedInventory(
          part.id,
          warehouse.id,
          part.pickingStrategy
        );

        const totalStock = inventoryRecords.reduce((sum, inv) => sum + inv.quantity, 0);

        if (totalStock < line.quantity) {
          throw new Error(
            `Không đủ tồn kho cho ${line.product.name} (SKU: ${line.product.sku}). Cần: ${line.quantity}, tồn kho: ${totalStock}`
          );
        }

        let remaining = line.quantity;
        for (const inv of inventoryRecords) {
          if (remaining <= 0) break;
          const deductQty = Math.min(remaining, inv.quantity);

          await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: { decrement: deductQty } },
          });

          await tx.lotTransaction.create({
            data: {
              lotNumber: inv.lotNumber || `SHP-${shipment.shipmentNumber}`,
              transactionType: "SHIPPED",
              partId: part.id,
              productId: line.productId,
              quantity: deductQty,
              previousQty: inv.quantity,
              newQty: inv.quantity - deductQty,
              fromWarehouseId: warehouse.id,
              salesOrderId: shipment.salesOrderId,
              soLineNumber: line.lineNumber,
              userId,
              notes: `Xuất kho ${line.product.name} x${deductQty} - Đơn hàng ${shipment.salesOrder.orderNumber}`,
            },
          });

          remaining -= deductQty;
        }
      }
    }

    // 2. Update SalesOrderLine.shippedQty for each shipped line
    for (const line of shipment.lines) {
      await tx.salesOrderLine.updateMany({
        where: {
          orderId: shipment.salesOrderId,
          lineNumber: line.lineNumber,
        },
        data: {
          shippedQty: { increment: line.quantity },
        },
      });
    }

    // 3. Update Shipment → SHIPPED
    const updatedShipment = await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        status: "SHIPPED",
        carrier: options?.carrier || null,
        trackingNumber: options?.trackingNumber || null,
        shippedAt: new Date(),
        shippedBy: userId,
      },
    });

    // 4. Determine SalesOrder status based on shipped quantities
    const orderLines = await tx.salesOrderLine.findMany({
      where: { orderId: shipment.salesOrderId },
    });

    const allFullyShipped = orderLines.every((l) => l.shippedQty >= l.quantity);
    const someShipped = orderLines.some((l) => l.shippedQty > 0);

    let newOrderStatus: string;
    if (allFullyShipped) {
      newOrderStatus = "shipped";
    } else if (someShipped) {
      newOrderStatus = "partially_shipped";
    } else {
      newOrderStatus = shipment.salesOrder.status; // keep current
    }

    await tx.salesOrder.update({
      where: { id: shipment.salesOrderId },
      data: { status: newOrderStatus },
    });

    return updatedShipment;
  });

  return {
    shipment: result,
    message: `Đã xuất kho đơn hàng ${shipment.salesOrder.orderNumber}`,
  };
}

// Confirm delivery — mark as DELIVERED
export async function confirmDelivery(shipmentId: string, userId: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { salesOrder: true },
  });

  if (!shipment) {
    throw new Error("Phiếu xuất kho không tồn tại");
  }

  if (shipment.status !== "SHIPPED") {
    throw new Error(
      `Phiếu xuất kho phải ở trạng thái SHIPPED để xác nhận giao (hiện tại: ${shipment.status})`
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update Shipment → DELIVERED
    const updatedShipment = await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        deliveredBy: userId,
      },
    });

    // 2. Check if ALL shipments delivered AND all lines fully shipped
    const allShipments = await tx.shipment.findMany({
      where: { salesOrderId: shipment.salesOrderId },
    });
    const allDelivered = allShipments.every((s) => s.status === "DELIVERED");

    const orderLines = await tx.salesOrderLine.findMany({
      where: { orderId: shipment.salesOrderId },
    });
    const allFullyShipped = orderLines.every((l) => l.shippedQty >= l.quantity);

    if (allDelivered && allFullyShipped) {
      // All shipments delivered AND all lines fully shipped → delivered
      await tx.salesOrder.update({
        where: { id: shipment.salesOrderId },
        data: { status: "delivered" },
      });
    } else if (allFullyShipped) {
      // All lines shipped but some shipments not yet delivered → shipped
      await tx.salesOrder.update({
        where: { id: shipment.salesOrderId },
        data: { status: "shipped" },
      });
    }
    // Otherwise keep current status (partially_shipped, etc.)

    return updatedShipment;
  });

  return {
    shipment: result,
    message: `Đã xác nhận giao hàng đơn ${shipment.salesOrder.orderNumber}`,
  };
}
