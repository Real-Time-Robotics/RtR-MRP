import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateInspectionNumber } from "@/lib/quality/inspection-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const inspections = await prisma.inspection.findMany({
      where: {
        ...(type && { type }),
        ...(status && { status }),
      },
      include: {
        plan: { select: { planNumber: true, name: true } },
        part: { select: { partNumber: true, name: true } },
        product: { select: { sku: true, name: true } },
        workOrder: { select: { woNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(inspections);
  } catch (error) {
    console.error("Failed to fetch inspections:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspections" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const inspectionNumber = await generateInspectionNumber(body.type);

    const inspection = await prisma.inspection.create({
      data: {
        inspectionNumber,
        type: body.type,
        planId: body.planId,
        partId: body.partId,
        productId: body.productId,
        poLineId: body.poLineId,
        workOrderId: body.workOrderId,
        salesOrderId: body.salesOrderId,
        lotNumber: body.lotNumber,
        quantityReceived: body.quantityReceived,
        quantityInspected: body.quantityInspected,
        inspectedBy: session.user.id,
        warehouseId: body.warehouseId,
        workCenter: body.workCenter,
        notes: body.notes,
        status: "pending",
      },
    });

    return NextResponse.json(inspection, { status: 201 });
  } catch (error) {
    console.error("Failed to create inspection:", error);
    return NextResponse.json(
      { error: "Failed to create inspection" },
      { status: 500 }
    );
  }
}
