import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { calculateRCCP } from "@/lib/production/capacity-engine";

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
    const periodType =
      (searchParams.get("periodType") as "day" | "week" | "month") || "week";
    const weeks = parseInt(searchParams.get("weeks") || "4");

    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(startDate.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);

    const rccp = await calculateRCCP(startDate, endDate, periodType);

    return NextResponse.json(rccp);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/production/capacity/rccp' });
    return NextResponse.json(
      { error: "Failed to calculate RCCP" },
      { status: 500 }
    );
  }
});
