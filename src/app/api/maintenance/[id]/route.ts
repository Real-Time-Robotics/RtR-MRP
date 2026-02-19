import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';

const maintenancePutSchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  description: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  actualStartDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  estimatedDuration: z.number().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
}).passthrough();

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// GET - Get maintenance order by ID
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;

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
});

// PUT - Update maintenance order
export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;
    const body = await request.json();
    const parsed = maintenancePutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const order = await prisma.maintenanceOrder.update({
      where: { id },
      data: {
        ...data,
        plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate) : undefined,
        plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate) : undefined,
        actualStartDate: data.actualStartDate ? new Date(data.actualStartDate) : undefined,
        actualEndDate: data.actualEndDate ? new Date(data.actualEndDate) : undefined,
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
});

// PATCH - Update maintenance order status
export const PATCH = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;
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
});

// DELETE - Delete maintenance order
export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;

    await prisma.maintenanceOrder.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/maintenance/[id]' });
    return NextResponse.json(
      { error: "Failed to delete maintenance order" },
      { status: 500 }
    );
  }
});
