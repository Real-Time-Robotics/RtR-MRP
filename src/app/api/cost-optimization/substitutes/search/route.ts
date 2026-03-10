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
    const originalPartId = searchParams.get("originalPartId");
    const maxPrice = searchParams.get("maxPrice");
    const ndaaOnly = searchParams.get("ndaaOnly") === "true";

    if (!originalPartId) {
      return NextResponse.json(
        { error: "originalPartId required" },
        { status: 400 }
      );
    }

    const originalPart = await prisma.part.findUnique({
      where: { id: originalPartId },
      select: {
        id: true,
        partNumber: true,
        name: true,
        category: true,
        unitCost: true,
        ndaaCompliant: true,
      },
    });

    if (!originalPart) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    // Find potential substitutes in same category
    const where: Record<string, unknown> = {
      id: { not: originalPartId },
    };

    if (originalPart.category) {
      where.category = originalPart.category;
    }

    if (maxPrice) {
      where.unitCost = { lte: parseFloat(maxPrice) };
    }

    if (ndaaOnly) {
      where.ndaaCompliant = true;
    }

    const potentialSubstitutes = await prisma.part.findMany({
      where,
      select: {
        id: true,
        partNumber: true,
        name: true,
        category: true,
        unitCost: true,
        ndaaCompliant: true,
        leadTimeDays: true,
        partSuppliers: {
          include: {
            supplier: {
              select: { id: true, name: true, rating: true },
            },
          },
          take: 1,
        },
      },
      orderBy: { unitCost: "asc" },
      take: 20,
    });

    const originalPrice = originalPart.unitCost || 0;

    const results = potentialSubstitutes.map((sub) => {
      const subPrice = sub.unitCost || 0;
      const savingsPercent =
        originalPrice > 0
          ? ((originalPrice - subPrice) / originalPrice) * 100
          : 0;

      // Category-based compatibility estimate
      const compatibilityScore =
        sub.category === originalPart.category ? 85 : 60;

      return {
        id: sub.id,
        partNumber: sub.partNumber,
        name: sub.name,
        category: sub.category,
        price: subPrice,
        savingsPercent: Math.round(savingsPercent),
        compatibilityScore,
        ndaaCompliant: sub.ndaaCompliant,
        leadTimeDays: sub.leadTimeDays,
        supplier: sub.partSuppliers[0]?.supplier || null,
      };
    });

    // Sort by weighted score (savings * compatibility)
    results.sort((a, b) => {
      const scoreA = a.savingsPercent * (a.compatibilityScore / 100);
      const scoreB = b.savingsPercent * (b.compatibilityScore / 100);
      return scoreB - scoreA;
    });

    return NextResponse.json({
      originalPart: {
        id: originalPart.id,
        partNumber: originalPart.partNumber,
        name: originalPart.name,
        price: originalPrice,
        category: originalPart.category,
      },
      substitutes: results,
      count: results.length,
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/substitutes/search" }
    );
    return NextResponse.json(
      { error: "Failed to search substitutes" },
      { status: 500 }
    );
  }
});
