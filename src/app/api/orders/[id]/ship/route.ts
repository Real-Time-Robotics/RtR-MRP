import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";
import { createShipment, confirmShipment } from "@/lib/mrp-engine";
import prisma from "@/lib/prisma";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const shipBodySchema = z.object({
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  lotAllocations: z.any().optional(),
  linesToShip: z.array(z.any()).optional(),
});

// GET /api/orders/[id]/ship — Preview inventory by lot for shipping (partial-aware)
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

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
      { error: "Failed to check inventory for shipping" },
      { status: 500 }
    );
  }
});

// POST /api/orders/[id]/ship — Create partial shipment + confirm
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const rawBody = await request.json().catch(() => ({}));
    const parseResult = shipBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
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
      { error: "Failed to process shipment" },
      { status: 400 }
    );
  }
});
