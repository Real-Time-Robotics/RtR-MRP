import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getForwardTraceability,
  getBackwardTraceability,
  getLotSummary,
} from "@/lib/quality/traceability-engine";
import { withAuth } from '@/lib/api/with-auth';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { lotNumber } = await context.params;
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get("direction") || "forward";

    const summary = await getLotSummary(lotNumber);

    if (!summary) {
      return NextResponse.json({ error: "Lot not found" }, { status: 404 });
    }

    let traceability = null;
    if (direction === "forward") {
      traceability = await getForwardTraceability(lotNumber);
    } else if (direction === "backward") {
      traceability = await getBackwardTraceability(lotNumber);
    }

    return NextResponse.json({
      summary,
      traceability,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/quality/traceability/[lotNumber]' });
    return NextResponse.json(
      { error: "Failed to fetch traceability" },
      { status: 500 }
    );
  }
});
