import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, type AuthUser } from "@/lib/auth/middleware";
import { handleError } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  paginatedSuccess,
} from "@/lib/pagination";
import { checkReadEndpointLimit } from '@/lib/rate-limit';

// GET - List production receipts (for warehouse approval)
export const GET = withAuth(
  async (
    request: NextRequest,
    { user }: { params: Record<string, never>; user: AuthUser }
  ) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const startTime = Date.now();

    try {
      const params = parsePaginationParams(request);
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status") || "PENDING";
      const warehouseId = searchParams.get("warehouseId");

      logger.info("Fetching warehouse receipts", { status, warehouseId, userId: user.id });

      const where: Record<string, unknown> = { status };
      if (warehouseId) {
        where.warehouseId = warehouseId;
      }

      const [totalCount, receipts] = await Promise.all([
        prisma.productionReceipt.count({ where }),
        prisma.productionReceipt.findMany({
          where,
          ...buildOffsetPaginationQuery(params),
          include: {
            workOrder: { select: { woNumber: true, status: true, completedQty: true } },
            product: { select: { id: true, sku: true, name: true } },
            warehouse: { select: { id: true, code: true, name: true } },
          },
          orderBy: params.sortBy
            ? { [params.sortBy]: params.sortOrder }
            : { requestedAt: "desc" },
        }),
      ]);

      return NextResponse.json(
        buildPaginatedResponse(receipts, totalCount, params, startTime)
      );
    } catch (error) {
      return handleError(error);
    }
  },
  { permission: "inventory:read" }
);
