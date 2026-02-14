import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";import { logger } from '@/lib/logger';

import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  buildFilterQuery,
  buildSearchQuery,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

const ALLOWED_FILTERS = ["status", "type", "workCenterId", "criticality"];
const SEARCH_FIELDS = ["code", "name", "serialNumber"];

// GET - List equipment with OEE data
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
}

// POST - Create equipment
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
    } = body;

    // Validate required fields
    if (!code || !name || !type || !workCenterId) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, type, workCenterId" },
        { status: 400 }
      );
    }

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
}
