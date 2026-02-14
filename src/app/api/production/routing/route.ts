import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  generateRoutingNumber,
  calculateRoutingTotals,
} from "@/lib/production/routing-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (productId) where.productId = productId;
    if (status) where.status = status;

    const routings = await prisma.routing.findMany({
      where,
      include: {
        product: {
          select: { sku: true, name: true },
        },
        _count: { select: { operations: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(routings);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/production/routing' });
    return NextResponse.json(
      { error: "Failed to fetch routings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const routingNumber = await generateRoutingNumber();

    const routing = await prisma.routing.create({
      data: {
        routingNumber,
        name: body.name,
        description: body.description,
        productId: body.productId,
        version: body.version || 1,
        status: "draft",
        createdBy: body.createdBy || "system",
      },
    });

    // Create operations if provided
    if (body.operations && body.operations.length > 0) {
      for (const op of body.operations) {
        await prisma.routingOperation.create({
          data: {
            routingId: routing.id,
            operationNumber: op.operationNumber,
            name: op.name,
            description: op.description,
            workCenterId: op.workCenterId,
            setupTime: op.setupTime || 0,
            runTimePerUnit: op.runTimePerUnit,
            waitTime: op.waitTime || 0,
            moveTime: op.moveTime || 0,
            laborTimePerUnit: op.laborTimePerUnit,
            operatorsRequired: op.operatorsRequired || 1,
            skillRequired: op.skillRequired,
            overlapPercent: op.overlapPercent || 0,
            canRunParallel: op.canRunParallel || false,
            inspectionRequired: op.inspectionRequired || false,
            inspectionPlanId: op.inspectionPlanId,
            workInstructions: op.workInstructions,
            toolsRequired: op.toolsRequired,
          },
        });
      }

      // Calculate totals
      const totals = await calculateRoutingTotals(routing.id);
      await prisma.routing.update({
        where: { id: routing.id },
        data: totals,
      });
    }

    return NextResponse.json(routing, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/production/routing' });
    return NextResponse.json(
      { error: "Failed to create routing" },
      { status: 500 }
    );
  }
}
