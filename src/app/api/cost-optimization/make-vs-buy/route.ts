import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkReadEndpointLimit, checkWriteEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { calculateROI } from "@/lib/cost-optimization/roi-calculations";
import { calculateScore, ScoringInput } from "@/lib/cost-optimization/scoring";

export const GET = withAuth(async (request, _context, _session) => {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.part = {
        OR: [
          { partNumber: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [analyses, total] = await Promise.all([
      prisma.makeVsBuyAnalysis.findMany({
        where,
        include: {
          part: {
            select: {
              id: true,
              partNumber: true,
              name: true,
              category: true,
              makeOrBuy: true,
            },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.makeVsBuyAnalysis.count({ where }),
    ]);

    return NextResponse.json({
      data: analyses,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/make-vs-buy" }
    );
    return NextResponse.json(
      { error: "Failed to fetch analyses" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, _context, session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const {
      partId,
      buyPrice,
      buyMOQ,
      buyLeadTimeDays,
      buyRisks,
      makeCostEstimate,
      makeInvestmentRequired,
      makeLeadTimeDays,
      makeTimelineMonths,
      makeCapabilityGaps,
      annualVolumeEstimate,
      scoringInput,
    } = body;

    if (!partId || buyPrice == null || makeCostEstimate == null) {
      return NextResponse.json(
        { error: "partId, buyPrice, and makeCostEstimate are required" },
        { status: 400 }
      );
    }

    // Calculate ROI
    const roi = calculateROI({
      buyPrice,
      makeCost: makeCostEstimate,
      investment: makeInvestmentRequired || 0,
      annualVolume: annualVolumeEstimate || 0,
    });

    // Calculate scoring
    const scoring = scoringInput
      ? calculateScore(scoringInput as ScoringInput)
      : calculateScore({
          savingsPercent: roi.savingsPercent,
          investmentRequired: makeInvestmentRequired || 0,
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

    const analysis = await prisma.makeVsBuyAnalysis.create({
      data: {
        partId,
        buyPrice,
        buyMOQ: buyMOQ || 1,
        buyLeadTimeDays: buyLeadTimeDays || 0,
        buyRisks: buyRisks || [],
        makeCostEstimate,
        makeInvestmentRequired: makeInvestmentRequired || 0,
        makeLeadTimeDays: makeLeadTimeDays || 0,
        makeTimelineMonths: makeTimelineMonths || 0,
        makeCapabilityGapsJson: makeCapabilityGaps || null,
        savingsPerUnit: roi.savingsPerUnit,
        annualVolumeEstimate: annualVolumeEstimate || 0,
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
        status: "ANALYSIS_DRAFT",
        createdById: session.user.id,
      },
      include: {
        part: {
          select: {
            id: true,
            partNumber: true,
            name: true,
            category: true,
          },
        },
      },
    });

    return NextResponse.json(analysis, { status: 201 });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "POST /api/cost-optimization/make-vs-buy" }
    );
    return NextResponse.json(
      { error: "Failed to create analysis" },
      { status: 500 }
    );
  }
});
