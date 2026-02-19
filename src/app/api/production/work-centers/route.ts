import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getCapacitySummary } from "@/lib/production/capacity-engine";
import { z } from "zod";
import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';
const WorkCenterCreateSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  type: z.string().min(1, "Type is required"),
  department: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  capacityType: z.string().default("hours"),
  capacityPerDay: z.number().default(8),
  capacityPerHour: z.number().optional().nullable(),
  efficiency: z.number().min(0).max(200).default(100),
  utilizationTarget: z.number().min(0).max(100).default(85),
  workingHoursStart: z.string().default("08:00"),
  workingHoursEnd: z.string().default("17:00"),
  breakMinutes: z.number().int().min(0).default(60),
  workingDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  hourlyRate: z.number().optional().nullable(),
  setupCostPerHour: z.number().optional().nullable(),
  overheadRate: z.number().optional().nullable(),
  maxConcurrentJobs: z.number().int().min(1).default(1),
  requiresOperator: z.boolean().default(true),
  operatorSkillLevel: z.string().optional().nullable(),
  status: z.string().default("active"),
  maintenanceInterval: z.number().optional().nullable(),
  nextMaintenanceDate: z.string().optional().nullable(),
});

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();

  try {
    const params = parsePaginationParams(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const includeUtilization = searchParams.get("includeUtilization") === "true";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [totalCount, workCenters] = await Promise.all([
      prisma.workCenter.count({ where }),
      prisma.workCenter.findMany({
        where,
        ...buildOffsetPaginationQuery(params),
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder }
          : { code: "asc" },
      }),
    ]);

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

      return paginatedSuccess(
        buildPaginatedResponse(wcWithUtilization, totalCount, params, startTime)
      );
    }

    return paginatedSuccess(
      buildPaginatedResponse(workCenters, totalCount, params, startTime)
    );
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/production/work-centers' });
    return paginatedError("Failed to fetch work centers", 500);
  }
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();

    const validation = WorkCenterCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const workCenter = await prisma.workCenter.create({
      data: {
        code: data.code,
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
        nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : null,
      },
    });

    return NextResponse.json(workCenter, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/production/work-centers' });
    return NextResponse.json(
      { error: "Failed to create work center" },
      { status: 500 }
    );
  }
});
