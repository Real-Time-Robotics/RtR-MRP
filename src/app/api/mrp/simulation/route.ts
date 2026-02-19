import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSimulation, getSimulation, deleteSimulation } from "@/lib/mrp";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';

const simulationBodySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  simulationType: z.enum(["MRP", "CAPACITY", "DEMAND", "SUPPLY", "COMBINED"]),
  demandChanges: z.any().optional(),
  supplyChanges: z.any().optional(),
  leadTimeChanges: z.any().optional(),
  capacityChanges: z.any().optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  userId: z.string().optional(),
});

// GET /api/mrp/simulation - Get simulations
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/mrp/simulation' });
    return NextResponse.json(
      { error: "Failed to get simulations" },
      { status: 500 }
    );
  }
});

// POST /api/mrp/simulation - Create a new simulation
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const rawBody = await request.json();
    const parseResult = simulationBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { name, description, simulationType, demandChanges, supplyChanges, leadTimeChanges, capacityChanges, dateRange, userId } = parseResult.data;

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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/mrp/simulation' });
    return NextResponse.json(
      { error: "Failed to create simulation" },
      { status: 500 }
    );
  }
});

// DELETE /api/mrp/simulation - Delete a simulation
export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/mrp/simulation' });
    return NextResponse.json(
      { error: "Failed to delete simulation" },
      { status: 500 }
    );
  }
});
