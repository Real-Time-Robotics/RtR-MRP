import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/api/with-auth';
import { getStockStatus } from '@/lib/bom-engine';
import { validateQuery } from '@/lib/api/validation';
import { InventoryQuerySchema } from '@/lib/validations';
import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { logApi } from '@/lib/audit/audit-logger';
import { parsePaginationParams } from '@/lib/pagination';

// =============================================================================
// GET - List inventory with aggregation + server-side pagination
// =============================================================================

export const GET = withAuth(async (request, context, session) => {
  try {
    const startTime = Date.now();
// Rate limiting (Gate 5.2)
    const rateLimit = await checkHeavyEndpointLimit(request, session.user?.id);
    if (!rateLimit.success) {
      const requestId = request.headers.get('x-request-id') || 'unknown';
      logger.warn('Rate limit hit', {
        event: 'rate_limit_hit',
        requestId,
        identifier: session.user?.id || 'unknown',
        endpoint: '/api/inventory',
      });

      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter || 60),
          },
        }
      );
    }

    // Validate query params
    const queryResult = validateQuery(InventoryQuerySchema, request.nextUrl.searchParams);
    if (!queryResult.success) {
      return queryResult.response;
    }
    const { partId, warehouseId, status, search } = queryResult.data;

    // Parse pagination params
    const paginationParams = parsePaginationParams(request);

    // Build where clause
    const where: Record<string, unknown> = {};
    if (partId) where.partId = partId;
    if (warehouseId) where.warehouseId = warehouseId;

    // Add search filter for partNumber or name
    if (search) {
      where.part = {
        OR: [
          { partNumber: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    // Map helper for flat structure with status calculation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInventoryItem = (inv: Record<string, any>) => {
      const available = inv.quantity - inv.reservedQty;
      const unitCost = inv.part.costs?.[0]?.unitCost || 0;
      const minStockLevel = inv.part.planning?.minStockLevel || 0;
      const reorderPoint = inv.part.planning?.reorderPoint || 0;
      const safetyStock = inv.part.planning?.safetyStock || 0;

      return {
        id: inv.id,
        partId: inv.partId,
        partNumber: inv.part.partNumber,
        name: inv.part.name,
        category: inv.part.category,
        unit: inv.part.unit,
        unitCost: unitCost,
        isCritical: inv.part.isCritical,
        minStockLevel: minStockLevel,
        reorderPoint: reorderPoint,
        safetyStock: safetyStock,
        quantity: inv.quantity,
        reserved: inv.reservedQty,
        available,
        status: getStockStatus(available, minStockLevel, reorderPoint),
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse.name,
        lotNumber: inv.lotNumber,
        expiryDate: inv.expiryDate,
        locationCode: inv.locationCode,
      };
    };

    const includeClause = {
      part: {
        include: {
          costs: true,
          planning: true,
        }
      },
      warehouse: true,
    };

    const orderByClause = [{ part: { partNumber: 'asc' as const } }];

    // Status is a computed field — when filtering by status, we must load all
    // records, compute status, filter, then paginate the result manually.
    if (status) {
      const inventoryData = await prisma.inventory.findMany({
        where,
        include: includeClause,
        orderBy: orderByClause,
      });

      let result = inventoryData.map(mapInventoryItem);

      // Apply status filter
      if (status === 'critical') {
        result = result.filter((i) => i.status === 'CRITICAL' || i.status === 'OUT_OF_STOCK');
      } else if (status === 'reorder') {
        result = result.filter((i) => i.status === 'REORDER');
      } else if (status === 'ok') {
        result = result.filter((i) => i.status === 'OK');
      }

      // Compute summary from full filtered set
      const summary = computeSummary(result);
      const totalItems = result.length;

      // Manual pagination on filtered result
      const start = (paginationParams.page - 1) * paginationParams.pageSize;
      const paginatedResult = result.slice(start, start + paginationParams.pageSize);
      const totalPages = Math.ceil(totalItems / paginationParams.pageSize);

      return NextResponse.json({
        success: true,
        data: paginatedResult,
        pagination: {
          page: paginationParams.page,
          pageSize: paginationParams.pageSize,
          totalItems,
          totalPages,
          hasNextPage: paginationParams.page < totalPages,
          hasPrevPage: paginationParams.page > 1,
        },
        summary,
        meta: { took: Date.now() - startTime, cached: false },
      }, {
        headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
      });
    }

    // No status filter — use DB-level pagination
    const [totalItems, inventoryData] = await Promise.all([
      prisma.inventory.count({ where }),
      prisma.inventory.findMany({
        where,
        include: includeClause,
        orderBy: orderByClause,
        skip: (paginationParams.page - 1) * paginationParams.pageSize,
        take: paginationParams.pageSize,
      }),
    ]);

    const result = inventoryData.map(mapInventoryItem);
    const totalPages = Math.ceil(totalItems / paginationParams.pageSize);

    // For summary counts, we need all statuses. Use a lightweight query
    // to get aggregate counts (only when on page 1 or explicitly requested).
    //
    // NOTE: Cannot use Prisma count/groupBy here because stock status is a
    // computed field: available = quantity - reservedQty, then compared against
    // per-part planning thresholds (minStockLevel, reorderPoint). These
    // cross-table computed comparisons cannot be expressed as Prisma where
    // clauses. A raw SQL approach (e.g. JOIN + CASE WHEN) could work but
    // would couple us to a specific DB dialect. The lightweight select below
    // only fetches the 4 numeric fields needed, keeping the payload minimal.
    let summary = { total: totalItems, critical: 0, reorder: 0, ok: 0 };
    if (paginationParams.page === 1) {
      // Fetch all records lightweight for summary (only needed fields)
      const allInventory = await prisma.inventory.findMany({
        where,
        select: {
          quantity: true,
          reservedQty: true,
          part: {
            select: {
              planning: {
                select: {
                  minStockLevel: true,
                  reorderPoint: true,
                },
              },
            },
          },
        },
      });

      for (const inv of allInventory) {
        const available = inv.quantity - inv.reservedQty;
        const minStock = inv.part.planning?.minStockLevel || 0;
        const rop = inv.part.planning?.reorderPoint || 0;
        const s = getStockStatus(available, minStock, rop);
        if (s === 'CRITICAL' || s === 'OUT_OF_STOCK') summary.critical++;
        else if (s === 'REORDER') summary.reorder++;
        else summary.ok++;
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      pagination: {
        page: paginationParams.page,
        pageSize: paginationParams.pageSize,
        totalItems,
        totalPages,
        hasNextPage: paginationParams.page < totalPages,
        hasPrevPage: paginationParams.page > 1,
      },
      summary,
      meta: { took: Date.now() - startTime, cached: false },
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/inventory' });
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
});

function computeSummary(items: { status: string }[]) {
  let critical = 0, reorder = 0, ok = 0;
  for (const item of items) {
    if (item.status === 'CRITICAL' || item.status === 'OUT_OF_STOCK') critical++;
    else if (item.status === 'REORDER') reorder++;
    else ok++;
  }
  return { total: items.length, critical, reorder, ok };
}
