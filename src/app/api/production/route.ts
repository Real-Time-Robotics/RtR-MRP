import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createWorkOrder } from "@/lib/mrp-engine";
import { auth } from "@/lib/auth";
import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  buildFilterQuery,
  buildSearchQuery,
  paginatedSuccess,
  paginatedError,
  PaginatedResponse,
} from "@/lib/pagination";
// Note: Redis cache/rate-limit disabled - not available on Render free tier

// Allowed filters for work orders
const ALLOWED_FILTERS = ["status", "priority", "productId"];
const SEARCH_FIELDS = ["woNumber"];

// GET - List work orders with pagination
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting handled by middleware (in-memory)

    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse pagination params
    const params = parsePaginationParams(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    // Build where clause
    const filters = buildFilterQuery(request, ALLOWED_FILTERS);
    const searchQuery = buildSearchQuery(search, SEARCH_FIELDS);

    // Normalize status filter to uppercase (fix case-sensitive issue)
    if (filters.status) {
      if (typeof filters.status === 'string') {
        filters.status = filters.status.toUpperCase();
      } else if (typeof filters.status === 'object' && 'in' in filters.status) {
        // Handle multiple status values: status=draft,pending
        filters.status = {
          in: (filters.status as { in: string[] }).in.map((s: string) => s.toUpperCase())
        };
      }
    }

    const where = {
      ...filters,
      ...searchQuery,
    };

    // Note: Redis cache disabled - skip cache check

    // Get total count and paginated data in parallel
    const [totalCount, workOrders] = await Promise.all([
      prisma.workOrder.count({ where }),
      prisma.workOrder.findMany({
        where,
        ...buildOffsetPaginationQuery(params),
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder }
          : { createdAt: "desc" },
        include: {
          product: {
            select: { id: true, name: true, sku: true },
          },
          salesOrder: {
            select: {
              id: true,
              orderNumber: true,
              customer: { select: { id: true, name: true } },
            },
          },
          allocations: {
            select: {
              id: true,
              requiredQty: true,
              allocatedQty: true,
              part: { select: { id: true, partNumber: true, name: true } },
            },
            take: 5, // Limit allocations per work order
          },
        },
      }),
    ]);

    const response = buildPaginatedResponse(workOrders, totalCount, params, startTime);

    // Note: Redis cache disabled - not available on Render free tier

    return paginatedSuccess(response);
  } catch (error) {
    console.error("Production API error:", error);
    return paginatedError("Failed to fetch work orders", 500);
  }
}

// POST - Create work order
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      productId,
      quantity,
      salesOrderId,
      salesOrderLine,
      plannedStart,
      priority = "normal",
    } = body;

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        { error: "productId is required", field: "productId" },
        { status: 400 }
      );
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "quantity must be greater than 0", field: "quantity" },
        { status: 400 }
      );
    }

    const workOrder = await createWorkOrder(
      productId,
      quantity,
      salesOrderId,
      salesOrderLine,
      plannedStart ? new Date(plannedStart) : undefined,
      priority
    );

    // Note: Cache invalidation disabled - Redis not available on Render free tier

    return NextResponse.json({
      success: true,
      data: workOrder,
      message: "Work order created successfully"
    });
  } catch (error: any) {
    console.error("[WO CREATE] Error:", error);

    // Return detailed error for debugging
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to create work order",
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
