import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStockStatus } from "@/lib/bom-engine";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Get pending orders
    const pendingOrders = await prisma.salesOrder.findMany({
      where: {
        status: { in: ["draft", "confirmed"] },
      },
    });

    const pendingOrdersValue = pendingOrders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0
    );

    // Get inventory status
    const inventoryData = await prisma.inventory.findMany({
      include: {
        part: true,
      },
    });

    const partInventory = new Map<string, { quantity: number; reserved: number; part: typeof inventoryData[0]["part"] }>();
    inventoryData.forEach((inv) => {
      const existing = partInventory.get(inv.partId);
      if (existing) {
        existing.quantity += inv.quantity;
        existing.reserved += inv.reservedQty;
      } else {
        partInventory.set(inv.partId, {
          quantity: inv.quantity,
          reserved: inv.reservedQty,
          part: inv.part,
        });
      }
    });

    let criticalStock = 0;
    let reorderAlerts = 0;

    partInventory.forEach((inv) => {
      const available = inv.quantity - inv.reserved;
      const status = getStockStatus(
        available,
        inv.part.minStockLevel,
        inv.part.reorderPoint
      );

      if (status === "CRITICAL" || status === "OUT_OF_STOCK") {
        criticalStock++;
      } else if (status === "REORDER") {
        reorderAlerts++;
      }
    });

    // Get active POs
    const activePOs = await prisma.purchaseOrder.findMany({
      where: {
        status: { notIn: ["received", "cancelled"] },
      },
    });

    const activePOsValue = activePOs.reduce(
      (sum, po) => sum + (po.totalAmount || 0),
      0
    );

    return NextResponse.json({
      pendingOrders: pendingOrders.length,
      pendingOrdersValue,
      criticalStock,
      activePOs: activePOs.length,
      activePOsValue,
      reorderAlerts,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
