import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { disposeScrapInventory, DisposalMethod } from "@/lib/quality/scrap-service";
import { logger } from "@/lib/logger";

const VALID_METHODS: DisposalMethod[] = [
  "PHYSICAL_DESTRUCTION",
  "RECYCLING",
  "HAZARDOUS_WASTE",
  "OTHER",
];

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
    const { quantity, disposalMethod, disposalReference, notes } = body;

    if (!VALID_METHODS.includes(disposalMethod)) {
      return NextResponse.json({ error: "Invalid disposal method" }, { status: 400 });
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
