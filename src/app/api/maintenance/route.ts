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

const ALLOWED_FILTERS = ["status", "type", "priority", "equipmentId", "assignedTo"];
const SEARCH_FIELDS = ["orderNumber", "title"];

// GET - List maintenance orders
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
    const upcoming = searchParams.get("upcoming") === "true";

    const filters = buildFilterQuery(request, ALLOWED_FILTERS);
    const searchQuery = buildSearchQuery(search, SEARCH_FIELDS);

    let where: Record<string, unknown> = { ...filters, ...searchQuery };

    // Filter for upcoming maintenance
    if (upcoming) {
      where = {
        ...where,
        status: { in: ["pending", "scheduled"] },
        plannedStartDate: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
        },
      };
    }

    const [totalCount, orders] = await Promise.all([
      prisma.maintenanceOrder.count({ where }),
      prisma.maintenanceOrder.findMany({
        where,
        ...buildOffsetPaginationQuery(params),
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder }
          : [{ priority: "desc" }, { plannedStartDate: "asc" }],
        include: {
          equipment: {
            select: { id: true, code: true, name: true, status: true },
          },
          schedule: {
            select: { id: true, code: true, name: true, type: true },
          },
        },
      }),
    ]);

    const response = buildPaginatedResponse(orders, totalCount, params, startTime);
    return paginatedSuccess(response);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/maintenance' });
    return paginatedError("Failed to fetch maintenance orders", 500);
  }
}

// POST - Create maintenance order
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      equipmentId,
      scheduleId,
      type,
      priority,
      title,
      description,
      problemReported,
      plannedStartDate,
      plannedEndDate,
      estimatedDuration,
      assignedTo,
      assignedTeam,
    } = body;

    // Validate required fields
    if (!equipmentId || !type || !title) {
      return NextResponse.json(
        { error: "Missing required fields: equipmentId, type, title" },
        { status: 400 }
      );
    }

    // Generate order number
    const lastOrder = await prisma.maintenanceOrder.findFirst({
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true },
    });

    const orderNum = lastOrder
      ? parseInt(lastOrder.orderNumber.replace("MO-", "")) + 1
      : 1;
    const orderNumber = `MO-${orderNum.toString().padStart(6, "0")}`;

    const order = await prisma.maintenanceOrder.create({
      data: {
        orderNumber,
        equipmentId,
        scheduleId,
        type,
        priority: priority || "medium",
        title,
        description,
        problemReported,
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
        estimatedDuration,
        assignedTo,
        assignedTeam,
        status: "pending",
        requestedBy: session.user?.email || null,
      },
      include: {
        equipment: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    // Update equipment status if emergency
    if (type === "EM" || priority === "emergency") {
      await prisma.equipment.update({
        where: { id: equipmentId },
        data: { status: "maintenance" },
      });
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/maintenance' });
    return NextResponse.json(
      { error: "Failed to create maintenance order" },
      { status: 500 }
    );
  }
}
