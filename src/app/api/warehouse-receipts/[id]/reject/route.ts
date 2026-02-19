import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { withAuth, type AuthUser } from "@/lib/auth/middleware";
import { rejectProductionReceipt } from "@/lib/mrp-engine";
import { handleError, successResponse } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

// POST - Reject a production receipt (warehouse rejects with reason)
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
      const bodySchema = z.object({
        reason: z.string(),
      });

      const rawBody = await request.json();
      const parseResult = bodySchema.safeParse(rawBody);
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const body = parseResult.data;
      const { reason } = body;

      if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: "Lý do từ chối là bắt buộc" },
          { status: 400 }
        );
      }

      logger.info("Rejecting production receipt", { receiptId: id, userId: user.id, reason });

      const result = await rejectProductionReceipt(id, user.id, reason.trim());

      logger.audit("reject", "productionReceipt", id, {
        userId: user.id,
        reason: reason.trim(),
      });

      return successResponse(result, result.message);
    } catch (error) {
      return handleError(error);
    }
  },
  { permission: "inventory:write" }
);
