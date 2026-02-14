import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePegging, savePeggingRecords } from "@/lib/mrp";
import { logger } from "@/lib/logger";

// GET /api/mrp/pegging - Get pegging records or generate for a part
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const partId = searchParams.get("partId");
    const siteId = searchParams.get("siteId") || undefined;
    const horizon = parseInt(searchParams.get("horizon") || "90");
    const generate = searchParams.get("generate") === "true";

    if (partId && generate) {
      // Generate fresh pegging for a part
      const result = await generatePegging(partId, siteId, horizon);
      return NextResponse.json(result);
    }

    // Get existing pegging records
    const where: Record<string, unknown> = {};
    if (partId) where.demandPartId = partId;

    const records = await prisma.peggingRecord.findMany({
      where,
      orderBy: { demandDate: "asc" },
      take: 500,
    });

    return NextResponse.json(records);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/mrp/pegging' });
    return NextResponse.json(
      { error: "Failed to get pegging" },
      { status: 500 }
    );
  }
}

// POST /api/mrp/pegging - Generate and save pegging
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { partId, siteId, horizon = 90, mrpRunId } = body;

    if (!partId) {
      return NextResponse.json(
        { error: "partId is required" },
        { status: 400 }
      );
    }

    // Generate pegging
    const result = await generatePegging(partId, siteId, horizon);

    // Save to database
    await savePeggingRecords(partId, result.demands, result.supplies, mrpRunId);

    return NextResponse.json({
      success: true,
      pegging: result,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/mrp/pegging' });
    return NextResponse.json(
      { error: "Failed to generate pegging" },
      { status: 500 }
    );
  }
}
