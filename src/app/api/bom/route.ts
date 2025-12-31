import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - List all BOM headers with lines
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const status = searchParams.get("status") || "active";

    const where: Record<string, unknown> = {};
    if (productId) where.productId = productId;
    if (status) where.status = status;

    const bomHeaders = await prisma.bomHeader.findMany({
      where,
      include: {
        product: true,
        bomLines: {
          include: {
            part: true,
          },
          orderBy: [{ moduleCode: "asc" }, { sequence: "asc" }, { lineNumber: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(bomHeaders);
  } catch (error) {
    console.error("Failed to fetch BOMs:", error);
    return NextResponse.json(
      { error: "Failed to fetch BOMs" },
      { status: 500 }
    );
  }
}

// POST - Create new BOM header
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    const bomHeader = await prisma.bomHeader.create({
      data: {
        id: data.id || `BOM-${Date.now()}`,
        productId: data.productId,
        version: data.version || "1.0",
        status: data.status || "draft",
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
        notes: data.notes,
      },
      include: {
        product: true,
      },
    });

    return NextResponse.json(bomHeader, { status: 201 });
  } catch (error) {
    console.error("Failed to create BOM:", error);
    return NextResponse.json(
      { error: "Failed to create BOM" },
      { status: 500 }
    );
  }
}
