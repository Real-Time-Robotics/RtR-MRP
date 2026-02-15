import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pickForShipment } from "@/lib/mrp-engine";

// POST /api/shipments/[id]/pick — Pick items and stage in SHIP warehouse
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await pickForShipment(params.id, session.user.id);

    return NextResponse.json({
      success: result.success,
      pickedItems: result.pickedItems,
      message: result.message,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pick failed" },
      { status: 400 }
    );
  }
}
