// src/app/api/ml/forecast/route.ts

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
      partId: z.string(),
      horizonDays: z.number().optional(),
      modelType: z.enum(['prophet', 'arima', 'ets', 'ensemble']).optional(),
      retrain: z.boolean().optional(),
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

    const result = await mlClient.forecastDemand({
      partId: body.partId,
      horizonDays: body.horizonDays,
      modelType: body.modelType,
      retrain: body.retrain,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { route: 'ml/forecast' });
    return NextResponse.json(
      { error: "Failed to generate forecast" },
      { status: 500 }
    );
  }
});
