import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { compareSimulations } from "@/lib/mrp";
import { logger } from "@/lib/logger";

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';

const compareBodySchema = z.object({
  simulationIds: z.array(z.string()).min(2),
});

// POST /api/mrp/simulation/compare - Compare multiple simulations
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const rawBody = await request.json();
    const parseResult = compareBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { simulationIds } = parseResult.data;

    const comparison = await compareSimulations(simulationIds);

    return NextResponse.json({
      success: true,
      comparison,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/mrp/simulation/compare' });
    return NextResponse.json(
      { error: "Failed to compare simulations" },
      { status: 500 }
    );
  }
});
