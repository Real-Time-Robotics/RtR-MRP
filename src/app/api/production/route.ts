import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createWorkOrder } from "@/lib/mrp-engine";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";
import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  buildFilterQuery,
  buildSearchQuery,
  paginatedSuccess,
  paginatedError,
  PaginatedResponse,
  validateSortBy,
  SortValidationError,
} from "@/lib/pagination";
import { validateQuery, validateBody } from "@/lib/api/validation";
import { WorkOrderQuerySchema, WorkOrderCreateSchema } from "@/lib/validations";
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

// Allowed filters for work orders
const ALLOWED_FILTERS = ["status", "priority", "productId"];
const SEARCH_FIELDS = ["woNumber"];
const ALLOWED_SORT_FIELDS = ["createdAt", "updatedAt", "status", "dueDate", "priority", "woNumber", "quantity"];

// GET - List work orders with pagination
export const GET = withAuth(async (request, context, session) => {
  const startTime = Date.now();

  try {
    // Parse pagination params
    const params = parsePaginationParams(request);

    // Validate sortBy against allowed fields (strict → 400 for invalid)
    try {
      params.sortBy = params.sortBy
        ? validateSortBy(params.sortBy, ALLOWED_SORT_FIELDS, 'createdAt', true)
        : undefined;
    } catch (error) {
      if (error instanceof SortValidationError) {
        return paginatedError(error.message, 400);
      }
      throw error;
    }

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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/production' });
    return paginatedError("Failed to fetch work orders", 500);
  }
});

// POST - Create work order
export const POST = withAuth(async (request, context, session) => {
  try {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

    // Validate request body
    const bodyResult = await validateBody(WorkOrderCreateSchema, request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    const { productId, quantity, salesOrderId, salesOrderLine, plannedStart, priority, woType, batchSize } = bodyResult.data;

    const workOrder = await createWorkOrder(
      productId,
      quantity,
      salesOrderId,
      salesOrderLine,
      plannedStart ? new Date(plannedStart) : undefined,
      priority,
      session.user?.id,
      woType,
      batchSize
    );

    // Note: Cache invalidation disabled - Redis not available on Render free tier

    return NextResponse.json({
      success: true,
      data: workOrder,
      message: "Work order created successfully"
    });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/production' });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create work order",
      },
      { status: 500 }
    );
  }
});
