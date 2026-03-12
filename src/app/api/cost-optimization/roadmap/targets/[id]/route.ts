import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkReadEndpointLimit, checkWriteEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (request, context, _session) => {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;

    const target = await prisma.costTarget.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        phases: {
          include: {
            actions: {
              include: {
                part: { select: { id: true, partNumber: true, name: true } },
                owner: { select: { id: true, name: true } },
              },
              orderBy: { targetCompletionDate: "asc" },
            },
          },
          orderBy: { targetDate: "asc" },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    // Calculate achieved cost
    const totalSavingsAchieved = target.phases.reduce(
      (sum, phase) =>
        sum +
        phase.actions
          .filter((a) => a.status === "COMPLETED_ACTION")
          .reduce((s, a) => s + a.annualSavings, 0),
      0
    );

    return NextResponse.json({
      ...target,
      achievedCost: target.currentCost - totalSavingsAchieved,
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/roadmap/targets/[id]" }
    );
    return NextResponse.json(
      { error: "Failed to fetch target" },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request, context, _session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const body = await request.json();

    const target = await prisma.costTarget.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.currentCost != null && { currentCost: body.currentCost }),
        ...(body.targetCost != null && { targetCost: body.targetCost }),
        ...(body.targetDate && { targetDate: new Date(body.targetDate) }),
        ...(body.status && { status: body.status }),
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
    });

    return NextResponse.json(target);
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "PUT /api/cost-optimization/roadmap/targets/[id]" }
    );
    return NextResponse.json(
      { error: "Failed to update target" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, context, _session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;

    await prisma.costTarget.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "DELETE /api/cost-optimization/roadmap/targets/[id]" }
    );
    return NextResponse.json(
      { error: "Failed to delete target" },
      { status: 500 }
    );
  }
});
