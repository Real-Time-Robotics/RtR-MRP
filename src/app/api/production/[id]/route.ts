import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateWorkOrderStatus } from "@/lib/mrp-engine";

// GET - Get work order details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
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

    if (!workOrder) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(workOrder);
  } catch (error) {
    console.error("Work order API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch work order" },
      { status: 500 }
    );
  }
}

// PATCH - Update work order
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, completedQty } = body;

    if (status) {
      const workOrder = await updateWorkOrderStatus(id, status, completedQty);
      return NextResponse.json(workOrder);
    }

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: body,
      include: {
        product: true,
        allocations: { include: { part: true } },
      },
    });

    return NextResponse.json(workOrder);
  } catch (error) {
    console.error("Update work order error:", error);
    return NextResponse.json(
      { error: "Failed to update work order" },
      { status: 500 }
    );
  }
}
