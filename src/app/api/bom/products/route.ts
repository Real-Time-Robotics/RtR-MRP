import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";
import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
// GET - List all products with BOM summary
export const GET = withAuth(async (request: NextRequest, _context, _session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();

  try {
    const params = parsePaginationParams(request);
    const where = { status: "active" as const };

    const [totalCount, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        ...buildOffsetPaginationQuery(params),
        include: {
          bomHeaders: {
            where: { status: { in: ["active", "draft"] } },
            orderBy: [{ status: "asc" }, { createdAt: "desc" }],
            include: {
              bomLines: true,
            },
          },
        },
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder }
          : { name: "asc" },
      }),
    ]);

    const data = products.map((product) => {
      const activeBom = product.bomHeaders[0];
      const totalParts = activeBom?.bomLines.length || 0;

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        basePrice: product.basePrice || 0,
        status: product.status,
        bomVersion: activeBom?.version || "N/A",
        bomStatus: activeBom?.status || null,
        bomHeaderId: activeBom?.id || null,
        totalParts,
        hasBom: !!activeBom,
      };
    });

    return paginatedSuccess(
      buildPaginatedResponse(data, totalCount, params, startTime)
    );
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/bom/products' });
    return paginatedError("Failed to fetch products", 500);
  }
});
