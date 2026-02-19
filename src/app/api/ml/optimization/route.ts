// src/app/api/ml/optimization/route.ts

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
      type: z.string().optional(),
      partId: z.string().optional(),
      serviceLevel: z.number().optional(),
      leadTimeDays: z.number().optional(),
      method: z.enum(['standard', 'king', 'dynamic']).optional(),
      orderCost: z.number().optional(),
      holdingCostRate: z.number().optional(),
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
    const { type } = body;

    if (!body.partId) {
      return NextResponse.json(
        { success: false, error: 'partId is required' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case "safety-stock":
        result = await mlClient.calculateSafetyStock({
          partId: body.partId,
          serviceLevel: body.serviceLevel,
          leadTimeDays: body.leadTimeDays,
          method: body.method,
        });
        break;

      case "eoq":
        if (body.orderCost == null) {
          return NextResponse.json(
            { success: false, error: 'orderCost is required for EOQ calculation' },
            { status: 400 }
          );
        }
        result = await mlClient.calculateEOQ({
          partId: body.partId,
          orderCost: body.orderCost,
          holdingCostRate: body.holdingCostRate,
        });
        break;

      case "full":
      default:
        result = await mlClient.optimizeInventory({
          partId: body.partId,
          serviceLevel: body.serviceLevel,
          orderCost: body.orderCost,
          holdingCostRate: body.holdingCostRate,
        });
        break;
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { route: 'ml/optimization' });
    return NextResponse.json(
      { error: "Failed to perform optimization" },
      { status: 500 }
    );
  }
});
