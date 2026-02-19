/**
 * Production Receipt Management
 * Handle production output receiving, confirmation, and rejection.
 */

import prisma from "../prisma";
import { isFeatureEnabled, FEATURE_FLAGS } from "../features/feature-flags";

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
