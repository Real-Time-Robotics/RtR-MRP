import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from '@/lib/logger';

// GET - Get maintenance order by ID
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

    const order = await prisma.maintenanceOrder.findUnique({
      where: { id },
      include: {
        equipment: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            status: true,
            workCenter: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        schedule: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Maintenance order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/maintenance/[id]' });
    return NextResponse.json(
      { error: "Failed to fetch maintenance order" },
      { status: 500 }
    );
  }
}

// PUT - Update maintenance order
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

    const order = await prisma.maintenanceOrder.update({
      where: { id },
      data: {
        ...body,
        plannedStartDate: body.plannedStartDate ? new Date(body.plannedStartDate) : undefined,
        plannedEndDate: body.plannedEndDate ? new Date(body.plannedEndDate) : undefined,
        actualStartDate: body.actualStartDate ? new Date(body.actualStartDate) : undefined,
        actualEndDate: body.actualEndDate ? new Date(body.actualEndDate) : undefined,
      },
      include: {
        equipment: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/maintenance/[id]' });
    return NextResponse.json(
      { error: "Failed to update maintenance order" },
      { status: 500 }
    );
  }
}

// PATCH - Update maintenance order status
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
    const { action, ...data } = body;

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case "start":
        updateData = {
          status: "in_progress",
          actualStartDate: new Date(),
        };
        break;

      case "complete":
        updateData = {
          status: "completed",
          actualEndDate: new Date(),
          actualDuration: data.actualDuration,
          workPerformed: data.workPerformed,
          partsUsed: data.partsUsed,
          findings: data.findings,
          recommendations: data.recommendations,
          laborCost: data.laborCost || 0,
          partsCost: data.partsCost || 0,
          externalCost: data.externalCost || 0,
          totalCost: (data.laborCost || 0) + (data.partsCost || 0) + (data.externalCost || 0),
          completedBy: session.user?.email,
        };
        break;

      case "cancel":
        updateData = {
          status: "cancelled",
        };
        break;

      case "waiting_parts":
        updateData = {
          status: "waiting_parts",
        };
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const order = await prisma.maintenanceOrder.update({
      where: { id },
      data: updateData,
      include: {
        equipment: true,
      },
    });

    // Update equipment status and maintenance dates if completed
    if (action === "complete") {
      await prisma.equipment.update({
        where: { id: order.equipmentId },
        data: {
          status: "operational",
          lastMaintenanceDate: new Date(),
          nextMaintenanceDate: order.equipment.maintenanceIntervalDays
            ? new Date(Date.now() + order.equipment.maintenanceIntervalDays * 24 * 60 * 60 * 1000)
            : null,
        },
      });

      // Update schedule if from PM
      if (order.scheduleId) {
        const schedule = await prisma.maintenanceSchedule.findUnique({
          where: { id: order.scheduleId },
        });

        if (schedule) {
          const nextDue = new Date();
          if (schedule.intervalUnit === "days") {
            nextDue.setDate(nextDue.getDate() + schedule.intervalValue);
          } else if (schedule.intervalUnit === "hours") {
            nextDue.setHours(nextDue.getHours() + schedule.intervalValue);
          }

          await prisma.maintenanceSchedule.update({
            where: { id: order.scheduleId },
            data: {
              lastExecutedAt: new Date(),
              nextDueDate: nextDue,
            },
          });
        }
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/maintenance/[id]' });
    return NextResponse.json(
      { error: "Failed to update maintenance order" },
      { status: 500 }
    );
  }
}

// DELETE - Delete maintenance order
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

    await prisma.maintenanceOrder.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/maintenance/[id]' });
    return NextResponse.json(
      { error: "Failed to delete maintenance order" },
      { status: 500 }
    );
  }
}
