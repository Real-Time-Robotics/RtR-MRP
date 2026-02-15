import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { executeHoldDecision, HoldDecision } from "@/lib/quality/hold-service";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inventoryId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inventoryId } = await params;
    const body = await request.json();
    const { decision, quantity, notes } = body;

    if (!["RELEASE", "REJECT"].includes(decision)) {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
