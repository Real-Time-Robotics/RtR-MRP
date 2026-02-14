import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from '@/lib/logger';

// GET - Get equipment by ID with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        workCenter: {
          select: { id: true, code: true, name: true, type: true },
        },
        maintenanceSchedules: {
          where: { isActive: true },
          orderBy: { nextDueDate: "asc" },
          take: 5,
        },
        maintenanceOrders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            type: true,
            status: true,
            priority: true,
            plannedStartDate: true,
            actualStartDate: true,
            actualEndDate: true,
          },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    return NextResponse.json(equipment);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/equipment/[id]' });
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }
}

// PUT - Update equipment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const equipment = await prisma.equipment.update({
      where: { id },
      data: {
        ...body,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
        installDate: body.installDate ? new Date(body.installDate) : undefined,
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : undefined,
        lastMaintenanceDate: body.lastMaintenanceDate ? new Date(body.lastMaintenanceDate) : undefined,
        nextMaintenanceDate: body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate) : undefined,
      },
      include: {
        workCenter: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/equipment/[id]' });
    return NextResponse.json(
      { error: "Failed to update equipment" },
      { status: 500 }
    );
  }
}

// DELETE - Delete equipment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.equipment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/equipment/[id]' });
    return NextResponse.json(
      { error: "Failed to delete equipment" },
      { status: 500 }
    );
  }
}

// PATCH - Update OEE metrics
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { availability, performance, quality } = body;

    // Calculate OEE = Availability × Performance × Quality
    const currentOee = (availability / 100) * (performance / 100) * (quality / 100) * 100;

    const equipment = await prisma.equipment.update({
      where: { id },
      data: {
        availability,
        performance,
        quality,
        currentOee,
        lastOeeUpdate: new Date(),
      },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/equipment/[id]' });
    return NextResponse.json(
      { error: "Failed to update OEE" },
      { status: 500 }
    );
  }
}
