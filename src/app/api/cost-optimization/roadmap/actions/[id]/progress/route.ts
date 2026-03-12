import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkWriteEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const PUT = withAuth(async (request, context, _session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const body = await request.json();
    const { progressPercent, status, notes } = body;

    if (progressPercent == null) {
      return NextResponse.json(
        { error: "progressPercent is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      progressPercent: Math.min(100, Math.max(0, progressPercent)),
    };

    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    // Auto-complete if progress reaches 100
    if (progressPercent >= 100) {
      updateData.status = "COMPLETED_ACTION";
      updateData.actualCompletionDate = new Date();
    }

    const action = await prisma.costReductionAction.update({
      where: { id },
      data: updateData,
      include: {
        part: { select: { id: true, partNumber: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(action);
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "PUT /api/cost-optimization/roadmap/actions/[id]/progress" }
    );
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
});
