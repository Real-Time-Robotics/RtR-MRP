import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createShipment, confirmShipment } from "@/lib/mrp-engine";
import prisma from "@/lib/prisma";

// GET /api/orders/[id]/ship — Preview inventory by lot for shipping (partial-aware)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        lines: { include: { product: true }, orderBy: { lineNumber: "asc" } },
      },
    });

    if (!salesOrder) {
      return NextResponse.json({ error: "Đơn hàng không tồn tại" }, { status: 404 });
    }

    // Find MAIN warehouse
    let warehouse = await prisma.warehouse.findFirst({
      where: { type: "MAIN", status: "active" },
    });
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

    const lines = await Promise.all(
      salesOrder.lines.map(async (line) => {
        const remainingQty = line.quantity - line.shippedQty;

        // Skip fully shipped lines
        if (remainingQty <= 0) {
          return {
            lineNumber: line.lineNumber,
            productId: line.productId,
            productSku: line.product.sku,
            productName: line.product.name,
            orderQty: line.quantity,
            shippedQty: line.shippedQty,
            requiredQty: 0,
            totalAvailable: 0,
            sufficient: true,
            fullyShipped: true,
            lots: [] as Array<{ lotNumber: string; quantity: number; warehouseCode: string }>,
            allocationPlan: [] as Array<{ lotNumber: string; deductQty: number }>,
          };
        }

        const part = await prisma.part.findFirst({
          where: { partNumber: line.product.sku },
        });

        let lots: Array<{ lotNumber: string; quantity: number; warehouseCode: string }> = [];
        let totalAvailable = 0;

        if (part && warehouse) {
          const inventoryRecords = await prisma.inventory.findMany({
            where: { partId: part.id, warehouseId: warehouse.id, quantity: { gt: 0 } },
            include: { warehouse: true },
            orderBy: { quantity: "desc" },
          });

          lots = inventoryRecords.map((inv) => ({
            lotNumber: inv.lotNumber || "N/A",
            quantity: inv.quantity,
            warehouseCode: inv.warehouse.code,
          }));

          totalAvailable = inventoryRecords.reduce((sum, inv) => sum + inv.quantity, 0);
        }

        // Check against remaining qty, not total qty
        const sufficient = totalAvailable >= remainingQty;

        // Build allocation plan for remaining qty
        const allocationPlan: Array<{ lotNumber: string; deductQty: number }> = [];
        if (sufficient) {
          let remaining = remainingQty;
          for (const lot of lots) {
            if (remaining <= 0) break;
            const deductQty = Math.min(remaining, lot.quantity);
            allocationPlan.push({ lotNumber: lot.lotNumber, deductQty });
            remaining -= deductQty;
          }
        }

        return {
          lineNumber: line.lineNumber,
          productId: line.productId,
          productSku: line.product.sku,
          productName: line.product.name,
          orderQty: line.quantity,
          shippedQty: line.shippedQty,
          requiredQty: remainingQty,
          totalAvailable,
          sufficient,
          fullyShipped: false,
          lots,
          allocationPlan,
        };
      })
    );

    // Only consider non-fully-shipped lines for allSufficient check
    const activeLines = lines.filter((l) => !l.fullyShipped);
    const allSufficient = activeLines.every((l) => l.sufficient);

    return NextResponse.json({ lines, allSufficient });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/orders/[id]/ship' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lỗi khi kiểm tra tồn kho" },
      { status: 500 }
    );
  }
}

// POST /api/orders/[id]/ship — Create partial shipment + confirm
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const { carrier, trackingNumber, lotAllocations, linesToShip } = body;
    const userId = session.user.id || session.user.email || "system";

    // Step 1: Create shipment (with optional linesToShip for partial shipping)
    const createResult = await createShipment(id, userId, linesToShip);

    // Step 2: Confirm shipment (deduct inventory, mark SHIPPED)
    const confirmResult = await confirmShipment(
      createResult.shipment.id,
      userId,
      { carrier, trackingNumber, lotAllocations }
    );

    return NextResponse.json({
      success: true,
      shipment: confirmResult.shipment,
      message: confirmResult.message,
    });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/orders/[id]/ship' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lỗi khi xuất kho" },
      { status: 400 }
    );
  }
}
