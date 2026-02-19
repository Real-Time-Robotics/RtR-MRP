import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { disposeScrapInventory, DisposalMethod } from "@/lib/quality/scrap-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
const VALID_METHODS: DisposalMethod[] = [
  "PHYSICAL_DESTRUCTION",
  "RECYCLING",
  "HAZARDOUS_WASTE",
  "OTHER",
];

const ScrapDisposeSchema = z.object({
  quantity: z.number().min(1, "Quantity must be greater than 0"),
  disposalMethod: z.enum(["PHYSICAL_DESTRUCTION", "RECYCLING", "HAZARDOUS_WASTE", "OTHER"]),
  disposalReference: z.string().optional(),
  notes: z.string().optional(),
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { inventoryId } = await context.params;
    const body = await request.json();

    const validation = ScrapDisposeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { quantity, disposalMethod, disposalReference, notes } = validation.data;

    const result = await disposeScrapInventory(
      { inventoryId, quantity, disposalMethod, disposalReference, notes },
      session.user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.errors.join(", ") },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      writeOffValue: result.writeOffValue,
      message: `Disposed ${quantity} units. Write-off value: ${result.writeOffValue.toLocaleString()} VND`,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), {
      context: "POST /api/quality/scrap/[inventoryId]/dispose",
    });
    return NextResponse.json({ error: "Đã xảy ra lỗi", code: "QUALITY_SCRAP_ERROR" }, { status: 500 });
  }
});
