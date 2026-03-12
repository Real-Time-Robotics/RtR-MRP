import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkWriteEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const POST = withAuth(async (request, _context, session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const {
      phaseId,
      type,
      partId,
      description,
      currentCost,
      targetCost,
      annualVolume,
      investmentRequired,
      targetCompletionDate,
      startDate,
      riskLevel,
      riskNotes,
      notes,
    } = body;

    if (!phaseId || !type || !description || currentCost == null || targetCost == null || !targetCompletionDate) {
      return NextResponse.json(
        { error: "phaseId, type, description, currentCost, targetCost, and targetCompletionDate are required" },
        { status: 400 }
      );
    }

    // Verify phase exists
    const phase = await prisma.costReductionPhase.findUnique({
      where: { id: phaseId },
    });
    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    const savingsPerUnit = currentCost - targetCost;
    const volume = annualVolume || 0;
    const annualSavings = savingsPerUnit * volume;
    const investment = investmentRequired || 0;
    const breakEvenUnits = savingsPerUnit > 0 ? Math.ceil(investment / savingsPerUnit) : 0;
    const roiMonths = volume > 0 && savingsPerUnit > 0
      ? Math.ceil(investment / ((savingsPerUnit * volume) / 12))
      : 0;

    const action = await prisma.costReductionAction.create({
      data: {
        phaseId,
        type,
        partId: partId || null,
        description,
        currentCost,
        targetCost,
        savingsPerUnit,
        annualVolume: volume,
        annualSavings,
        investmentRequired: investment,
        breakEvenUnits,
        roiMonths,
        startDate: startDate ? new Date(startDate) : null,
        targetCompletionDate: new Date(targetCompletionDate),
        status: "IDEA",
        progressPercent: 0,
        riskLevel: riskLevel || "LOW",
        riskNotes: riskNotes || null,
        notes: notes || null,
        ownerId: session.user.id,
      },
      include: {
        part: { select: { id: true, partNumber: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "POST /api/cost-optimization/roadmap/actions" }
    );
    return NextResponse.json(
      { error: "Failed to create action" },
      { status: 500 }
    );
  }
});
