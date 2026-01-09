import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStockStatus } from "@/lib/bom-engine";
import { auth } from "@/lib/auth";
// Note: Removed Redis rate limiting - middleware already handles this
// Redis not available on Render free tier causes 10s timeout

interface DashboardData {
  pendingOrders: number;
  pendingOrdersValue: number;
  criticalStock: number;
  activePOs: number;
  activePOsValue: number;
  reorderAlerts: number;
  cached?: boolean;
  took?: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting handled by middleware - no Redis call here
    // This prevents 10s timeout when Redis is unavailable

    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pending orders
    const pendingOrders = await prisma.salesOrder.findMany({
      where: {
        status: { in: ["draft", "confirmed"] },
      },
      select: { id: true, totalAmount: true },
    });

    const pendingOrdersValue = pendingOrders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0
    );

    // Get inventory status (optimized query)
    const inventoryData = await prisma.inventory.findMany({
      select: {
        partId: true,
        quantity: true,
        reservedQty: true,
        part: {
          select: {
            planning: {
              select: {
                minStockLevel: true,
                reorderPoint: true,
              },
            },
          },
        },
      },
    });

    const partInventory = new Map<string, { quantity: number; reserved: number; minStockLevel: number; reorderPoint: number }>();
    inventoryData.forEach((inv) => {
      const existing = partInventory.get(inv.partId);
      const minStockLevel = inv.part.planning?.minStockLevel || 0;
      const reorderPoint = inv.part.planning?.reorderPoint || 0;

      if (existing) {
        existing.quantity += inv.quantity;
        existing.reserved += inv.reservedQty;
      } else {
        partInventory.set(inv.partId, {
          quantity: inv.quantity,
          reserved: inv.reservedQty,
          minStockLevel,
          reorderPoint,
        });
      }
    });

    let criticalStock = 0;
    let reorderAlerts = 0;

    partInventory.forEach((inv) => {
      const available = inv.quantity - inv.reserved;
      const status = getStockStatus(
        available,
        inv.minStockLevel,
        inv.reorderPoint
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
      select: { id: true, totalAmount: true },
    });

    const activePOsValue = activePOs.reduce(
      (sum, po) => sum + (po.totalAmount || 0),
      0
    );

    const data: DashboardData = {
      pendingOrders: pendingOrders.length,
      pendingOrdersValue,
      criticalStock,
      activePOs: activePOs.length,
      activePOsValue,
      reorderAlerts,
    };

    // Note: Cache disabled - Redis not available on Render free tier
    // Using HTTP Cache-Control headers instead for browser caching

    return NextResponse.json({
      ...data,
      cached: false,
      took: Date.now() - startTime,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
