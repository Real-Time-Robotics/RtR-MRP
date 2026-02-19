// src/app/api/finance/costing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { withRoleAuth } from '@/lib/api/with-auth';
import { prisma } from "@/lib/prisma";
import {
  runFullCostRollup,
  getRollupStatus,
  rollupPartCost,
  saveRollupResults,
} from "@/lib/finance";
import { logger } from "@/lib/logger";
import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// GET - Get cost rollup status and data
export const GET = withRoleAuth(['admin', 'manager'], async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
// Role-based access control: Finance routes require ADMIN or MANAGER

    const { searchParams } = new URL(request.url);
    const partId = searchParams.get("partId");
    const action = searchParams.get("action");

    // Get rollup status summary
    if (action === "status") {
      const status = await getRollupStatus();
      return NextResponse.json(status);
    }

    // Get cost rollup for specific part
    if (partId) {
      const rollup = await prisma.partCostRollup.findUnique({
        where: { partId },
        include: {
          part: {
            select: { partNumber: true, name: true },
          },
        },
      });

      if (!rollup) {
        return NextResponse.json(
          { error: "Cost rollup not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(rollup);
    }

    // Get all cost rollups with pagination
    const params = parsePaginationParams(request);
    const startTime = Date.now();

    const [totalCount, rollups] = await Promise.all([
      prisma.partCostRollup.count(),
      prisma.partCostRollup.findMany({
        ...buildOffsetPaginationQuery(params),
        include: {
          part: {
            select: { partNumber: true, name: true, category: true },
          },
        },
        orderBy: { part: { partNumber: "asc" } },
      }),
    ]);

    return paginatedSuccess(
      buildPaginatedResponse(rollups, totalCount, params, startTime)
    );
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/finance/costing' });
    return paginatedError("Failed to get costing data", 500);
  }
});

// POST - Run cost rollup
export const POST = withRoleAuth(['admin', 'manager'], async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
// Role-based access control: Finance routes require ADMIN or MANAGER

    const bodySchema = z.object({
      partId: z.string().optional(),
      runAll: z.boolean().optional(),
    });

    const rawBody = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const { partId, runAll } = body;

    if (runAll) {
      // Run full cost rollup
      const result = await runFullCostRollup();
      return NextResponse.json({
        success: true,
        message: `Processed ${result.processed} parts`,
        processed: result.processed,
        errors: result.errors,
      });
    }

    if (partId) {
      // Run rollup for specific part
      const result = await rollupPartCost(partId);
      await saveRollupResults(result);
      return NextResponse.json({
        success: true,
        partNumber: result.partNumber,
        costs: result.costs,
      });
    }

    return NextResponse.json(
      { error: "partId or runAll is required" },
      { status: 400 }
    );
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/finance/costing' });
    return NextResponse.json(
      { error: "Failed to run cost rollup" },
      { status: 500 }
    );
  }
});
