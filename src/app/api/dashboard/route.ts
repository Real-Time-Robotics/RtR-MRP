import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStockStatus } from "@/lib/bom-engine";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from '@/lib/logger';
import { cacheAside, cacheTTL } from '@/lib/cache';

import { checkReadEndpointLimit } from '@/lib/rate-limit';

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

export const GET = withAuth(async (request: NextRequest, _context, _session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();

  try {
    const data = await cacheAside<DashboardData>('dashboard:stats', async () => {
    // Run all DB queries in parallel — use aggregates where possible
    const [pendingOrdersAgg, pendingOrdersCount, inventoryData, activePOsAgg, activePOsCount] = await Promise.all([
      // Aggregate pending orders value
      prisma.salesOrder.aggregate({
        where: { status: { in: ["draft", "confirmed"] } },
        _sum: { totalAmount: true },
      }),
      prisma.salesOrder.count({
        where: { status: { in: ["draft", "confirmed"] } },
      }),
      // Get inventory status — only fields needed for stock status calculation
      prisma.inventory.findMany({
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
      }),
      // Aggregate active POs value
      prisma.purchaseOrder.aggregate({
        where: { status: { notIn: ["received", "cancelled"] } },
        _sum: { totalAmount: true },
      }),
      prisma.purchaseOrder.count({
        where: { status: { notIn: ["received", "cancelled"] } },
      }),
    ]);

    const pendingOrdersValue = pendingOrdersAgg._sum.totalAmount || 0;
    const activePOsValue = activePOsAgg._sum.totalAmount || 0;

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

    return {
      pendingOrders: pendingOrdersCount,
      pendingOrdersValue,
      criticalStock,
      activePOs: activePOsCount,
      activePOsValue,
      reorderAlerts,
    };
    }, cacheTTL.dashboard); // Cache for 60 seconds

    return NextResponse.json({
      ...data,
      took: Date.now() - startTime,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/dashboard' });
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
});
