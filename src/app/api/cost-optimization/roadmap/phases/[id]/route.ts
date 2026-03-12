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

    const phase = await prisma.costReductionPhase.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.targetCost != null && { targetCost: body.targetCost }),
        ...(body.targetDate && { targetDate: new Date(body.targetDate) }),
        ...(body.status && { status: body.status }),
      },
    });

    return NextResponse.json(phase);
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "PUT /api/cost-optimization/roadmap/phases/[id]" }
    );
    return NextResponse.json(
      { error: "Failed to update phase" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, context, _session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;

    await prisma.costReductionPhase.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "DELETE /api/cost-optimization/roadmap/phases/[id]" }
    );
    return NextResponse.json(
      { error: "Failed to delete phase" },
      { status: 500 }
    );
  }
});
