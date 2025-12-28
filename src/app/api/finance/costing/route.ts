// src/app/api/finance/costing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  runFullCostRollup,
  getRollupStatus,
  rollupPartCost,
  saveRollupResults,
} from "@/lib/finance";

// GET - Get cost rollup status and data
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const partId = searchParams.get("partId");
    const action = searchParams.get("action");

    // Get rollup status summary
    if (action === "status") {
      const status = await getRollupStatus();
      return NextResponse.json(status);
    }

    // Get cost rollup for specific part
    if (partId) {
      const rollup = await prisma.partCostRollup.findUnique({
        where: { partId },
        include: {
          part: {
            select: { partNumber: true, name: true },
          },
        },
      });

      if (!rollup) {
        return NextResponse.json(
          { error: "Cost rollup not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(rollup);
    }

    // Get all cost rollups
    const rollups = await prisma.partCostRollup.findMany({
      include: {
        part: {
          select: { partNumber: true, name: true, category: true },
        },
      },
      orderBy: { part: { partNumber: "asc" } },
    });

    return NextResponse.json({ rollups });
  } catch (error) {
    console.error("Costing GET error:", error);
    return NextResponse.json(
      { error: "Failed to get costing data" },
      { status: 500 }
    );
  }
}

// POST - Run cost rollup
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { partId, runAll } = body;

    if (runAll) {
      // Run full cost rollup
      const result = await runFullCostRollup();
      return NextResponse.json({
        success: true,
        message: `Processed ${result.processed} parts`,
        processed: result.processed,
        errors: result.errors,
      });
    }

    if (partId) {
      // Run rollup for specific part
      const result = await rollupPartCost(partId);
      await saveRollupResults(result);
      return NextResponse.json({
        success: true,
        partNumber: result.partNumber,
        costs: result.costs,
      });
    }

    return NextResponse.json(
      { error: "partId or runAll is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Costing POST error:", error);
    return NextResponse.json(
      { error: "Failed to run cost rollup" },
      { status: 500 }
    );
  }
}
