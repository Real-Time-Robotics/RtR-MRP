import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { z } from "zod";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
const CapacityGenerateSchema = z.object({
  action: z.literal("generate"),
  workCenterId: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  adjustments: z.unknown().optional(),
});

const CapacityAdjustSchema = z.object({
  action: z.literal("adjust"),
  workCenterId: z.string().min(1, "Work center ID is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  adjustments: z.object({
    date: z.string().min(1, "Date is required"),
    shiftHours: z.number().optional(),
    holidayHours: z.number().optional(),
    notes: z.string().optional(),
  }),
});

const CapacityBodySchema = z.union([CapacityGenerateSchema, CapacityAdjustSchema]);

// GET - Get capacity data for work centers
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { searchParams } = new URL(request.url);
    const workCenterId = searchParams.get("workCenterId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const period = searchParams.get("period") || "week"; // week, month

    // Calculate date range
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate
      ? new Date(endDate)
      : period === "month"
      ? new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Build where clause
    const where: Record<string, unknown> = {
      date: {
        gte: start,
        lte: end,
      },
    };

    if (workCenterId) {
      where.workCenterId = workCenterId;
    }

    // Get capacity records
    const capacityRecords = await prisma.workCenterCapacity.findMany({
      where,
      orderBy: [{ workCenterId: "asc" }, { date: "asc" }],
      include: {
        workCenter: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            capacityPerDay: true,
          },
        },
      },
    });

    // Get work centers for summary
    const workCenters = await prisma.workCenter.findMany({
      where: workCenterId ? { id: workCenterId } : { status: "active" },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        capacityPerDay: true,
        efficiency: true,
      },
    });

    // Calculate summary per work center
    const summary = workCenters.map((wc) => {
      const records = capacityRecords.filter((r) => r.workCenterId === wc.id);
      const totalAvailable = records.reduce((sum, r) => sum + r.availableHours, 0);
      const totalScheduled = records.reduce((sum, r) => sum + r.scheduledHours, 0);
      const totalActual = records.reduce((sum, r) => sum + r.actualHours, 0);

      return {
        workCenter: wc,
        totalAvailable,
        totalScheduled,
        totalActual,
        utilization: totalAvailable > 0 ? (totalScheduled / totalAvailable) * 100 : 0,
        efficiency: totalScheduled > 0 ? (totalActual / totalScheduled) * 100 : 0,
        daysOverloaded: records.filter(
          (r) => r.utilization && r.utilization > 100
        ).length,
      };
    });

    return NextResponse.json({
      period: { start, end },
      records: capacityRecords,
      summary,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/capacity' });
    return NextResponse.json(
      { error: "Failed to fetch capacity data" },
      { status: 500 }
    );
  }
});

// POST - Generate or update capacity records
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const body = await request.json();

    const validation = CapacityBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    if (data.action === "generate") {
      // Generate capacity records for date range
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const workCenterId = data.workCenterId;

      const workCenters = workCenterId
        ? [await prisma.workCenter.findUnique({ where: { id: workCenterId } })]
        : await prisma.workCenter.findMany({ where: { status: "active" } });

      const records = [];

      for (const wc of workCenters) {
        if (!wc) continue;

        let current = new Date(start);
        while (current <= end) {
          const dayOfWeek = current.getDay();
          const workingDays = (wc.workingDays as number[]) || [1, 2, 3, 4, 5];

          if (workingDays.includes(dayOfWeek)) {
            // Calculate base hours from working hours
            const startHour = parseInt(wc.workingHoursStart.split(":")[0]);
            const endHour = parseInt(wc.workingHoursEnd.split(":")[0]);
            const breakHours = wc.breakMinutes / 60;
            const baseHours = endHour - startHour - breakHours;

            // Get maintenance scheduled for this day
            const maintenanceOrders = await prisma.maintenanceOrder.findMany({
              where: {
                equipment: { workCenterId: wc.id },
                status: { in: ["scheduled", "in_progress"] },
                plannedStartDate: {
                  gte: new Date(current.setHours(0, 0, 0, 0)),
                  lt: new Date(current.setHours(23, 59, 59, 999)),
                },
              },
            });

            const maintenanceHours = maintenanceOrders.reduce(
              (sum, mo) => sum + (mo.estimatedDuration || 0),
              0
            );

            // Get downtime for this day
            const downtimeRecords = await prisma.downtimeRecord.findMany({
              where: {
                workCenterId: wc.id,
                startTime: {
                  gte: new Date(current.setHours(0, 0, 0, 0)),
                  lt: new Date(current.setHours(23, 59, 59, 999)),
                },
              },
            });

            const downtimeHours =
              downtimeRecords.reduce(
                (sum, dt) => sum + (dt.durationMinutes || 0),
                0
              ) / 60;

            const availableHours = Math.max(
              0,
              baseHours * (wc.efficiency / 100) - maintenanceHours - downtimeHours
            );

            // Get scheduled work orders
            const scheduledOps = await prisma.workOrderOperation.findMany({
              where: {
                workCenterId: wc.id,
                status: { in: ["scheduled", "in_progress"] },
                scheduledStart: {
                  gte: new Date(current.setHours(0, 0, 0, 0)),
                  lt: new Date(current.setHours(23, 59, 59, 999)),
                },
              },
            });

            const scheduledHours = scheduledOps.reduce(
              (sum, op) => sum + (op.plannedRunTime + op.plannedSetupTime) / 60,
              0
            );

            const record = await prisma.workCenterCapacity.upsert({
              where: {
                workCenterId_date: {
                  workCenterId: wc.id,
                  date: new Date(current.toISOString().split("T")[0]),
                },
              },
              create: {
                workCenterId: wc.id,
                date: new Date(current.toISOString().split("T")[0]),
                baseCapacityHours: baseHours,
                maintenanceHours,
                downtimeHours,
                availableHours,
                scheduledHours,
                utilization:
                  availableHours > 0 ? (scheduledHours / availableHours) * 100 : 0,
              },
              update: {
                baseCapacityHours: baseHours,
                maintenanceHours,
                downtimeHours,
                availableHours,
                scheduledHours,
                utilization:
                  availableHours > 0 ? (scheduledHours / availableHours) * 100 : 0,
              },
            });

            records.push(record);
          }

          current.setDate(current.getDate() + 1);
        }
      }

      return NextResponse.json({
        message: `Generated ${records.length} capacity records`,
        records,
      });
    }

    if (data.action === "adjust") {
      // Manual capacity adjustment
      const { date, shiftHours, holidayHours, notes } = data.adjustments;
      const workCenterId = data.workCenterId;

      const record = await prisma.workCenterCapacity.update({
        where: {
          workCenterId_date: {
            workCenterId,
            date: new Date(date),
          },
        },
        data: {
          shiftHours: shiftHours !== undefined ? shiftHours : undefined,
          holidayHours: holidayHours !== undefined ? holidayHours : undefined,
          notes,
          isLocked: true,
        },
      });

      // Recalculate available hours
      const availableHours =
        record.baseCapacityHours -
        record.maintenanceHours -
        record.downtimeHours -
        record.holidayHours +
        record.shiftHours;

      await prisma.workCenterCapacity.update({
        where: { id: record.id },
        data: {
          availableHours,
          utilization:
            availableHours > 0 ? (record.scheduledHours / availableHours) * 100 : 0,
        },
      });

      return NextResponse.json({ message: "Capacity adjusted", record });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/capacity' });
    return NextResponse.json(
      { error: "Failed to process capacity request" },
      { status: 500 }
    );
  }
});
