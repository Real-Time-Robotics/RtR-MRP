// src/app/api/ml/leadtime/route.ts

import { NextRequest, NextResponse } from "next/server";
import { mlClient } from "@/lib/ml-client";
import { z } from 'zod';
import { logger } from '@/lib/logger';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const bodySchema = z.object({
      supplierId: z.string(),
      orderValue: z.number().optional(),
      lineCount: z.number().optional(),
      totalQuantity: z.number().optional(),
      isCritical: z.boolean().optional(),
      partCategory: z.string().optional(),
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

    const result = await mlClient.predictLeadTime({
      supplierId: body.supplierId,
      orderValue: body.orderValue,
      lineCount: body.lineCount,
      totalQuantity: body.totalQuantity,
      isCritical: body.isCritical,
      partCategory: body.partCategory,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { route: 'ml/leadtime' });
    return NextResponse.json(
      { error: "Failed to predict lead time" },
      { status: 500 }
    );
  }
});
