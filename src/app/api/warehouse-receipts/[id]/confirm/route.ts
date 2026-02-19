import { NextRequest } from "next/server";
import { withAuth, type AuthUser } from "@/lib/auth/middleware";
import { confirmProductionReceipt } from "@/lib/mrp-engine";
import { handleError, successResponse } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

// POST - Confirm a production receipt (warehouse approves)
export const POST = withAuth(
  async (
    request: NextRequest,
    { params, user }: { params: { id: string }; user: AuthUser }
  ) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

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
