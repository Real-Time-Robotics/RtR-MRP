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

    const action = await prisma.costReductionAction.findUnique({
      where: { id },
      include: {
        part: { select: { id: true, partNumber: true, name: true } },
        owner: { select: { id: true, name: true } },
        phase: {
          include: {
            costTarget: { select: { id: true, name: true } },
          },
        },
        savingsRecords: {
          orderBy: { periodStart: "desc" },
        },
      },
    });

    if (!action) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    return NextResponse.json(action);
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/roadmap/actions/[id]" }
    );
    return NextResponse.json(
      { error: "Failed to fetch action" },
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

    // Recalculate savings if costs change
    const updateData: Record<string, unknown> = {};

    if (body.description) updateData.description = body.description;
    if (body.type) updateData.type = body.type;
    if (body.partId !== undefined) updateData.partId = body.partId || null;
    if (body.riskLevel) updateData.riskLevel = body.riskLevel;
    if (body.riskNotes !== undefined) updateData.riskNotes = body.riskNotes;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status) updateData.status = body.status;
    if (body.progressPercent != null) updateData.progressPercent = body.progressPercent;
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.targetCompletionDate) updateData.targetCompletionDate = new Date(body.targetCompletionDate);
    if (body.actualCompletionDate !== undefined) {
      updateData.actualCompletionDate = body.actualCompletionDate
        ? new Date(body.actualCompletionDate)
        : null;
    }

    // Recalculate if cost fields changed
    if (body.currentCost != null || body.targetCost != null || body.annualVolume != null) {
      const existing = await prisma.costReductionAction.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Action not found" }, { status: 404 });
      }

      const currentCost = body.currentCost ?? existing.currentCost;
      const targetCost = body.targetCost ?? existing.targetCost;
      const annualVolume = body.annualVolume ?? existing.annualVolume;
      const investment = body.investmentRequired ?? existing.investmentRequired;

      const savingsPerUnit = currentCost - targetCost;
      const annualSavings = savingsPerUnit * annualVolume;
      const breakEvenUnits = savingsPerUnit > 0 ? Math.ceil(investment / savingsPerUnit) : 0;
      const roiMonths = annualVolume > 0 && savingsPerUnit > 0
        ? Math.ceil(investment / ((savingsPerUnit * annualVolume) / 12))
        : 0;

      updateData.currentCost = currentCost;
      updateData.targetCost = targetCost;
      updateData.savingsPerUnit = savingsPerUnit;
      updateData.annualVolume = annualVolume;
      updateData.annualSavings = annualSavings;
      updateData.investmentRequired = investment;
      updateData.breakEvenUnits = breakEvenUnits;
      updateData.roiMonths = roiMonths;
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
      { context: "PUT /api/cost-optimization/roadmap/actions/[id]" }
    );
    return NextResponse.json(
      { error: "Failed to update action" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, context, _session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;

    await prisma.costReductionAction.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "DELETE /api/cost-optimization/roadmap/actions/[id]" }
    );
    return NextResponse.json(
      { error: "Failed to delete action" },
      { status: 500 }
    );
  }
});
