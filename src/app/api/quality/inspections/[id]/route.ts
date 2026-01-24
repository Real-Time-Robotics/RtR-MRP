import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single inspection
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const inspection = await prisma.inspection.findUnique({
      where: { id },
      include: {
        part: { select: { id: true, partNumber: true, name: true, unit: true } },
        product: { select: { id: true, sku: true, name: true } },
        plan: { select: { id: true, planNumber: true, name: true } },
        results: {
          include: { characteristic: true },
          orderBy: { inspectedAt: "asc" },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    return NextResponse.json(inspection);
  } catch (error) {
    console.error("Failed to fetch inspection:", error);
    return NextResponse.json({ error: "Failed to fetch inspection" }, { status: 500 });
  }
}

// PUT - Update inspection (status, result, etc.)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    const existing = await prisma.inspection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.status) updateData.status = data.status;
    if (data.result) updateData.result = data.result;
    if (data.quantityInspected !== undefined) updateData.quantityInspected = data.quantityInspected;
    if (data.quantityAccepted !== undefined) updateData.quantityAccepted = data.quantityAccepted;
    if (data.quantityRejected !== undefined) updateData.quantityRejected = data.quantityRejected;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.status === "completed") {
      updateData.inspectedAt = new Date();
    }

    const inspection = await prisma.inspection.update({
      where: { id },
      data: updateData,
      include: {
        part: { select: { id: true, partNumber: true, name: true, unit: true } },
        results: { include: { characteristic: true } },
      },
    });

    return NextResponse.json(inspection);
  } catch (error) {
    console.error("Failed to update inspection:", error);
    return NextResponse.json({ error: "Failed to update inspection" }, { status: 500 });
  }
}
