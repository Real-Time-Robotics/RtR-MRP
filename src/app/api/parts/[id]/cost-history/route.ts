import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get cost history for a part
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const costHistory = await prisma.partCostHistory.findMany({
      where: { partId: id },
      orderBy: { effectiveDate: "desc" },
      take: limit,
    });

    return NextResponse.json(costHistory);
  } catch (error) {
    console.error("Failed to fetch cost history:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost history" },
      { status: 500 }
    );
  }
}

// POST - Add cost history entry
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    const costEntry = await prisma.partCostHistory.create({
      data: {
        id: `COST-${Date.now()}`,
        partId: id,
        effectiveDate: data.effectiveDate
          ? new Date(data.effectiveDate)
          : new Date(),
        costType: data.costType,
        unitCost: data.unitCost,
        currency: data.currency || "USD",
        supplierId: data.supplierId,
        poNumber: data.poNumber,
        notes: data.notes,
        createdBy: session.user?.email || "system",
      },
    });

    // Optionally update part's current cost
    if (data.updatePartCost) {
      await prisma.part.update({
        where: { id },
        data: {
          cost: {
            upsert: {
              create: {
                unitCost: data.unitCost,
                averageCost: data.unitCost,
              },
              update: {
                unitCost: data.unitCost,
                averageCost: data.unitCost,
              },
            },
          },
          updatedBy: session.user?.email || "system",
        },
      });
    }

    return NextResponse.json(costEntry, { status: 201 });
  } catch (error) {
    console.error("Failed to create cost entry:", error);
    return NextResponse.json(
      { error: "Failed to create cost entry" },
      { status: 500 }
    );
  }
}
