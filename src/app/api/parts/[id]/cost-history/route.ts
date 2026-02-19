import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const costHistoryBodySchema = z.object({
  effectiveDate: z.string().optional(),
  costType: z.string(),
  unitCost: z.number(),
  currency: z.string().optional(),
  supplierId: z.string().optional(),
  poNumber: z.string().optional(),
  notes: z.string().optional(),
  updatePartCost: z.boolean().optional(),
});

// GET - Get cost history for a part
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20") || 20, 100);

    const costHistory = await prisma.partCostHistory.findMany({
      where: { partId: id },
      orderBy: { effectiveDate: "desc" },
      take: limit,
    });

    return NextResponse.json(costHistory);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/parts/[id]/cost-history' });
    return NextResponse.json(
      { error: "Failed to fetch cost history" },
      { status: 500 }
    );
  }
});

// POST - Add cost history entry
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const rawBody = await request.json();
    const parseResult = costHistoryBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parseResult.data;

    const costEntry = await prisma.partCostHistory.create({
      data: {
        id: `COST-${Date.now()}`,
        partId: id,
        effectiveDate: data.effectiveDate
          ? new Date(data.effectiveDate)
          : new Date(),
        costType: data.costType,
        unitCost: data.unitCost,
        currency: data.currency || "USD",
        supplierId: data.supplierId,
        poNumber: data.poNumber,
        notes: data.notes,
        createdBy: session.user?.email || "system",
      },
    });

    // Optionally update part's current cost
    if (data.updatePartCost) {
      await prisma.part.update({
        where: { id },
        data: {
          costs: {
            deleteMany: {},
            create: {
              unitCost: data.unitCost,
              averageCost: data.unitCost,
            },
          },
          updatedBy: session.user?.email || "system",
        },
      });
    }

    return NextResponse.json(costEntry, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/parts/[id]/cost-history' });
    return NextResponse.json(
      { error: "Failed to create cost entry" },
      { status: 500 }
    );
  }
});
