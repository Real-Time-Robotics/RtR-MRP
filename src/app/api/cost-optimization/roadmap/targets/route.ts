import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkReadEndpointLimit, checkWriteEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (request, _context, _session) => {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (productId) where.productId = productId;
    if (status) where.status = status;

    const targets = await prisma.costTarget.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
        phases: {
          include: {
            actions: {
              select: { id: true, status: true, progressPercent: true, annualSavings: true },
            },
          },
          orderBy: { targetDate: "asc" },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const targetsWithProgress = targets.map((target) => {
      const totalActions = target.phases.reduce(
        (sum, phase) => sum + phase.actions.length,
        0
      );
      const completedActions = target.phases.reduce(
        (sum, phase) =>
          sum + phase.actions.filter((a) => a.status === "COMPLETED_ACTION").length,
        0
      );
      const averageProgress =
        target.phases.length > 0
          ? target.phases.reduce((sum, phase) => {
              const phaseProgress =
                phase.actions.length > 0
                  ? phase.actions.reduce((s, a) => s + a.progressPercent, 0) /
                    phase.actions.length
                  : 0;
              return sum + phaseProgress;
            }, 0) / target.phases.length
          : 0;

      // Calculate achieved cost based on completed action savings
      const totalSavingsAchieved = target.phases.reduce(
        (sum, phase) =>
          sum +
          phase.actions
            .filter((a) => a.status === "COMPLETED_ACTION")
            .reduce((s, a) => s + a.annualSavings, 0),
        0
      );

      return {
        ...target,
        totalActions,
        completedActions,
        averageProgress: Math.round(averageProgress),
        achievedCost: target.currentCost - totalSavingsAchieved,
      };
    });

    return NextResponse.json(targetsWithProgress);
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/roadmap/targets" }
    );
    return NextResponse.json(
      { error: "Failed to fetch cost targets" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, _context, session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const { productId, name, currentCost, targetCost, targetDate } = body;

    if (!productId || !name || currentCost == null || targetCost == null || !targetDate) {
      return NextResponse.json(
        { error: "productId, name, currentCost, targetCost, and targetDate are required" },
        { status: 400 }
      );
    }

    const target = await prisma.costTarget.create({
      data: {
        productId,
        name,
        currentCost,
        targetCost,
        targetDate: new Date(targetDate),
        status: "DRAFT",
        createdById: session.user.id,
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
    });

    return NextResponse.json(target, { status: 201 });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "POST /api/cost-optimization/roadmap/targets" }
    );
    return NextResponse.json(
      { error: "Failed to create cost target" },
      { status: 500 }
    );
  }
});
