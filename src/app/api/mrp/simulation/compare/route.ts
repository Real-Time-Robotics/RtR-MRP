import { NextRequest, NextResponse } from "next/server";
import { compareSimulations } from "@/lib/mrp";

// POST /api/mrp/simulation/compare - Compare multiple simulations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { simulationIds } = body;

    if (!simulationIds || !Array.isArray(simulationIds) || simulationIds.length < 2) {
      return NextResponse.json(
        { error: "At least 2 simulationIds are required" },
        { status: 400 }
      );
    }

    const comparison = await compareSimulations(simulationIds);

    return NextResponse.json({
      success: true,
      comparison,
    });
  } catch (error) {
    console.error("Simulation compare error:", error);
    return NextResponse.json(
      { error: "Failed to compare simulations" },
      { status: 500 }
    );
  }
}
