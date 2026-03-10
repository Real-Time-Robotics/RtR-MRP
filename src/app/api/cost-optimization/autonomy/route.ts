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
    const productId = searchParams.get("productId");

    // Get all parts with autonomy status
    const autonomyStatuses = await prisma.partAutonomyStatus.findMany({
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
      },
      orderBy: { updatedAt: "desc" },
    });

    // If productId specified, filter to parts in that product's BOM
    let filteredStatuses = autonomyStatuses;
    if (productId) {
      const bom = await prisma.bomHeader.findFirst({
        where: {
          productId,
          status: { in: ["active", "draft"] },
        },
        include: {
          bomLines: {
            select: { partId: true },
          },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      });

      if (bom) {
        const bomPartIds = new Set(bom.bomLines.map((l) => l.partId));
        filteredStatuses = autonomyStatuses.filter((s) =>
          bomPartIds.has(s.partId)
        );
      }
    }

    // Calculate summary
    const total = filteredStatuses.length;
    const byStatus = {
      MAKE: 0,
      IN_DEVELOPMENT: 0,
      EVALUATE: 0,
      BUY_STRATEGIC: 0,
      BUY_REQUIRED: 0,
    };

    let totalCost = 0;
    let makeCost = 0;

    for (const s of filteredStatuses) {
      byStatus[s.status]++;
      const cost = s.currentCost || 0;
      totalCost += cost;
      if (s.status === "MAKE" || s.status === "IN_DEVELOPMENT") {
        makeCost += cost;
      }
    }

    const autonomyPercent =
      total > 0
        ? ((byStatus.MAKE + byStatus.IN_DEVELOPMENT) / total) * 100
        : 0;

    const costAutonomyPercent =
      totalCost > 0 ? (makeCost / totalCost) * 100 : 0;

    const ndaaCompliantCount = filteredStatuses.filter(
      (s) => s.ndaaCompliant
    ).length;

    return NextResponse.json({
      summary: {
        totalParts: total,
        autonomyPercent: Math.round(autonomyPercent * 10) / 10,
        costAutonomyPercent: Math.round(costAutonomyPercent * 10) / 10,
        ndaaCompliantPercent:
          total > 0
            ? Math.round((ndaaCompliantCount / total) * 1000) / 10
            : 0,
        byStatus,
      },
      parts: filteredStatuses.map((s) => ({
        id: s.id,
        partId: s.partId,
        partNumber: s.part.partNumber,
        partName: s.part.name,
        category: s.part.category,
        status: s.status,
        currentSource: s.currentSource,
        currentCost: s.currentCost,
        currentLeadTimeDays: s.currentLeadTimeDays,
        makeCapabilityPercent: s.makeCapabilityPercent,
        makeTargetDate: s.makeTargetDate,
        makeCostEstimate: s.makeCostEstimate,
        rdProgressPercent: s.rdProgressPercent,
        rdBlockers: s.rdBlockers,
        ndaaCompliant: s.ndaaCompliant,
        itarControlled: s.itarControlled,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/autonomy" }
    );
    return NextResponse.json(
      { error: "Failed to fetch autonomy data" },
      { status: 500 }
    );
  }
});
