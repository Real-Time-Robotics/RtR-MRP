/**
 * Shipment Creation & Picking
 * Create shipments from sales orders and pick items for staging.
 */

import prisma from "../prisma";
import { isFeatureEnabled, FEATURE_FLAGS } from "../features/feature-flags";
import { getSortedInventory } from "../inventory/picking-engine";

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
