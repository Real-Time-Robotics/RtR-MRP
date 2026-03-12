import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkWriteEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const POST = withAuth(async (request, _context, _session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const { costTargetId, name, targetCost, targetDate } = body;

    if (!costTargetId || !name || targetCost == null || !targetDate) {
      return NextResponse.json(
        { error: "costTargetId, name, targetCost, and targetDate are required" },
        { status: 400 }
      );
    }

    // Verify target exists
    const target = await prisma.costTarget.findUnique({
      where: { id: costTargetId },
    });
    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    const phase = await prisma.costReductionPhase.create({
      data: {
        costTargetId,
        name,
        targetCost,
        targetDate: new Date(targetDate),
        status: "PLANNED",
      },
      include: {
        actions: true,
      },
    });

    return NextResponse.json(phase, { status: 201 });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "POST /api/cost-optimization/roadmap/phases" }
    );
    return NextResponse.json(
      { error: "Failed to create phase" },
      { status: 500 }
    );
  }
});
