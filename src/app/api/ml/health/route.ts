import { NextRequest } from 'next/server';
// src/app/api/ml/health/route.ts

import { NextResponse } from "next/server";
import { mlClient } from "@/lib/ml-client";
import { logger } from '@/lib/logger';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
export async function GET(request: NextRequest) {
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
    const health = await mlClient.healthCheck();
    return NextResponse.json(health);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { route: 'ml/health' });
    // ML Service is optional - return offline status without error
    return NextResponse.json({
      status: "offline",
      service: "rtr-ml-service",
      message: "ML Service not configured (optional)",
      features: {
        forecasting: false,
        leadTimePrediction: false,
        supplierRisk: false,
      },
    });
  }
}
