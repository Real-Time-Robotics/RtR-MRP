import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateCertificateNumber } from "@/lib/quality/coc-generator";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const certificates = await prisma.certificateOfConformance.findMany({
      where: {
        ...(status && status !== "all" ? { status } : {}),
      },
      include: {
        salesOrder: {
          select: {
            orderNumber: true,
            customer: { select: { name: true } },
          },
        },
        product: { select: { sku: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(certificates);
  } catch (error) {
    console.error("Failed to fetch certificates:", error);
    return NextResponse.json(
      { error: "Failed to fetch certificates" },
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
    const certificateNumber = await generateCertificateNumber();

    const certificate = await prisma.certificateOfConformance.create({
      data: {
        certificateNumber,
        salesOrderId: body.salesOrderId,
        salesOrderLineId: body.salesOrderLineId,
        productId: body.productId,
        lotNumbers: body.lotNumbers,
        serialNumbers: body.serialNumbers,
        quantity: body.quantity,
        inspectionId: body.inspectionId,
        specifications: body.specifications,
        testResults: body.testResults,
        preparedBy: session.user.name || session.user.email || "System",
        preparedAt: new Date(),
        status: "draft",
      },
    });

    return NextResponse.json(certificate, { status: 201 });
  } catch (error) {
    console.error("Failed to create certificate:", error);
    return NextResponse.json(
      { error: "Failed to create certificate" },
      { status: 500 }
    );
  }
}
