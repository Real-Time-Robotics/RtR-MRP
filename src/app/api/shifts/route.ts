import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from '@/lib/logger';

import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const shiftBodySchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  durationHours: z.number(),
  breakMinutes: z.number().optional(),
  breakSchedule: z.any().optional(),
  workingDays: z.array(z.number()).optional(),
  overtimeAfterHours: z.number().optional(),
  overtimeRate: z.number().optional(),
  efficiencyFactor: z.number().optional(),
  isDefault: z.boolean().optional(),
});
// GET - List shifts
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();

  try {

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
});

// POST - Create shift
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const rawBody = await request.json();
    const parseResult = shiftBodySchema.safeParse(rawBody);
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
    } = parseResult.data;

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
});
