import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkReadEndpointLimit, checkWriteEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { assessRisk } from "@/lib/cost-optimization/compatibility";

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
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { originalPart: { partNumber: { contains: search, mode: "insensitive" } } },
        { substitutePart: { partNumber: { contains: search, mode: "insensitive" } } },
        { originalPart: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [evaluations, total] = await Promise.all([
      prisma.substituteEvaluation.findMany({
        where,
        include: {
          originalPart: {
            select: { id: true, partNumber: true, name: true, category: true, unitCost: true },
          },
          substitutePart: {
            select: { id: true, partNumber: true, name: true, category: true, unitCost: true, ndaaCompliant: true },
          },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.substituteEvaluation.count({ where }),
    ]);

    return NextResponse.json({
      data: evaluations,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/substitutes" }
    );
    return NextResponse.json({ error: "Failed to fetch evaluations" }, { status: 500 });
  }
});

export const POST = withAuth(async (request, _context, session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const {
      originalPartId,
      substitutePartId,
      specsComparison,
      compatibilityScore,
    } = body;

    if (!originalPartId || !substitutePartId) {
      return NextResponse.json(
        { error: "originalPartId and substitutePartId are required" },
        { status: 400 }
      );
    }

    // Get parts for pricing
    const [originalPart, substitutePart] = await Promise.all([
      prisma.part.findUnique({
        where: { id: originalPartId },
        select: { unitCost: true, ndaaCompliant: true, leadTimeDays: true },
      }),
      prisma.part.findUnique({
        where: { id: substitutePartId },
        select: { unitCost: true, ndaaCompliant: true, leadTimeDays: true },
      }),
    ]);

    if (!originalPart || !substitutePart) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    const originalPrice = originalPart.unitCost || 0;
    const substitutePrice = substitutePart.unitCost || 0;
    const savingsPercent =
      originalPrice > 0
        ? ((originalPrice - substitutePrice) / originalPrice) * 100
        : 0;

    const finalCompatibilityScore = compatibilityScore ?? 80;

    // Assess risk
    const risk = assessRisk(
      {
        overallScore: finalCompatibilityScore,
        specsComparison: specsComparison || [],
        criticalIssues: [],
        warnings: [],
        recommendation: finalCompatibilityScore >= 90 ? "recommended" : "acceptable",
      },
      substitutePart.ndaaCompliant,
      7,
      substitutePart.leadTimeDays
    );

    const evaluation = await prisma.substituteEvaluation.create({
      data: {
        originalPartId,
        substitutePartId,
        originalPrice,
        substitutePrice,
        savingsPercent: Math.round(savingsPercent * 100) / 100,
        compatibilityScore: finalCompatibilityScore,
        specsComparisonJson: specsComparison || null,
        ndaaCompliant: substitutePart.ndaaCompliant,
        itarCompliant: false,
        riskLevel: risk.level,
        riskFactors: risk.factors,
        status: "IDENTIFIED",
        createdById: session.user.id,
      },
      include: {
        originalPart: {
          select: { id: true, partNumber: true, name: true },
        },
        substitutePart: {
          select: { id: true, partNumber: true, name: true },
        },
      },
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "POST /api/cost-optimization/substitutes" }
    );
    return NextResponse.json({ error: "Failed to create evaluation" }, { status: 500 });
  }
});
