import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateATP } from "@/lib/mrp";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';

const ctpBatchBodySchema = z.object({
  items: z.array(z.object({
    partId: z.string(),
    quantity: z.number(),
    requiredDate: z.union([z.string(), z.date()]),
    siteId: z.string().optional(),
  })),
});

// GET /api/mrp/atp/ctp - Calculate CTP (Capable to Promise) for a part
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const searchParams = request.nextUrl.searchParams;
    const partId = searchParams.get("partId");
    const quantity = parseFloat(searchParams.get("quantity") || "1");
    const date = searchParams.get("date")
      ? new Date(searchParams.get("date")!)
      : new Date();
    const siteId = searchParams.get("siteId") || undefined;

    if (!partId) {
      return NextResponse.json(
        { error: "partId is required" },
        { status: 400 }
      );
    }

    // Calculate ATP which includes CTP details
    const result = await calculateATP(partId, quantity, date, siteId);

    // Return CTP-focused response
    return NextResponse.json({
      partId: result.partId,
      partNumber: result.partNumber,
      requestedQty: result.requestedQty,
      requestedDate: result.requestedDate,
      atpQty: result.atpQty,
      atpDate: result.atpDate,
      ctpQty: result.ctpQty,
      ctpDate: result.ctpDate,
      canFulfill: result.atpQty + result.ctpQty >= result.requestedQty,
      ctpDetails: result.ctpDetails,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/mrp/atp/ctp' });
    return NextResponse.json(
      { error: "Failed to calculate CTP" },
      { status: 500 }
    );
  }
});

// POST /api/mrp/atp/ctp - Batch CTP check
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const rawBody = await request.json();
    const parseResult = ctpBatchBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { items } = parseResult.data;

    const results = [];

    for (const item of items) {
      const result = await calculateATP(
        item.partId,
        item.quantity,
        new Date(item.requiredDate),
        item.siteId
      );

      results.push({
        partId: result.partId,
        partNumber: result.partNumber,
        requestedQty: result.requestedQty,
        canFulfill: result.atpQty + result.ctpQty >= result.requestedQty,
        atpQty: result.atpQty,
        atpDate: result.atpDate,
        ctpQty: result.ctpQty,
        ctpDate: result.ctpDate,
        ctpDetails: result.ctpDetails,
      });
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/mrp/atp/ctp' });
    return NextResponse.json(
      { error: "Failed to check batch CTP" },
      { status: 500 }
    );
  }
});
