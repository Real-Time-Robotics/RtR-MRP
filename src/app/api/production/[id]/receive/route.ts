import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthUser } from "@/lib/auth/middleware";
import { receiveProductionOutput } from "@/lib/mrp-engine";
import { handleError, successResponse } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

// POST - Create a PENDING production receipt for warehouse approval
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

      logger.info("Requesting production receipt", { workOrderId: id, userId: user.id });

      const result = await receiveProductionOutput(id, user.id);

      if (result.status === "CONFIRMED") {
        return NextResponse.json(
          {
            success: false,
            error: "Đã nhập kho trước đó",
            message: result.message,
            data: { receipt: result.receipt },
          },
          { status: 409 }
        );
      }

      if (result.status === "PENDING" && result.receipt?.createdAt &&
          new Date(result.receipt.createdAt).getTime() < Date.now() - 5000) {
        // Existing PENDING receipt (not just created)
        return NextResponse.json(
          {
            success: false,
            error: "Đang chờ kho xác nhận",
            message: result.message,
            data: { receipt: result.receipt },
          },
          { status: 409 }
        );
      }

      logger.audit("create", "productionReceipt", id, {
        userId: user.id,
        receiptId: result.receipt?.id,
        quantity: result.receipt?.quantity,
      });

      return successResponse({ receipt: result.receipt }, result.message);
    } catch (error) {
      return handleError(error);
    }
  },
  { permission: "production:write" }
);
