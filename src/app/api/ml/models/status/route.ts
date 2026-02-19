import { NextRequest } from 'next/server';
// src/app/api/ml/models/status/route.ts

import { NextResponse } from "next/server";
import { mlClient } from "@/lib/ml-client";
import { logger } from '@/lib/logger';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';
export const GET = withAuth(async (request, context, session) => {
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
const status = await mlClient.getModelStatus();
    return NextResponse.json(status);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { route: 'ml/models/status' });
    // Return default model status if ML service is unavailable
    return NextResponse.json({
      models: [
        {
          modelId: "ensemble_demand",
          modelType: "ensemble",
          status: "pending",
          lastTrained: null,
          metrics: {},
        },
        {
          modelId: "leadtime_predictor",
          modelType: "leadtime",
          status: "pending",
          lastTrained: null,
          metrics: {},
        },
        {
          modelId: "anomaly_detector",
          modelType: "anomaly",
          status: "pending",
          lastTrained: null,
          metrics: {},
        },
      ],
      total: 3,
      active: 0,
      mlServiceAvailable: false,
      error: "ML Service unavailable",
    });
  }
});
