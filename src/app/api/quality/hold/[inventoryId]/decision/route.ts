import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { executeHoldDecision, HoldDecision } from "@/lib/quality/hold-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
const HoldDecisionSchema = z.object({
  decision: z.enum(["RELEASE", "REJECT"]),
  quantity: z.number().min(1, "Quantity must be greater than 0"),
  notes: z.string().optional(),
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { inventoryId } = await context.params;
    const body = await request.json();

    const validation = HoldDecisionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { decision, quantity, notes } = validation.data;

    const result = await executeHoldDecision({
      inventoryId,
      decision: decision as HoldDecision,
      quantity,
      notes,
      reviewedBy: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.errors.join(", ") },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      from: result.fromWarehouse,
      to: result.toWarehouse,
      ncrNumber: result.ncrNumber,
      message:
        decision === "RELEASE"
          ? `Released ${quantity} to ${result.toWarehouse}`
          : `Rejected ${quantity} to QUARANTINE (NCR ${result.ncrNumber} created)`,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), {
      context: "POST /api/quality/hold/[inventoryId]/decision",
    });
    return NextResponse.json({ error: "Đã xảy ra lỗi", code: "QUALITY_HOLD_ERROR" }, { status: 500 });
  }
});
