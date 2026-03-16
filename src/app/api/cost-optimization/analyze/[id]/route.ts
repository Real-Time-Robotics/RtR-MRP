import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkReadEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (request, context, _session) => {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;

    const target = await prisma.costTarget.findUnique({
      where: { id },
      include: {
        phases: {
          include: {
            actions: {
              include: {
                part: { select: { partNumber: true, name: true } },
              },
              orderBy: { annualSavings: "desc" },
            },
          },
          orderBy: { targetDate: "asc" },
        },
      },
    });

    if (!target) {
      return NextResponse.json({ error: "Analysis run not found" }, { status: 404 });
    }

    // Fetch MakeVsBuy analyses created after this target
    const makeVsBuyDetails = await prisma.makeVsBuyAnalysis.findMany({
      where: {
        createdAt: { gte: target.createdAt },
      },
      include: {
        part: { select: { partNumber: true, name: true } },
      },
      orderBy: { annualSavings: "desc" },
      take: 50,
    });

    // Fetch Substitute evaluations created after this target
    const substituteDetails = await prisma.substituteEvaluation.findMany({
      where: {
        createdAt: { gte: target.createdAt },
      },
      include: {
        originalPart: { select: { partNumber: true, name: true } },
        substitutePart: { select: { partNumber: true, name: true } },
      },
      orderBy: { savingsPercent: "desc" },
      take: 50,
    });

    const phases = target.phases.map((phase) => ({
      name: phase.name,
      actions: phase.actions.map((action) => ({
        id: action.id,
        type: action.type,
        description: action.description,
        partNumber: action.part?.partNumber ?? null,
        partName: action.part?.name ?? null,
        currentCost: action.currentCost,
        targetCost: action.targetCost,
        savingsPerUnit: action.savingsPerUnit,
        annualSavings: action.annualSavings,
        riskLevel: action.riskLevel,
      })),
    }));

    return NextResponse.json({
      id: target.id,
      name: target.name,
      createdAt: target.createdAt,
      currentCost: target.currentCost,
      targetCost: target.targetCost,
      phases,
      makeVsBuyDetails: makeVsBuyDetails.map((m) => ({
        partNumber: m.part.partNumber,
        partName: m.part.name,
        buyPrice: m.buyPrice,
        makeCostEstimate: m.makeCostEstimate,
        savingsPerUnit: m.savingsPerUnit,
        annualSavings: m.annualSavings,
        overallScore: m.overallScore,
        recommendation: m.recommendation,
        rationale: m.recommendationRationale,
        breakEvenMonths: m.breakEvenMonths,
        investmentRequired: m.makeInvestmentRequired,
      })),
      substituteDetails: substituteDetails.map((s) => ({
        originalPartNumber: s.originalPart.partNumber,
        originalPartName: s.originalPart.name,
        substitutePartNumber: s.substitutePart.partNumber,
        substitutePartName: s.substitutePart.name,
        originalPrice: s.originalPrice,
        substitutePrice: s.substitutePrice,
        savingsPercent: s.savingsPercent,
        compatibilityScore: s.compatibilityScore,
        riskLevel: s.riskLevel,
      })),
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/analyze/[id]" }
    );
    return NextResponse.json(
      { error: "Failed to fetch analysis detail" },
      { status: 500 }
    );
  }
});
