import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getWorkCenterUtilization } from "@/lib/production/capacity-engine";
import { z } from "zod";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';
const WorkCenterUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z.string().optional(),
  department: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  capacityType: z.string().optional(),
  capacityPerDay: z.number().optional(),
  capacityPerHour: z.number().optional().nullable(),
  efficiency: z.number().min(0).max(200).optional(),
  utilizationTarget: z.number().min(0).max(100).optional(),
  workingHoursStart: z.string().optional(),
  workingHoursEnd: z.string().optional(),
  breakMinutes: z.number().int().min(0).optional(),
  workingDays: z.array(z.number().int().min(0).max(6)).optional(),
  hourlyRate: z.number().optional().nullable(),
  setupCostPerHour: z.number().optional().nullable(),
  overheadRate: z.number().optional().nullable(),
  maxConcurrentJobs: z.number().int().min(1).optional(),
  requiresOperator: z.boolean().optional(),
  operatorSkillLevel: z.string().optional().nullable(),
  status: z.string().optional(),
  maintenanceInterval: z.number().optional().nullable(),
  nextMaintenanceDate: z.string().optional().nullable(),
});

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    const workCenter = await prisma.workCenter.findUnique({
      where: { id },
      include: {
        scheduledOps: {
          where: {
            scheduledEnd: { gte: new Date() },
          },
          include: {
            workOrderOperation: {
              include: { workOrder: true },
            },
          },
          orderBy: { scheduledStart: "asc" },
          take: 10,
        },
        downtimeRecords: {
          where: {
            endTime: null,
          },
          orderBy: { startTime: "desc" },
          take: 1,
        },
      },
    });

    if (!workCenter) {
      return NextResponse.json(
        { error: "Work center not found" },
        { status: 404 }
      );
    }

    // Get today's utilization
    const utilization = await getWorkCenterUtilization(id, new Date());

    return NextResponse.json({
      ...workCenter,
      todayUtilization: utilization,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/production/work-centers/[id]' });
    return NextResponse.json(
      { error: "Failed to fetch work center" },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const validation = WorkCenterUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const workCenter = await prisma.workCenter.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        department: data.department,
        location: data.location,
        capacityType: data.capacityType,
        capacityPerDay: data.capacityPerDay,
        capacityPerHour: data.capacityPerHour,
        efficiency: data.efficiency,
        utilizationTarget: data.utilizationTarget,
        workingHoursStart: data.workingHoursStart,
        workingHoursEnd: data.workingHoursEnd,
        breakMinutes: data.breakMinutes,
        workingDays: data.workingDays,
        hourlyRate: data.hourlyRate,
        setupCostPerHour: data.setupCostPerHour,
        overheadRate: data.overheadRate,
        maxConcurrentJobs: data.maxConcurrentJobs,
        requiresOperator: data.requiresOperator,
        operatorSkillLevel: data.operatorSkillLevel,
        status: data.status,
        maintenanceInterval: data.maintenanceInterval,
        nextMaintenanceDate: data.nextMaintenanceDate,
      },
    });

    return NextResponse.json(workCenter);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/production/work-centers/[id]' });
    return NextResponse.json(
      { error: "Failed to update work center" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    await prisma.workCenter.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/production/work-centers/[id]' });
    return NextResponse.json(
      { error: "Failed to delete work center" },
      { status: 500 }
    );
  }
});
