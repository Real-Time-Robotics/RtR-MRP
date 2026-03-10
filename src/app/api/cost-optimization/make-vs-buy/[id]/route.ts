import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkReadEndpointLimit, checkWriteEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { calculateROI } from "@/lib/cost-optimization/roi-calculations";
import { calculateScore, ScoringInput } from "@/lib/cost-optimization/scoring";

export const GET = withAuth(async (request, context, _session) => {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    const analysis = await prisma.makeVsBuyAnalysis.findUnique({
      where: { id },
      include: {
        part: {
          select: {
            id: true,
            partNumber: true,
            name: true,
            category: true,
            makeOrBuy: true,
            unitCost: true,
            ndaaCompliant: true,
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(analysis);
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/make-vs-buy/[id]" }
    );
    return NextResponse.json(
      { error: "Failed to fetch analysis" },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request, context, session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.makeVsBuyAnalysis.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // If decision is being made
    if (body.decision) {
      const updated = await prisma.makeVsBuyAnalysis.update({
        where: { id },
        data: {
          decision: body.decision,
          decisionDate: new Date(),
          decisionById: session.user.id,
          status: "ANALYSIS_DECIDED",
        },
        include: {
          part: {
            select: { id: true, partNumber: true, name: true, category: true },
          },
        },
      });
      return NextResponse.json(updated);
    }

    // Recalculate ROI and scoring if financial data changed
    const buyPrice = body.buyPrice ?? existing.buyPrice;
    const makeCostEstimate = body.makeCostEstimate ?? existing.makeCostEstimate;
    const makeInvestmentRequired = body.makeInvestmentRequired ?? existing.makeInvestmentRequired;
    const annualVolumeEstimate = body.annualVolumeEstimate ?? existing.annualVolumeEstimate;

    const roi = calculateROI({
      buyPrice,
      makeCost: makeCostEstimate,
      investment: makeInvestmentRequired,
      annualVolume: annualVolumeEstimate,
    });

    const scoring = body.scoringInput
      ? calculateScore(body.scoringInput as ScoringInput)
      : calculateScore({
          savingsPercent: roi.savingsPercent,
          investmentRequired: makeInvestmentRequired,
          breakEvenMonths: roi.breakEvenMonths,
          volumeCertainty: 5,
          technicalSkillAvailable: 5,
          equipmentAvailable: 5,
          qualityCapability: 5,
          capacityAvailable: 5,
          supplyChainRiskReduction: 5,
          complianceBenefit: 5,
          leadTimeReduction: 5,
          ipProtection: 5,
        });

    const updated = await prisma.makeVsBuyAnalysis.update({
      where: { id },
      data: {
        buyPrice,
        buyMOQ: body.buyMOQ ?? existing.buyMOQ,
        buyLeadTimeDays: body.buyLeadTimeDays ?? existing.buyLeadTimeDays,
        buyRisks: body.buyRisks ?? existing.buyRisks,
        makeCostEstimate,
        makeInvestmentRequired,
        makeLeadTimeDays: body.makeLeadTimeDays ?? existing.makeLeadTimeDays,
        makeTimelineMonths: body.makeTimelineMonths ?? existing.makeTimelineMonths,
        makeCapabilityGapsJson: body.makeCapabilityGaps ?? existing.makeCapabilityGapsJson,
        annualVolumeEstimate,
        savingsPerUnit: roi.savingsPerUnit,
        annualSavings: roi.annualSavings,
        breakEvenUnits: roi.breakEvenUnits,
        breakEvenMonths: roi.breakEvenMonths,
        npv3Year: roi.npv3Year,
        financialScore: scoring.financialScore,
        capabilityScore: scoring.capabilityScore,
        strategicScore: scoring.strategicScore,
        overallScore: scoring.overallScore,
        recommendation: scoring.recommendation,
        recommendationRationale: scoring.rationale,
        conditions: scoring.conditions,
        status: body.status ?? existing.status,
      },
      include: {
        part: {
          select: { id: true, partNumber: true, name: true, category: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "PUT /api/cost-optimization/make-vs-buy/[id]" }
    );
    return NextResponse.json(
      { error: "Failed to update analysis" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, context, _session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    await prisma.makeVsBuyAnalysis.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "DELETE /api/cost-optimization/make-vs-buy/[id]" }
    );
    return NextResponse.json(
      { error: "Failed to delete analysis" },
      { status: 500 }
    );
  }
});
