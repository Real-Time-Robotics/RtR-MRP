// Mobile API - Work Orders
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const number = searchParams.get("number");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50") || 50, 100);

    // Get single work order
    if (id || number) {
      const workOrder = await prisma.workOrder.findFirst({
        where: id ? { id } : { woNumber: number! },
        include: {
          product: true,
        },
      });

      if (!workOrder) {
        return NextResponse.json({ error: "Work order not found" }, { status: 404 });
      }

      return NextResponse.json({
        workOrder: {
          id: workOrder.id,
          number: workOrder.woNumber,
          productId: workOrder.productId,
          productName: workOrder.product.name,
          productSku: workOrder.product.sku,
          quantity: workOrder.quantity,
          completedQty: workOrder.completedQty,
          scrapQty: workOrder.scrapQty,
          status: workOrder.status,
          priority: workOrder.priority,
          plannedStart: workOrder.plannedStart?.toISOString().split("T")[0],
          plannedEnd: workOrder.plannedEnd?.toISOString().split("T")[0],
          actualStart: workOrder.actualStart?.toISOString().split("T")[0],
          actualEnd: workOrder.actualEnd?.toISOString().split("T")[0],
          assignedTo: workOrder.assignedTo,
          workCenter: workOrder.workCenter,
          notes: workOrder.notes,
        },
      });
    }

    // List work orders
    const where: Record<string, unknown> = {};

    if (status === "active") {
      where.status = { in: ["released", "in_progress"] };
    } else if (status) {
      where.status = status;
    }

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: [{ priority: "desc" }, { plannedStart: "asc" }],
      take: limit,
    });

    return NextResponse.json({
      workOrders: workOrders.map((wo) => ({
        id: wo.id,
        number: wo.woNumber,
        productId: wo.productId,
        productName: wo.product.name,
        productSku: wo.product.sku,
        quantity: wo.quantity,
        completedQty: wo.completedQty,
        status: wo.status,
        priority: wo.priority,
        plannedStart: wo.plannedStart?.toISOString().split("T")[0],
        plannedEnd: wo.plannedEnd?.toISOString().split("T")[0],
        assignedTo: wo.assignedTo,
        workCenter: wo.workCenter,
      })),
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/mobile/work-orders' });
    return NextResponse.json(
      { error: "Failed to fetch work orders" },
      { status: 500 }
    );
  }
});
