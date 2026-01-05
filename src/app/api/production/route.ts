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
import { cache, cacheKeys, cacheTTL, cachePatterns } from "@/lib/cache/redis";
import { rateLimitMiddleware, rateLimitConfigs } from "@/lib/security/rate-limiter";

// Allowed filters for work orders
const ALLOWED_FILTERS = ["status", "priority", "productId"];
const SEARCH_FIELDS = ["woNumber"];

// GET - List work orders with pagination and caching
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting for list endpoints
    const rateLimitResponse = await rateLimitMiddleware(request, rateLimitConfigs.list);
    if (rateLimitResponse) return rateLimitResponse;

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

    // Build cache key from query parameters
    const cacheKey = cacheKeys.workOrders({
      page: params.page,
      pageSize: params.pageSize,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      search,
      ...filters,
    });

    // Try to get from cache first
    const cached = await cache.get<PaginatedResponse<{ id: string }>>(cacheKey);
    if (cached) {
      // Return cached response with updated timing
      return paginatedSuccess({
        ...cached,
        meta: { took: Date.now() - startTime, cached: true },
      });
    }

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

    // Cache the response (short TTL for frequently changing data)
    await cache.set(cacheKey, response, cacheTTL.SHORT);

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
      console.log('[WO CREATE] Unauthorized - no session');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Log incoming request for debugging
    console.log('[WO CREATE] Request body:', JSON.stringify(body, null, 2));
    console.log('[WO CREATE] User:', session.user?.email);

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
      console.log('[WO CREATE] Validation failed: productId is required');
      return NextResponse.json(
        { error: "productId is required", field: "productId" },
        { status: 400 }
      );
    }

    if (!quantity || quantity <= 0) {
      console.log('[WO CREATE] Validation failed: quantity must be > 0');
      return NextResponse.json(
        { error: "quantity must be greater than 0", field: "quantity" },
        { status: 400 }
      );
    }

    console.log('[WO CREATE] Creating work order for product:', productId, 'quantity:', quantity);

    const workOrder = await createWorkOrder(
      productId,
      quantity,
      salesOrderId,
      salesOrderLine,
      plannedStart ? new Date(plannedStart) : undefined,
      priority
    );

    console.log('[WO CREATE] Success! WO Number:', workOrder.woNumber);

    // Invalidate work orders cache after creation
    await cache.deletePattern(cachePatterns.ALL_WORK_ORDERS);

    return NextResponse.json({
      success: true,
      data: workOrder,
      message: "Work order created successfully"
    });
  } catch (error: any) {
    console.error("[WO CREATE] Error:", error);
    console.error("[WO CREATE] Stack:", error?.stack);

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
