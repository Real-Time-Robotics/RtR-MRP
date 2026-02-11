import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth, type AuthUser } from "@/lib/auth/middleware";
import { handleError, successResponse } from "@/lib/error-handler";
import { logger } from "@/lib/logger";

// GET - List production receipts (for warehouse approval)
export const GET = withAuth(
  async (
    request: NextRequest,
    { user }: { params: Record<string, never>; user: AuthUser }
  ) => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status") || "PENDING";
      const warehouseId = searchParams.get("warehouseId");

      logger.info("Fetching warehouse receipts", { status, warehouseId, userId: user.id });

      const where: Record<string, unknown> = { status };
      if (warehouseId) {
        where.warehouseId = warehouseId;
      }

      const receipts = await prisma.productionReceipt.findMany({
        where,
        include: {
          workOrder: { select: { woNumber: true, status: true, completedQty: true } },
          product: { select: { id: true, sku: true, name: true } },
          warehouse: { select: { id: true, code: true, name: true } },
        },
        orderBy: { requestedAt: "desc" },
      });

      return successResponse(receipts);
    } catch (error) {
      return handleError(error);
    }
  },
  { permission: "inventory:read" }
);
