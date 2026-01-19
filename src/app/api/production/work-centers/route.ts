import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCapacitySummary } from "@/lib/production/capacity-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const includeUtilization = searchParams.get("includeUtilization") === "true";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const workCenters = await prisma.workCenter.findMany({
      where,
      orderBy: { code: "asc" },
    });

    if (includeUtilization) {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      const summary = await getCapacitySummary(startOfWeek, endOfWeek);

      const wcWithUtilization = workCenters.map((wc) => {
        const utilData = summary.workCenters.find((w) => w.id === wc.id);
        return {
          ...wc,
          utilization: utilData?.utilization || 0,
          scheduledHours: utilData?.scheduledHours || 0,
          availableHours: utilData?.availableHours || 0,
        };
      });

      return NextResponse.json(wcWithUtilization);
    }

    return NextResponse.json(workCenters);
  } catch (error) {
    console.error("Failed to fetch work centers:", error);
    return NextResponse.json(
      { error: "Failed to fetch work centers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const workCenter = await prisma.workCenter.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        type: body.type,
        department: body.department,
        location: body.location,
        capacityType: body.capacityType || "hours",
        capacityPerDay: body.capacityPerDay,
        capacityPerHour: body.capacityPerHour,
        efficiency: body.efficiency || 100,
        utilizationTarget: body.utilizationTarget || 85,
        workingHoursStart: body.workingHoursStart || "08:00",
        workingHoursEnd: body.workingHoursEnd || "17:00",
        breakMinutes: body.breakMinutes || 60,
        workingDays: body.workingDays || [1, 2, 3, 4, 5],
        hourlyRate: body.hourlyRate,
        setupCostPerHour: body.setupCostPerHour,
        overheadRate: body.overheadRate,
        maxConcurrentJobs: body.maxConcurrentJobs || 1,
        requiresOperator: body.requiresOperator ?? true,
        operatorSkillLevel: body.operatorSkillLevel,
        status: body.status || "active",
        maintenanceInterval: body.maintenanceInterval,
        nextMaintenanceDate: body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate) : null,
      },
    });

    return NextResponse.json(workCenter, { status: 201 });
  } catch (error) {
    console.error("Failed to create work center:", error);
    return NextResponse.json(
      { error: "Failed to create work center" },
      { status: 500 }
    );
  }
}
