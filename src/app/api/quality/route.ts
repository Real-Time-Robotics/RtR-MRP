import { NextResponse } from "next/server";
import { getQualityDashboardStats } from "@/lib/quality/quality-metrics";
import { logger } from "@/lib/logger";

export async function GET() {
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
}
