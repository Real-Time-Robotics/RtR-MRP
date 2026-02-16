import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateCycleCountList, recordCycleCount } from "@/lib/inventory/cycle-count-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const maxItems = parseInt(searchParams.get("maxItems") || "50");

    const items = await generateCycleCountList(warehouseId, maxItems);
    return NextResponse.json({ data: items, total: items.length });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate cycle count list" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { inventoryId, countedQty, notes } = await request.json();
    if (!inventoryId || countedQty === undefined) {
      return NextResponse.json({ error: "inventoryId and countedQty required" }, { status: 400 });
    }

    const result = await recordCycleCount(inventoryId, countedQty, session.user?.id || "system", notes);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to record cycle count" }, { status: 500 });
  }
}
