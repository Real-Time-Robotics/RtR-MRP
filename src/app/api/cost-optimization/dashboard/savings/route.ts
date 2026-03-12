import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkReadEndpointLimit, checkWriteEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (request, _context, _session) => {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get("actionId");
    const source = searchParams.get("source");
    const verified = searchParams.get("verified");

    const where: Record<string, unknown> = {};
    if (actionId) where.actionId = actionId;
    if (source) where.source = source;
    if (verified !== null && verified !== undefined) {
      where.verified = verified === "true";
    }

    const records = await prisma.savingsRecord.findMany({
      where,
      include: {
        action: {
          select: { id: true, description: true, type: true },
        },
      },
      orderBy: { periodStart: "desc" },
    });

    return NextResponse.json(records);
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/dashboard/savings" }
    );
    return NextResponse.json(
      { error: "Failed to fetch savings records" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, _context, _session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const {
      actionId,
      source,
      partId,
      supplierId,
      description,
      savingsPerUnit,
      unitsAffected,
      periodStart,
      periodEnd,
    } = body;

    if (!source || !description || savingsPerUnit == null || unitsAffected == null || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "source, description, savingsPerUnit, unitsAffected, periodStart, and periodEnd are required" },
        { status: 400 }
      );
    }

    const totalSavings = savingsPerUnit * unitsAffected;

    const record = await prisma.savingsRecord.create({
      data: {
        actionId: actionId || null,
        source,
        partId: partId || null,
        supplierId: supplierId || null,
        description,
        savingsPerUnit,
        unitsAffected,
        totalSavings,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        verified: false,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "POST /api/cost-optimization/dashboard/savings" }
    );
    return NextResponse.json(
      { error: "Failed to create savings record" },
      { status: 500 }
    );
  }
});
