// src/lib/shipping/backorder-service.ts
// R15: Auto backorder when ship short — detect shortages and create backorder records

import { prisma } from "@/lib/prisma";

interface BackorderLine {
  salesOrderId: string;
  orderNumber: string;
  lineNumber: number;
  productId: string;
  productName: string;
  orderedQty: number;
  shippedQty: number;
  backorderQty: number;
  estimatedAvailableDate: Date | null;
}

interface BackorderSummary {
  totalBackorderLines: number;
  totalBackorderQty: number;
  byCustomer: Array<{
    customerId: string;
    customerName: string;
    backorderLines: number;
    backorderValue: number;
  }>;
}

/**
 * Detect all lines across sales orders that have been partially shipped
 * (i.e., shippedQty < quantity) and return them as backorder candidates.
 */
export async function detectBackorders(): Promise<BackorderLine[]> {
  // Find all SO lines where shippedQty < quantity (partially shipped)
  const lines = await prisma.salesOrderLine.findMany({
    where: {
      order: {
        status: { in: ["partially_shipped", "in_progress", "completed"] },
      },
    },
    include: {
      order: { select: { orderNumber: true } },
      product: { select: { name: true, sku: true } },
    },
  });

  const backorders: BackorderLine[] = [];

  for (const line of lines) {
    // Filter in code since Prisma doesn't support field-to-field comparison
    if (line.shippedQty >= line.quantity) continue;

    const backorderQty = line.quantity - line.shippedQty;

    // Estimate availability from inventory + incoming POs
    const part = await prisma.part.findFirst({
      where: { partNumber: line.product.sku },
    });

    let estimatedDate: Date | null = null;
    if (part) {
      // Check if there are incoming POs for this part
      const incomingPO = await prisma.purchaseOrderLine.findFirst({
        where: {
          partId: part.id,
          po: { status: { in: ["draft", "sent", "confirmed"] } },
        },
        include: { po: { select: { expectedDate: true } } },
        orderBy: { po: { expectedDate: "asc" } },
      });

      if (incomingPO) {
        estimatedDate = incomingPO.po.expectedDate;
      } else {
        // Estimate based on lead time
        estimatedDate = new Date();
        estimatedDate.setDate(estimatedDate.getDate() + (part.leadTimeDays || 14));
      }
    }

    backorders.push({
      salesOrderId: line.orderId,
      orderNumber: line.order.orderNumber,
      lineNumber: line.lineNumber,
      productId: line.productId,
      productName: line.product.name,
      orderedQty: line.quantity,
      shippedQty: line.shippedQty,
      backorderQty,
      estimatedAvailableDate: estimatedDate,
    });
  }

  return backorders.sort((a, b) => a.backorderQty - b.backorderQty);
}

/**
 * Auto-create a follow-up shipment for backordered lines when inventory becomes available.
 * Checks current inventory and creates shipment for any lines that can now be fulfilled.
 */
export async function processBackorders(userId: string): Promise<{
  processed: number;
  shipmentsCreated: string[];
  errors: string[];
}> {
  const errors: string[] = [];
  const shipmentsCreated: string[] = [];
  let processed = 0;

  const backorders = await detectBackorders();

  // Group by sales order
  const byOrder = new Map<string, BackorderLine[]>();
  for (const bo of backorders) {
    const existing = byOrder.get(bo.salesOrderId) || [];
    existing.push(bo);
    byOrder.set(bo.salesOrderId, existing);
  }

  for (const [salesOrderId, lines] of byOrder.entries()) {
    const fulfillableLines: Array<{ lineNumber: number; quantity: number }> = [];

    for (const line of lines) {
      // Check current inventory
      const part = await prisma.part.findFirst({
        where: { partNumber: line.productName },
      });

      if (!part) continue;

      const inventoryAgg = await prisma.inventory.aggregate({
        where: {
          partId: part.id,
          quantity: { gt: 0 },
        },
        _sum: { quantity: true, reservedQty: true },
      });

      const available =
        (inventoryAgg._sum.quantity || 0) - (inventoryAgg._sum.reservedQty || 0);

      if (available > 0) {
        const canFulfill = Math.min(available, line.backorderQty);
        fulfillableLines.push({
          lineNumber: line.lineNumber,
          quantity: canFulfill,
        });
      }
    }

    if (fulfillableLines.length > 0) {
      try {
        // Create follow-up shipment via existing SO
        const salesOrder = await prisma.salesOrder.findUnique({
          where: { id: salesOrderId },
          include: { shipments: true },
        });

        if (!salesOrder) continue;

        const sequence = String(salesOrder.shipments.length + 1).padStart(3, "0");
        const shipmentNumber = `SHP-${salesOrder.orderNumber}-${sequence}-BO`;

        const shipment = await prisma.shipment.create({
          data: {
            shipmentNumber,
            salesOrderId,
            customerId: salesOrder.customerId,
            status: "PREPARING",
            shippedBy: userId,
            notes: `Auto-created backorder fulfillment shipment`,
            lines: {
              create: fulfillableLines.map((fl) => {
                const originalLine = lines.find(
                  (l) => l.lineNumber === fl.lineNumber
                );
                return {
                  lineNumber: fl.lineNumber,
                  productId: originalLine!.productId,
                  quantity: fl.quantity,
                };
              }),
            },
          },
        });

        shipmentsCreated.push(shipment.shipmentNumber);
        processed += fulfillableLines.length;
      } catch (err) {
        errors.push(
          `Failed to create backorder shipment for SO ${lines[0].orderNumber}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  return { processed, shipmentsCreated, errors };
}

/**
 * Get backorder summary grouped by customer.
 */
export async function getBackorderSummary(): Promise<BackorderSummary> {
  const backorders = await detectBackorders();

  const customerMap = new Map<
    string,
    { customerId: string; customerName: string; lines: number; value: number }
  >();

  for (const bo of backorders) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: bo.salesOrderId },
      include: { customer: { select: { id: true, name: true } } },
    });

    if (!order) continue;

    const existing = customerMap.get(order.customerId) || {
      customerId: order.customerId,
      customerName: order.customer.name,
      lines: 0,
      value: 0,
    };

    existing.lines++;

    // Get unit price from SO line
    const soLine = await prisma.salesOrderLine.findFirst({
      where: { orderId: bo.salesOrderId, lineNumber: bo.lineNumber },
    });
    existing.value += bo.backorderQty * (soLine?.unitPrice || 0);

    customerMap.set(order.customerId, existing);
  }

  return {
    totalBackorderLines: backorders.length,
    totalBackorderQty: backorders.reduce((sum, b) => sum + b.backorderQty, 0),
    byCustomer: Array.from(customerMap.values()).map((c) => ({
      customerId: c.customerId,
      customerName: c.customerName,
      backorderLines: c.lines,
      backorderValue: c.value,
    })),
  };
}
