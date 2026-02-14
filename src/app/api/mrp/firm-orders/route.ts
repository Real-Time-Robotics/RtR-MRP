import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { logger } from "@/lib/logger";

// GET /api/mrp/firm-orders - Get planned orders (firm and non-firm)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const firmOnly = searchParams.get("firmOnly") === "true";
    const partId = searchParams.get("partId") || undefined;
    const siteId = searchParams.get("siteId") || undefined;
    const status = searchParams.get("status") || undefined;

    const where: Record<string, unknown> = {};
    if (firmOnly) where.isFirm = true;
    if (partId) where.partId = partId;
    if (siteId) where.siteId = siteId;
    if (status) where.status = status;

    const orders = await prisma.plannedOrder.findMany({
      where,
      include: {
        part: true,
      },
      orderBy: [{ isFirm: "desc" }, { dueDate: "asc" }],
      take: 200,
    });

    return NextResponse.json(orders);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/mrp/firm-orders' });
    return NextResponse.json(
      { error: "Failed to get planned orders" },
      { status: 500 }
    );
  }
}

// POST /api/mrp/firm-orders - Create a planned order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { partId, siteId, quantity, dueDate, orderType, isFirm } = body;

    if (!partId || !quantity || !dueDate) {
      return NextResponse.json(
        { error: "partId, quantity, and dueDate are required" },
        { status: 400 }
      );
    }

    // Generate order number
    const count = await prisma.plannedOrder.count();
    const orderNumber = `PO-${String(count + 1).padStart(6, "0")}`;

    // Calculate start date based on lead time (default 7 days before due date)
    const dueDateObj = new Date(dueDate);
    const startDateObj = new Date(dueDateObj);
    startDateObj.setDate(startDateObj.getDate() - 7);

    const order = await prisma.plannedOrder.create({
      data: {
        orderNumber,
        partId,
        siteId,
        quantity: new Decimal(quantity),
        startDate: startDateObj,
        dueDate: dueDateObj,
        orderType: orderType || "PURCHASE",
        isFirm: isFirm || false,
        firmedAt: isFirm ? new Date() : null,
      },
      include: {
        part: true,
      },
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/mrp/firm-orders' });
    return NextResponse.json(
      { error: "Failed to create planned order" },
      { status: 500 }
    );
  }
}

// PUT /api/mrp/firm-orders - Update (firm/unfirm) a planned order
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, isFirm, quantity, dueDate, status } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (typeof isFirm === "boolean") {
      updateData.isFirm = isFirm;
      updateData.firmedAt = isFirm ? new Date() : null;
    }
    if (quantity !== undefined) updateData.quantity = new Decimal(quantity);
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (status) updateData.status = status;

    const order = await prisma.plannedOrder.update({
      where: { id: orderId },
      data: updateData,
      include: {
        part: true,
      },
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/mrp/firm-orders' });
    return NextResponse.json(
      { error: "Failed to update planned order" },
      { status: 500 }
    );
  }
}

// DELETE /api/mrp/firm-orders - Delete a planned order
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get("id");

    if (!orderId) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await prisma.plannedOrder.delete({
      where: { id: orderId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/mrp/firm-orders' });
    return NextResponse.json(
      { error: "Failed to delete planned order" },
      { status: 500 }
    );
  }
}
