import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runMrpCalculation } from "@/lib/mrp-engine";
import { auth } from "@/lib/auth";

// GET - List MRP runs
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const runs = await prisma.mrpRun.findMany({
      orderBy: { runDate: "desc" },
      take: 20,
      include: {
        _count: {
          select: { suggestions: true },
        },
      },
    });

    return NextResponse.json(runs);
  } catch (error) {
    console.error("MRP API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch MRP runs" },
      { status: 500 }
    );
  }
}

// POST - Run new MRP calculation
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const {
      planningHorizonDays = 90,
      includeConfirmed = true,
      includeDraft = true,
      includeSafetyStock = true,
    } = body;

    const mrpRun = await runMrpCalculation({
      planningHorizonDays,
      includeConfirmed,
      includeDraft,
      includeSafetyStock,
    });

    const fullRun = await prisma.mrpRun.findUnique({
      where: { id: mrpRun.id },
      include: {
        suggestions: {
          include: {
            part: true,
            supplier: true,
          },
        },
      },
    });

    return NextResponse.json(fullRun);
  } catch (error) {
    console.error("MRP calculation error:", error);
    return NextResponse.json(
      { error: "Failed to run MRP calculation" },
      { status: 500 }
    );
  }
}
