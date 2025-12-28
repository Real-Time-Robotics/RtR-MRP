import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateNCRNumber } from "@/lib/quality/ncr-workflow";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const ncrs = await prisma.nCR.findMany({
      where: {
        ...(status && status !== "all" ? { status } : {}),
      },
      include: {
        part: { select: { partNumber: true, name: true } },
        product: { select: { sku: true, name: true } },
        workOrder: { select: { woNumber: true } },
        inspection: { select: { inspectionNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(ncrs);
  } catch (error) {
    console.error("Failed to fetch NCRs:", error);
    return NextResponse.json({ error: "Failed to fetch NCRs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const ncrNumber = await generateNCRNumber();

    const ncr = await prisma.nCR.create({
      data: {
        ncrNumber,
        source: body.source,
        inspectionId: body.inspectionId,
        partId: body.partId,
        productId: body.productId,
        workOrderId: body.workOrderId,
        salesOrderId: body.salesOrderId,
        poId: body.poId,
        lotNumber: body.lotNumber,
        quantityAffected: body.quantityAffected,
        title: body.title,
        description: body.description,
        defectCode: body.defectCode,
        defectCategory: body.defectCategory,
        priority: body.priority || "medium",
        createdBy: session.user.id,
        status: "open",
      },
    });

    // Log initial history
    await prisma.nCRHistory.create({
      data: {
        ncrId: ncr.id,
        action: "CREATED",
        toStatus: "open",
        userId: session.user.id,
      },
    });

    return NextResponse.json(ncr, { status: 201 });
  } catch (error) {
    console.error("Failed to create NCR:", error);
    return NextResponse.json({ error: "Failed to create NCR" }, { status: 500 });
  }
}
