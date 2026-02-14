import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  activateRouting,
  validateRouting,
  copyRouting,
} from "@/lib/production/routing-engine";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const routing = await prisma.routing.findUnique({
      where: { id },
      include: {
        product: true,
        operations: {
          orderBy: { operationNumber: "asc" },
          include: { workCenter: true },
        },
      },
    });

    if (!routing) {
      return NextResponse.json({ error: "Routing not found" }, { status: 404 });
    }

    return NextResponse.json(routing);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/production/routing/[id]' });
    return NextResponse.json(
      { error: "Failed to fetch routing" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const routing = await prisma.routing.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
      },
    });

    return NextResponse.json(routing);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/production/routing/[id]' });
    return NextResponse.json(
      { error: "Failed to update routing" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case "activate": {
        const validation = await validateRouting(id);
        if (!validation.valid) {
          return NextResponse.json(
            { error: "Routing validation failed", errors: validation.errors },
            { status: 400 }
          );
        }
        await activateRouting(id);
        return NextResponse.json({ success: true });
      }

      case "copy": {
        const newId = await copyRouting(id);
        return NextResponse.json({ id: newId });
      }

      case "validate": {
        const result = await validateRouting(id);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/production/routing/[id]' });
    return NextResponse.json(
      { error: "Failed to perform routing action" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.routing.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/production/routing/[id]' });
    return NextResponse.json(
      { error: "Failed to delete routing" },
      { status: 500 }
    );
  }
}
