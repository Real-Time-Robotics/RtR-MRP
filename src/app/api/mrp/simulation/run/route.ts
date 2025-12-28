import { NextRequest, NextResponse } from "next/server";
import { runSimulation } from "@/lib/mrp";

// POST /api/mrp/simulation/run - Run a simulation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { simulationId } = body;

    if (!simulationId) {
      return NextResponse.json(
        { error: "simulationId is required" },
        { status: 400 }
      );
    }

    const results = await runSimulation(simulationId);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Simulation run error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run simulation" },
      { status: 500 }
    );
  }
}
