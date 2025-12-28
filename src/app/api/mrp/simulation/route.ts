import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSimulation, getSimulation, deleteSimulation } from "@/lib/mrp";

// GET /api/mrp/simulation - Get simulations
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    if (id) {
      const simulation = await getSimulation(id);
      if (!simulation) {
        return NextResponse.json(
          { error: "Simulation not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(simulation);
    }

    // List simulations
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.simulationType = type;

    const simulations = await prisma.simulation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(simulations);
  } catch (error) {
    console.error("Simulation GET error:", error);
    return NextResponse.json(
      { error: "Failed to get simulations" },
      { status: 500 }
    );
  }
}

// POST /api/mrp/simulation - Create a new simulation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, simulationType, demandChanges, supplyChanges, leadTimeChanges, capacityChanges, dateRange, userId } = body;

    if (!name || !simulationType || !dateRange) {
      return NextResponse.json(
        { error: "name, simulationType, and dateRange are required" },
        { status: 400 }
      );
    }

    const simulationId = await createSimulation(
      {
        name,
        description,
        simulationType,
        demandChanges,
        supplyChanges,
        leadTimeChanges,
        capacityChanges,
        dateRange: {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end),
        },
      },
      userId || "system"
    );

    return NextResponse.json({
      success: true,
      simulationId,
    });
  } catch (error) {
    console.error("Simulation POST error:", error);
    return NextResponse.json(
      { error: "Failed to create simulation" },
      { status: 500 }
    );
  }
}

// DELETE /api/mrp/simulation - Delete a simulation
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await deleteSimulation(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Simulation DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete simulation" },
      { status: 500 }
    );
  }
}
