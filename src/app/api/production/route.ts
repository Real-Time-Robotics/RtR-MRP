import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createWorkOrder } from "@/lib/mrp-engine";
import { auth } from "@/lib/auth";

// GET - List work orders
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workOrders = await prisma.workOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        salesOrder: {
          include: { customer: true },
        },
        allocations: {
          include: { part: true },
        },
      },
    });

    return NextResponse.json(workOrders);
  } catch (error) {
    console.error("Production API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch work orders" },
      { status: 500 }
    );
  }
}

// POST - Create work order
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const {
      productId,
      quantity,
      salesOrderId,
      salesOrderLine,
      plannedStart,
      priority = "normal",
    } = body;

    const workOrder = await createWorkOrder(
      productId,
      quantity,
      salesOrderId,
      salesOrderLine,
      plannedStart ? new Date(plannedStart) : undefined,
      priority
    );

    return NextResponse.json(workOrder);
  } catch (error) {
    console.error("Create work order error:", error);
    return NextResponse.json(
      { error: "Failed to create work order" },
      { status: 500 }
    );
  }
}
