import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getOEEDashboard,
  calculateOEE,
  getOEETrend,
} from "@/lib/production/oee-calculator";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const workCenterId = searchParams.get("workCenterId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const trend = searchParams.get("trend") === "true";

    if (workCenterId) {
      if (trend) {
        const periods = parseInt(searchParams.get("periods") || "4");
        const periodType =
          (searchParams.get("periodType") as "day" | "week" | "month") || "week";
        const trendData = await getOEETrend(workCenterId, periods, periodType);
        return NextResponse.json(trendData);
      }

      const startDate = startDateStr
        ? new Date(startDateStr)
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            return d;
          })();
      const endDate = endDateStr ? new Date(endDateStr) : new Date();

      const oee = await calculateOEE(workCenterId, startDate, endDate);
      return NextResponse.json(oee);
    }

    // Return dashboard data
    const dashboard = await getOEEDashboard();
    return NextResponse.json(dashboard);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/production/oee' });
    return NextResponse.json(
      { error: "Failed to fetch OEE data" },
      { status: 500 }
    );
  }
});
