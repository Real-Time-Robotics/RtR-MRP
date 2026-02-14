import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";import { logger } from '@/lib/logger';

import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

// GET - List shifts
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = parsePaginationParams(request);
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const where = activeOnly ? { isActive: true } : {};

    const [totalCount, shifts] = await Promise.all([
      prisma.shift.count({ where }),
      prisma.shift.findMany({
        where,
        ...buildOffsetPaginationQuery(params),
        orderBy: { startTime: "asc" },
        include: {
          _count: {
            select: { assignments: true },
          },
        },
      }),
    ]);

    const response = buildPaginatedResponse(shifts, totalCount, params, startTime);
    return paginatedSuccess(response);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/shifts' });
    return paginatedError("Failed to fetch shifts", 500);
  }
}

// POST - Create shift
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
      startTime,
      endTime,
      durationHours,
      breakMinutes,
      breakSchedule,
      workingDays,
      overtimeAfterHours,
      overtimeRate,
      efficiencyFactor,
      isDefault,
    } = body;

    // Validate required fields
    if (!code || !name || !startTime || !endTime || !durationHours) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, startTime, endTime, durationHours" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.shift.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const shift = await prisma.shift.create({
      data: {
        code,
        name,
        description,
        startTime,
        endTime,
        durationHours,
        breakMinutes: breakMinutes || 0,
        breakSchedule,
        workingDays: workingDays || [1, 2, 3, 4, 5],
        overtimeAfterHours,
        overtimeRate: overtimeRate || 1.5,
        efficiencyFactor: efficiencyFactor || 1.0,
        isActive: true,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/shifts' });
    return NextResponse.json(
      { error: "Failed to create shift" },
      { status: 500 }
    );
  }
}
