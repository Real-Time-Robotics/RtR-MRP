import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateATP, checkBatchATP, updateATPRecords } from "@/lib/mrp";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';

const atpBatchBodySchema = z.object({
  items: z.array(z.object({
    partId: z.string(),
    quantity: z.number(),
    requiredDate: z.union([z.string(), z.date()]),
  })),
  saveRecords: z.boolean().optional(),
});

// GET /api/mrp/atp - Calculate ATP for a part
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
    const horizon = parseInt(searchParams.get("horizon") || "90");

    if (!partId) {
      return NextResponse.json(
        { error: "partId is required" },
        { status: 400 }
      );
    }

    const result = await calculateATP(partId, quantity, date, siteId, horizon);
    return NextResponse.json(result);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/mrp/atp' });
    return NextResponse.json(
      { error: "Failed to calculate ATP" },
      { status: 500 }
    );
  }
});

// POST /api/mrp/atp - Batch ATP check
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const rawBody = await request.json();
    const parseResult = atpBatchBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { items, saveRecords = false } = parseResult.data;

    // Parse dates in items
    const parsedItems = items.map((item: { partId: string; quantity: number; requiredDate: string | Date }) => ({
      partId: item.partId,
      quantity: item.quantity,
      requiredDate: new Date(item.requiredDate),
    }));

    const results = await checkBatchATP(parsedItems);

    // Optionally save ATP records for each part
    if (saveRecords) {
      for (const item of parsedItems) {
        const atp = await calculateATP(item.partId, item.quantity, item.requiredDate);
        await updateATPRecords(item.partId, atp.grid);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/mrp/atp' });
    return NextResponse.json(
      { error: "Failed to check batch ATP" },
      { status: 500 }
    );
  }
});
