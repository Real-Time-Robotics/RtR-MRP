import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import { getQualityDashboardStats } from "@/lib/quality/quality-metrics";
import { logger } from "@/lib/logger";
import { withAuth } from '@/lib/api/with-auth';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const stats = await getQualityDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/quality' });
    return NextResponse.json(
      { error: "Failed to fetch quality stats" },
      { status: 500 }
    );
  }
});
