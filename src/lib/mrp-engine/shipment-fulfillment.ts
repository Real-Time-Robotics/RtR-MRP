/**
 * Shipment Fulfillment & Delivery
 * Confirm shipments (deduct inventory) and confirm delivery.
 */

import prisma from "../prisma";
import { isFeatureEnabled, FEATURE_FLAGS } from "../features/feature-flags";
import { getSortedInventory } from "../inventory/picking-engine";

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
