import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
// Get all parts with their inventory and requirements
    const parts = await prisma.part.findMany({
      include: {
        inventory: true,
        planning: true,
        partSuppliers: {
          include: {
            supplier: true,
          },
          where: { isPreferred: true },
          take: 1,
        },
        bomLines: {
          include: {
            bom: {
              include: {
                product: {
                  include: {
                    salesOrderLines: {
                      where: {
                        order: {
                          status: {
                            in: ["confirmed", "draft"],
                          },
                          requiredDate: {
                            gte: new Date(),
                          },
                        },
                      },
                      include: {
                        order: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const shortages = [];

    for (const part of parts) {
      // Sum up quantity from all inventory records
      const currentStock = part.inventory.reduce(
        (sum, inv) => sum + (inv.quantity - inv.reservedQty),
        0
      );
      const safetyStock = part.planning?.safetyStock || 0;

      // Calculate total required from sales orders
      let totalRequired = 0;
      let earliestNeed: Date | null = null;
      const orderIds = new Set<string>();

      for (const bomLine of part.bomLines) {
        for (const soLine of bomLine.bom.product.salesOrderLines) {
          const qtyNeeded = bomLine.quantity * soLine.quantity;
          totalRequired += qtyNeeded;
          orderIds.add(soLine.orderId);

          const requiredDate = new Date(soLine.order.requiredDate);
          if (!earliestNeed || requiredDate < earliestNeed) {
            earliestNeed = requiredDate;
          }
        }
      }

      // Calculate shortfall including safety stock
      const availableForProduction = Math.max(0, currentStock - safetyStock);
      const shortfall = totalRequired - availableForProduction;

      if (shortfall > 0) {
        // Determine priority based on shortfall severity and timing
        let priority = "low";
        const daysUntilNeed = earliestNeed
          ? Math.ceil(
            (earliestNeed.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
          : 999;

        const leadTimeDays = part.partSuppliers[0]?.leadTimeDays ?? 14;

        if (daysUntilNeed < leadTimeDays) {
          priority = "critical";
        } else if (daysUntilNeed < leadTimeDays * 1.5) {
          priority = "high";
        } else if (daysUntilNeed < leadTimeDays * 2) {
          priority = "medium";
        }

        shortages.push({
          id: part.id,
          partId: part.id,
          partNumber: part.partNumber,
          partName: part.name,
          currentStock,
          safetyStock,
          requiredQty: totalRequired,
          shortfallQty: shortfall,
          earliestNeed: earliestNeed?.toISOString() || new Date().toISOString(),
          affectedOrders: orderIds.size,
          priority,
          supplier: part.partSuppliers[0]?.supplier.name || null,
          supplierId: part.partSuppliers[0]?.supplier.id || null,
          leadTimeDays,
        });
      }
    }

    // Sort by priority (critical first) then by earliest need
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    shortages.sort((a, b) => {
      const priorityDiff =
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) -
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 4);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.earliestNeed).getTime() - new Date(b.earliestNeed).getTime();
    });

    return NextResponse.json(shortages);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/mrp/shortages' });
    return NextResponse.json(
      { error: "Failed to fetch shortages" },
      { status: 500 }
    );
  }
});
