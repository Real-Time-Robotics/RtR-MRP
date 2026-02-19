import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";
import { confirmDelivery } from "@/lib/mrp-engine";

const shipmentPatchSchema = z.object({
  action: z.enum(['deliver']),
});

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// GET /api/shipments/[id] — Get shipment detail
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        salesOrder: true,
        customer: true,
        lines: {
          include: { product: true },
          orderBy: { lineNumber: "asc" },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: "Phiếu xuất kho không tồn tại" },
        { status: 404 }
      );
    }

    return NextResponse.json(shipment);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/shipments/[id]' });
    return NextResponse.json(
      { error: "Lỗi khi tải phiếu xuất kho" },
      { status: 500 }
    );
  }
});

// PATCH /api/shipments/[id] — Update shipment (e.g. confirm delivery)
export const PATCH = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    const body = await request.json();
    const parsed = shipmentPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const { action } = parsed.data;
    const userId = session.user?.id || session.user?.email || "system";

    if (action === "deliver") {
      const result = await confirmDelivery(id, userId);
      return NextResponse.json({
        success: true,
        shipment: result.shipment,
        message: result.message,
      });
    }

    return NextResponse.json(
      { error: "Action không hợp lệ" },
      { status: 400 }
    );
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PATCH /api/shipments/[id]' });
    return NextResponse.json(
      { error: "Failed to update shipment" },
      { status: 400 }
    );
  }
});
