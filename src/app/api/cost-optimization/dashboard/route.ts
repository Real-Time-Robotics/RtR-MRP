import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkReadEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (request, _context, _session) => {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    // Get verified savings records for the year
    const savingsRecords = await prisma.savingsRecord.findMany({
      where: {
        periodStart: { gte: startOfYear },
        periodEnd: { lte: endOfYear },
        verified: true,
      },
      include: {
        action: {
          include: {
            part: { select: { partNumber: true, name: true } },
            owner: { select: { name: true } },
          },
        },
      },
    });

    // Calculate YTD savings by source
    const savingsBySource: Record<string, number> = {};
    for (const record of savingsRecords) {
      const source = record.source;
      savingsBySource[source] = (savingsBySource[source] || 0) + record.totalSavings;
    }
    const ytdTotal = Object.values(savingsBySource).reduce((a, b) => a + b, 0);

    // Get completed actions as top contributors
    const completedActions = await prisma.costReductionAction.findMany({
      where: {
        status: "COMPLETED_ACTION",
      },
      include: {
        part: { select: { partNumber: true } },
        owner: { select: { name: true } },
      },
      orderBy: { annualSavings: "desc" },
      take: 10,
    });

    // Get in-progress actions
    const inProgressActions = await prisma.costReductionAction.findMany({
      where: {
        status: "IN_PROGRESS_ACTION",
      },
      include: {
        part: { select: { partNumber: true } },
      },
      orderBy: { annualSavings: "desc" },
    });

    // Pipeline savings (weighted by progress)
    const pipelineSavings = inProgressActions.reduce(
      (sum, a) => sum + a.annualSavings * (a.progressPercent / 100),
      0
    );

    // Monthly breakdown
    const monthlyData = [];
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

      const monthSavings = savingsRecords
        .filter((r) => {
          const start = new Date(r.periodStart);
          return start >= monthStart && start <= monthEnd;
        })
        .reduce((sum, r) => sum + r.totalSavings, 0);

      monthlyData.push({
        month: monthStart.toLocaleString("en-US", { month: "short" }),
        savings: monthSavings,
      });
    }

    // Get active cost targets for context
    const activeTargets = await prisma.costTarget.findMany({
      where: { status: { in: ["ACTIVE", "ON_TRACK", "AT_RISK"] } },
      select: { id: true, name: true, currentCost: true, targetCost: true },
    });

    // Calculate actual vs plan data
    // Plan: distribute total target savings evenly across 12 months
    const totalTargetSavings = activeTargets.reduce(
      (sum, t) => sum + (t.currentCost - t.targetCost),
      0
    );
    const monthlyPlan = totalTargetSavings > 0 ? totalTargetSavings / 12 : 0;

    const actualVsPlan = monthlyData.map((m) => ({
      month: m.month,
      actual: m.savings,
      plan: monthlyPlan,
    }));

    const totalActual = monthlyData.reduce((sum, m) => sum + m.savings, 0);
    const totalPlan = monthlyPlan * 12;

    return NextResponse.json({
      kpis: {
        ytdSavings: ytdTotal,
        inProgressActions: inProgressActions.length,
        pipelineSavings: Math.round(pipelineSavings),
        completedActions: completedActions.length,
        activeTargets: activeTargets.length,
      },
      savingsBySource: Object.entries(savingsBySource).map(([source, amount]) => ({
        source,
        amount,
        percent: ytdTotal > 0 ? (amount / ytdTotal) * 100 : 0,
      })),
      monthlyTrend: monthlyData,
      actualVsPlan: {
        data: actualVsPlan,
        totalActual,
        totalPlan,
      },
      topContributors: completedActions.map((a, index) => ({
        rank: index + 1,
        id: a.id,
        description: a.description,
        type: a.type,
        partNumber: a.part?.partNumber,
        annualSavings: a.annualSavings,
        status: a.status,
        ownerName: a.owner.name,
      })),
      inProgress: inProgressActions.map((a) => ({
        id: a.id,
        description: a.description,
        type: a.type,
        progressPercent: a.progressPercent,
        expectedSavings: a.annualSavings,
        partNumber: a.part?.partNumber,
      })),
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/dashboard" }
    );
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
});
