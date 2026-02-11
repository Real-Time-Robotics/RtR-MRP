import { NextRequest } from "next/server";
import { withAuth, type AuthUser } from "@/lib/auth/middleware";
import { confirmProductionReceipt } from "@/lib/mrp-engine";
import { handleError, successResponse } from "@/lib/error-handler";
import { logger } from "@/lib/logger";

// POST - Confirm a production receipt (warehouse approves)
export const POST = withAuth(
  async (
    request: NextRequest,
    { params, user }: { params: { id: string }; user: AuthUser }
  ) => {
    try {
      const { id } = await params;

      logger.info("Confirming production receipt", { receiptId: id, userId: user.id });

      const result = await confirmProductionReceipt(id, user.id);

      logger.audit("confirm", "productionReceipt", id, {
        userId: user.id,
        quantity: result.receipt.quantity,
      });

      return successResponse(result, result.message);
    } catch (error) {
      return handleError(error);
    }
  },
  { permission: "inventory:write" }
);
