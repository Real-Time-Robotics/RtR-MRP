import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { WAREHOUSE_FLOW_ORDER } from '@/types';
import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// GET - List all warehouses (sorted by material flow)
// =============================================================================

export const GET = withAuth(async (request: NextRequest, _context, _session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();

  try {
    const params = parsePaginationParams(request);

    const [totalCount, warehouses] = await Promise.all([
      prisma.warehouse.count(),
      prisma.warehouse.findMany({
        ...buildOffsetPaginationQuery(params),
        include: {
          _count: { select: { inventory: true } },
          inventory: {
            select: { quantity: true, reservedQty: true },
          },
        },
      }),
    ]);

    // Compute stats per warehouse and strip heavy inventory array
    const warehousesWithStats = warehouses.map(wh => {
      const totalQuantity = wh.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const criticalCount = wh.inventory.filter(inv => {
        const available = inv.quantity - inv.reservedQty;
        return available <= 0;
      }).length;
      const { inventory: _inv, ...rest } = wh;
      return {
        ...rest,
        itemCount: wh._count.inventory,
        totalQuantity,
        criticalCount,
      };
    });

    // Sort by material flow order (Receiving -> Quarantine -> Main -> WIP -> FG -> Shipping -> Hold -> Scrap)
    const sorted = warehousesWithStats.sort((a, b) => {
      const orderA = WAREHOUSE_FLOW_ORDER[a.type || 'MAIN'] ?? 99;
      const orderB = WAREHOUSE_FLOW_ORDER[b.type || 'MAIN'] ?? 99;
      return orderA - orderB;
    });

    return paginatedSuccess(
      buildPaginatedResponse(sorted, totalCount, params, startTime),
      { cacheControl: 'private, max-age=60, stale-while-revalidate=120' },
    );
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/warehouses' });
    return paginatedError('Failed to fetch warehouses', 500);
  }
});
