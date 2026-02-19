import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { withAuth } from '@/lib/api/with-auth';import { logger } from '@/lib/logger';

import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  buildFilterQuery,
  buildSearchQuery,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const equipmentBodySchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.string(),
  category: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  workCenterId: z.string(),
  location: z.string().optional(),
  capacity: z.number().optional(),
  powerKw: z.number().optional(),
  weightKg: z.number().optional(),
  dimensions: z.string().optional(),
  purchaseDate: z.string().optional(),
  installDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  purchaseCost: z.number().optional(),
  hourlyRunCost: z.number().optional(),
  targetOee: z.number().optional(),
  criticality: z.string().optional(),
  maintenanceIntervalDays: z.number().optional(),
});

const ALLOWED_FILTERS = ["status", "type", "workCenterId", "criticality"];
const SEARCH_FIELDS = ["code", "name", "serialNumber"];

// GET - List equipment with OEE data
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();

  try {
const params = parsePaginationParams(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const filters = buildFilterQuery(request, ALLOWED_FILTERS);
    const searchQuery = buildSearchQuery(search, SEARCH_FIELDS);

    const where = { ...filters, ...searchQuery };

    const [totalCount, equipment] = await Promise.all([
      prisma.equipment.count({ where }),
      prisma.equipment.findMany({
        where,
        ...buildOffsetPaginationQuery(params),
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder }
          : { createdAt: "desc" },
        include: {
          workCenter: {
            select: { id: true, code: true, name: true },
          },
          _count: {
            select: {
              maintenanceOrders: true,
              maintenanceSchedules: true,
            },
          },
        },
      }),
    ]);

    const response = buildPaginatedResponse(equipment, totalCount, params, startTime);
    return paginatedSuccess(response);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/equipment' });
    return paginatedError("Failed to fetch equipment", 500);
  }
});

// POST - Create equipment
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const rawBody = await request.json();
    const parseResult = equipmentBodySchema.safeParse(rawBody);
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
      type,
      category,
      manufacturer,
      model,
      serialNumber,
      workCenterId,
      location,
      capacity,
      powerKw,
      weightKg,
      dimensions,
      purchaseDate,
      installDate,
      warrantyExpiry,
      purchaseCost,
      hourlyRunCost,
      targetOee,
      criticality,
      maintenanceIntervalDays,
    } = parseResult.data;

    const equipment = await prisma.equipment.create({
      data: {
        code,
        name,
        description,
        type,
        category,
        manufacturer,
        model,
        serialNumber,
        workCenterId,
        location,
        capacity,
        powerKw,
        weightKg,
        dimensions,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        installDate: installDate ? new Date(installDate) : null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        purchaseCost,
        hourlyRunCost,
        targetOee: targetOee || 85,
        criticality: criticality || "medium",
        maintenanceIntervalDays,
        status: "operational",
      },
      include: {
        workCenter: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/equipment' });
    return NextResponse.json(
      { error: "Failed to create equipment" },
      { status: 500 }
    );
  }
});
