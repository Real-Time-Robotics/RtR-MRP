import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { executeNcrDisposition, DispositionType } from "@/lib/quality/ncr-disposition-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
const VALID_DISPOSITIONS: DispositionType[] = ["SCRAP", "REWORK", "RETURN_TO_VENDOR", "USE_AS_IS"];

const NcrDispositionSchema = z.object({
  disposition: z.enum(["SCRAP", "REWORK", "RETURN_TO_VENDOR", "USE_AS_IS"]),
  quantity: z.number().min(1, "Quantity must be greater than 0"),
  notes: z.string().optional(),
  returnRmaNumber: z.string().optional(),
  deviationNumber: z.string().optional(),
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const validation = NcrDispositionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { disposition, quantity, notes, returnRmaNumber, deviationNumber } = validation.data;

    const result = await executeNcrDisposition(
      { ncrId: id, disposition, quantity, notes, returnRmaNumber, deviationNumber },
      session.user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: "Disposition failed", details: result.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      fromWarehouse: result.fromWarehouse,
      toWarehouse: result.toWarehouse,
      transactions: result.transactionIds,
      message: `Disposition ${disposition} executed successfully`,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), {
      context: "POST /api/quality/ncr/[id]/execute-disposition",
    });
    return NextResponse.json({ error: "Đã xảy ra lỗi", code: "QUALITY_NCR_ERROR" }, { status: 500 });
  }
});
