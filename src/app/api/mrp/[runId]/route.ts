import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET - Get MRP run details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    const run = await prisma.mrpRun.findUnique({
      where: { id: runId },
      include: {
        suggestions: {
          include: {
            part: true,
            supplier: true,
          },
          orderBy: [{ priority: "asc" }, { actionType: "asc" }],
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "MRP run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/mrp/[runId]' });
    return NextResponse.json(
      { error: "Failed to fetch MRP run" },
      { status: 500 }
    );
  }
}
