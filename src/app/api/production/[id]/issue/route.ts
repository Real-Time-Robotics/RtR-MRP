import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import { z } from "zod";
import { issueMaterials } from "@/lib/mrp-engine";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';

const issueBodySchema = z.object({
  allocationIds: z.array(z.string()).optional(),
});

// POST - Issue allocated materials for work order (actual warehouse withdrawal)
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

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
      const rawBody = await request.json();
      const parseResult = issueBodySchema.safeParse(rawBody);
      if (parseResult.success) {
        allocationIds = parseResult.data.allocationIds;
      }
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
});
