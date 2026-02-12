import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createShipment, confirmShipment } from "@/lib/mrp-engine";
import prisma from "@/lib/prisma";

// GET /api/orders/[id]/ship — Preview inventory by lot for shipping
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

        const sufficient = totalAvailable >= line.quantity;

        // Build allocation plan (which lot gets deducted how much)
        const allocationPlan: Array<{ lotNumber: string; deductQty: number }> = [];
        if (sufficient) {
          let remaining = line.quantity;
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
          requiredQty: line.quantity,
          totalAvailable,
          sufficient,
          lots,
          allocationPlan,
        };
      })
    );

    const allSufficient = lines.every((l) => l.sufficient);

    return NextResponse.json({ lines, allSufficient });
  } catch (error: any) {
    console.error("Failed to preview ship inventory:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi khi kiểm tra tồn kho" },
      { status: 500 }
    );
  }
}

// POST /api/orders/[id]/ship — Create shipment + confirm (single step)
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
    const { carrier, trackingNumber, lotAllocations } = body;
    const userId = session.user.id || session.user.email || "system";

    // Step 1: Create shipment
    const createResult = await createShipment(id, userId);

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
  } catch (error: any) {
    console.error("Failed to ship order:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi khi xuất kho" },
      { status: 400 }
    );
  }
}
