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

    const workOrder = await createWorkOrder(
      productId,
      quantity,
      salesOrderId,
      salesOrderLine,
      plannedStart ? new Date(plannedStart) : undefined,
      priority
    );

    // Invalidate work orders cache after creation
    await cache.deletePattern(cachePatterns.ALL_WORK_ORDERS);

    return NextResponse.json(workOrder);
  } catch (error) {
    console.error("Create work order error:", error);
    return NextResponse.json(
      { error: "Failed to create work order" },
      { status: 500 }
    );
  }
}
