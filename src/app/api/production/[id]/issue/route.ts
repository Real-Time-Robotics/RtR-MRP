import { NextResponse } from "next/server";
import { issueMaterials } from "@/lib/mrp-engine";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// POST - Issue allocated materials for work order (actual warehouse withdrawal)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate WO exists and is in a valid status
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }

    const validStatuses = ["released", "in_progress", "on_hold"];
    if (!validStatuses.includes(workOrder.status.toLowerCase())) {
      return NextResponse.json(
        { error: "Work order must be released, in progress, or on hold to issue materials" },
        { status: 400 }
      );
    }

    // Check there are allocated materials to issue
    const allocatedCount = await prisma.materialAllocation.count({
      where: {
        workOrderId: id,
        status: "allocated",
        allocatedQty: { gt: 0 },
      },
    });

    if (allocatedCount === 0) {
      return NextResponse.json(
        { error: "No allocated materials to issue. Allocate materials first." },
        { status: 400 }
      );
    }

    // Parse optional allocationIds from body
    let allocationIds: string[] | undefined;
    try {
      const body = await request.json();
      allocationIds = body.allocationIds;
    } catch {
      // No body or invalid JSON — issue all
    }

    const result = await issueMaterials(id, allocationIds);

    return NextResponse.json(result);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/production/[id]/issue' });
    return NextResponse.json(
      { error: "Failed to issue materials" },
      { status: 500 }
    );
  }
}
