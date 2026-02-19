import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getCapacitySummary } from "@/lib/production/capacity-engine";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startDate = startDateStr
      ? new Date(startDateStr)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() - d.getDay());
          d.setHours(0, 0, 0, 0);
          return d;
        })();

    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const summary = await getCapacitySummary(startDate, endDate);

    return NextResponse.json(summary);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/production/capacity' });
    return NextResponse.json(
      { error: "Failed to fetch capacity" },
      { status: 500 }
    );
  }
});
