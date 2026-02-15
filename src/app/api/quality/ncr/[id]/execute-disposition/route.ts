import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { executeNcrDisposition, DispositionType } from "@/lib/quality/ncr-disposition-service";
import { logger } from "@/lib/logger";

const VALID_DISPOSITIONS: DispositionType[] = ["SCRAP", "REWORK", "RETURN_TO_VENDOR", "USE_AS_IS"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { disposition, quantity, notes, returnRmaNumber, deviationNumber } = body;

    if (!VALID_DISPOSITIONS.includes(disposition)) {
      return NextResponse.json({ error: "Invalid disposition type" }, { status: 400 });
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
