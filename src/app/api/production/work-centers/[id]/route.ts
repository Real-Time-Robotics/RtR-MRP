import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getWorkCenterUtilization } from "@/lib/production/capacity-engine";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const workCenter = await prisma.workCenter.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        type: body.type,
        department: body.department,
        location: body.location,
        capacityType: body.capacityType,
        capacityPerDay: body.capacityPerDay,
        capacityPerHour: body.capacityPerHour,
        efficiency: body.efficiency,
        utilizationTarget: body.utilizationTarget,
        workingHoursStart: body.workingHoursStart,
        workingHoursEnd: body.workingHoursEnd,
        breakMinutes: body.breakMinutes,
        workingDays: body.workingDays,
        hourlyRate: body.hourlyRate,
        setupCostPerHour: body.setupCostPerHour,
        overheadRate: body.overheadRate,
        maxConcurrentJobs: body.maxConcurrentJobs,
        requiresOperator: body.requiresOperator,
        operatorSkillLevel: body.operatorSkillLevel,
        status: body.status,
        maintenanceInterval: body.maintenanceInterval,
        nextMaintenanceDate: body.nextMaintenanceDate,
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
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
}
