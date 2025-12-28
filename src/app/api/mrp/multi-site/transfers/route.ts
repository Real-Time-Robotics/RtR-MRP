import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

// GET /api/mrp/multi-site/transfers - Get transfer orders
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromSiteId = searchParams.get("fromSiteId") || undefined;
    const toSiteId = searchParams.get("toSiteId") || undefined;
    const status = searchParams.get("status") || undefined;

    const where: Record<string, unknown> = {};
    if (fromSiteId) where.fromSiteId = fromSiteId;
    if (toSiteId) where.toSiteId = toSiteId;
    if (status) where.status = status;

    const transfers = await prisma.transferOrder.findMany({
      where,
      include: {
        fromSite: true,
        toSite: true,
        lines: {
          include: {
            part: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(transfers);
  } catch (error) {
    console.error("Transfers GET error:", error);
    return NextResponse.json(
      { error: "Failed to get transfer orders" },
      { status: 500 }
    );
  }
}

// POST /api/mrp/multi-site/transfers - Create a transfer order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromSiteId, toSiteId, requestDate, lines, notes } = body;

    if (!fromSiteId || !toSiteId || !lines || lines.length === 0) {
      return NextResponse.json(
        { error: "fromSiteId, toSiteId, and lines are required" },
        { status: 400 }
      );
    }

    // Generate transfer number
    const count = await prisma.transferOrder.count();
    const transferNumber = `TO-${String(count + 1).padStart(6, "0")}`;

    // Get lead time (simplified - could be site-specific)
    const leadTimeDays = 3;
    const expectedDate = new Date(requestDate || new Date());
    expectedDate.setDate(expectedDate.getDate() + leadTimeDays);

    const transfer = await prisma.transferOrder.create({
      data: {
        transferNumber,
        fromSiteId,
        toSiteId,
        status: "DRAFT",
        requestDate: new Date(requestDate || new Date()),
        expectedDate,
        notes,
        lines: {
          create: lines.map((line: { partId: string; quantity: number }) => ({
            partId: line.partId,
            quantity: new Decimal(line.quantity),
            shippedQty: new Decimal(0),
            receivedQty: new Decimal(0),
          })),
        },
      },
      include: {
        fromSite: true,
        toSite: true,
        lines: {
          include: {
            part: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      transfer,
    });
  } catch (error) {
    console.error("Transfers POST error:", error);
    return NextResponse.json(
      { error: "Failed to create transfer order" },
      { status: 500 }
    );
  }
}

// PUT /api/mrp/multi-site/transfers - Update transfer order status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { transferId, action, lineUpdates } = body;

    if (!transferId || !action) {
      return NextResponse.json(
        { error: "transferId and action are required" },
        { status: 400 }
      );
    }

    const transfer = await prisma.transferOrder.findUnique({
      where: { id: transferId },
      include: { lines: true },
    });

    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer order not found" },
        { status: 404 }
      );
    }

    let newStatus = transfer.status;
    const updateData: Record<string, unknown> = {};

    switch (action) {
      case "approve":
        newStatus = "APPROVED";
        break;
      case "ship":
        newStatus = "IN_TRANSIT";
        updateData.shippedDate = new Date();
        // Update line shipped quantities
        if (lineUpdates) {
          for (const update of lineUpdates) {
            await prisma.transferOrderLine.update({
              where: { id: update.lineId },
              data: { shippedQty: new Decimal(update.shippedQty) },
            });
          }
        }
        break;
      case "receive":
        newStatus = "RECEIVED";
        updateData.receivedDate = new Date();
        // Update line received quantities
        if (lineUpdates) {
          for (const update of lineUpdates) {
            await prisma.transferOrderLine.update({
              where: { id: update.lineId },
              data: { receivedQty: new Decimal(update.receivedQty) },
            });
          }
        }
        break;
      case "cancel":
        newStatus = "CANCELLED";
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action. Use: approve, ship, receive, or cancel" },
          { status: 400 }
        );
    }

    updateData.status = newStatus;

    const updated = await prisma.transferOrder.update({
      where: { id: transferId },
      data: updateData,
      include: {
        fromSite: true,
        toSite: true,
        lines: {
          include: {
            part: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      transfer: updated,
    });
  } catch (error) {
    console.error("Transfers PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update transfer order" },
      { status: 500 }
    );
  }
}
