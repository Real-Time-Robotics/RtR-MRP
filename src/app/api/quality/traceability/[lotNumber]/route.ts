import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getForwardTraceability,
  getBackwardTraceability,
  getLotSummary,
} from "@/lib/quality/traceability-engine";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lotNumber: string }> }
) {
  try {
    const { lotNumber } = await params;
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
}
