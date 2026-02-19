import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { withAuth } from '@/lib/api/with-auth';import { logger } from '@/lib/logger';

import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const scheduleBodySchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  equipmentId: z.string(),
  type: z.string(),
  frequency: z.string(),
  intervalValue: z.number(),
  intervalUnit: z.string().optional(),
  estimatedDuration: z.number(),
  requiredSkills: z.any().optional(),
  checklistItems: z.any().optional(),
  instructions: z.string().optional(),
  safetyNotes: z.string().optional(),
  partsRequired: z.any().optional(),
  advanceNoticeDays: z.number().optional(),
  estimatedCost: z.number().optional(),
  laborCostPerHour: z.number().optional(),
  priority: z.string().optional(),
});

// GET - List maintenance schedules
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();

  try {
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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/maintenance/schedules' });
    return paginatedError("Failed to fetch maintenance schedules", 500);
  }
});

// POST - Create maintenance schedule
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const rawBody = await request.json();
    const parseResult = scheduleBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
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
    } = parseResult.data;

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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/maintenance/schedules' });
    return NextResponse.json(
      { error: "Failed to create maintenance schedule" },
      { status: 500 }
    );
  }
});
