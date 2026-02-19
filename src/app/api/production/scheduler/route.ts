import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSchedule } from "@/lib/production/scheduling-engine";

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
    const workCenterIds = searchParams.get("workCenterIds")?.split(",");

    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const schedule = await getSchedule(startDate, endDate, workCenterIds);

    return NextResponse.json(schedule);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/production/scheduler' });
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
});
