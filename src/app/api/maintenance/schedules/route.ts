import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

// GET - List maintenance schedules
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = parsePaginationParams(request);
    const { searchParams } = new URL(request.url);
    const equipmentId = searchParams.get("equipmentId");
    const dueSoon = searchParams.get("dueSoon") === "true";

    let where: Record<string, unknown> = { isActive: true };

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (dueSoon) {
      where.nextDueDate = {
        lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Next 14 days
      };
    }

    const [totalCount, schedules] = await Promise.all([
      prisma.maintenanceSchedule.count({ where }),
      prisma.maintenanceSchedule.findMany({
        where,
        ...buildOffsetPaginationQuery(params),
        orderBy: { nextDueDate: "asc" },
        include: {
          equipment: {
            select: {
              id: true,
              code: true,
              name: true,
              status: true,
              workCenter: {
                select: { id: true, code: true, name: true },
              },
            },
          },
          _count: {
            select: { maintenanceOrders: true },
          },
        },
      }),
    ]);

    const response = buildPaginatedResponse(schedules, totalCount, params, startTime);
    return paginatedSuccess(response);
  } catch (error) {
    console.error("Maintenance schedules API error:", error);
    return paginatedError("Failed to fetch maintenance schedules", 500);
  }
}

// POST - Create maintenance schedule
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      code,
      name,
      description,
      equipmentId,
      type,
      frequency,
      intervalValue,
      intervalUnit,
      estimatedDuration,
      requiredSkills,
      checklistItems,
      instructions,
      safetyNotes,
      partsRequired,
      advanceNoticeDays,
      estimatedCost,
      laborCostPerHour,
      priority,
    } = body;

    // Validate required fields
    if (!code || !name || !equipmentId || !type || !frequency || !intervalValue || !estimatedDuration) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate next due date
    const nextDueDate = new Date();
    if (intervalUnit === "days") {
      nextDueDate.setDate(nextDueDate.getDate() + intervalValue);
    } else if (intervalUnit === "hours") {
      nextDueDate.setHours(nextDueDate.getHours() + intervalValue);
    }

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        code,
        name,
        description,
        equipmentId,
        type,
        frequency,
        intervalValue,
        intervalUnit: intervalUnit || "days",
        estimatedDuration,
        requiredSkills,
        checklistItems,
        instructions,
        safetyNotes,
        partsRequired,
        advanceNoticeDays: advanceNoticeDays || 7,
        estimatedCost,
        laborCostPerHour,
        priority: priority || "medium",
        nextDueDate,
        isActive: true,
      },
      include: {
        equipment: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("Create maintenance schedule error:", error);
    return NextResponse.json(
      { error: "Failed to create maintenance schedule" },
      { status: 500 }
    );
  }
}
