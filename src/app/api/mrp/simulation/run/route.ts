import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runSimulation } from "@/lib/mrp";
import { logger } from "@/lib/logger";

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';

const simulationRunBodySchema = z.object({
  simulationId: z.string(),
});

// POST /api/mrp/simulation/run - Run a simulation
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
const rawBody = await request.json();
    const parseResult = simulationRunBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { simulationId } = parseResult.data;

    const results = await runSimulation(simulationId);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/mrp/simulation/run' });
    return NextResponse.json(
      { error: "Failed to run simulation" },
      { status: 500 }
    );
  }
});
