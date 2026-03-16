import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { checkReadEndpointLimit, checkWriteEndpointLimit } from "@/lib/rate-limit";
import { runCostAnalysis, type AnalysisType } from "@/lib/cost-optimization/cost-analysis-engine";
import { logger } from "@/lib/logger";

// In-memory rate limit (same pattern as MRP)
const analysisRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkAnalysisRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 3600 * 1000; // 1 hour
  const limit = 5;

  const record = analysisRateLimitMap.get(userId);

  if (!record || now > record.resetAt) {
    analysisRateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count };
}

const analyzeBodySchema = z.object({
  productIds: z.array(z.string()).optional(),
  analysisTypes: z.array(
    z.enum(["BOM_ROLLUP", "MAKE_VS_BUY", "SUBSTITUTES", "SUPPLIER_CONSOLIDATION"])
  ),
  clearPrevious: z.boolean().default(true),
});

// GET — List past analysis runs (CostTarget records starting with "Cost Analysis")
export const GET = withAuth(async (request, context, session) => {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const runs = await prisma.costTarget.findMany({
      where: {
        name: { startsWith: "Cost Analysis" },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        product: { select: { name: true } },
        phases: {
          include: {
            _count: { select: { actions: true } },
            actions: {
              select: {
                type: true,
                annualSavings: true,
                status: true,
              },
            },
          },
        },
      },
    });

    // Transform to summary format
    const summary = runs.map((run) => {
      const allActions = run.phases.flatMap((p) => p.actions);
      const makeVsBuyCount = allActions.filter((a) => a.type === "MAKE_VS_BUY").length;
      const substituteCount = allActions.filter((a) => a.type === "SUBSTITUTE").length;
      const supplierCount = allActions.filter((a) => a.type === "SUPPLIER_OPTIMIZE").length;
      const totalSavings = allActions.reduce((sum, a) => sum + a.annualSavings, 0);

      return {
        id: run.id,
        name: run.name,
        status: run.status,
        createdAt: run.createdAt,
        currentCost: run.currentCost,
        targetCost: run.targetCost,
        productName: run.product.name,
        phasesCount: run.phases.length,
        actionsCount: allActions.length,
        makeVsBuyCount,
        substituteCount,
        supplierCount,
        totalSavings: Math.round(totalSavings * 100) / 100,
      };
    });

    return NextResponse.json(summary);
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/analyze" }
    );
    return NextResponse.json(
      { error: "Failed to fetch analysis runs" },
      { status: 500 }
    );
  }
});

// POST — Run new cost analysis
export const POST = withAuth(async (request, context, session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const rateLimit = checkAnalysisRateLimit(session.user.id || "anonymous");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many analysis requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const rawBody = await request.json();
    const parseResult = analyzeBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { productIds, analysisTypes, clearPrevious } = parseResult.data;

    logger.info("[CostAnalysis API] Starting analysis...", { analysisTypes });

    const result = await runCostAnalysis({
      productIds,
      analysisTypes: analysisTypes as AnalysisType[],
      clearPrevious,
      userId: session.user.id,
    });

    logger.info("[CostAnalysis API] Analysis completed", {
      costTargetId: result.costTargetId,
      duration: result.duration,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "POST /api/cost-optimization/analyze" }
    );
    return NextResponse.json(
      { error: "Failed to run cost analysis" },
      { status: 500 }
    );
  }
});
