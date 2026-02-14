import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

// GET - List all manufacturers (from Supplier table)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all active suppliers as manufacturers
    const suppliers = await prisma.supplier.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Return supplier names as manufacturer options
    const manufacturers = suppliers.map((s) => s.name);

    return NextResponse.json({
      data: manufacturers,
      total: manufacturers.length,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/parts/manufacturers' });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
