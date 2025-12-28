import { NextRequest, NextResponse } from "next/server";
import { calculateATP, checkBatchATP, updateATPRecords } from "@/lib/mrp";

// GET /api/mrp/atp - Calculate ATP for a part
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const partId = searchParams.get("partId");
    const quantity = parseFloat(searchParams.get("quantity") || "1");
    const date = searchParams.get("date")
      ? new Date(searchParams.get("date")!)
      : new Date();
    const siteId = searchParams.get("siteId") || undefined;
    const horizon = parseInt(searchParams.get("horizon") || "90");

    if (!partId) {
      return NextResponse.json(
        { error: "partId is required" },
        { status: 400 }
      );
    }

    const result = await calculateATP(partId, quantity, date, siteId, horizon);
    return NextResponse.json(result);
  } catch (error) {
    console.error("ATP GET error:", error);
    return NextResponse.json(
      { error: "Failed to calculate ATP" },
      { status: 500 }
    );
  }
}

// POST /api/mrp/atp - Batch ATP check
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, saveRecords = false } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "items array is required" },
        { status: 400 }
      );
    }

    // Parse dates in items
    const parsedItems = items.map((item: { partId: string; quantity: number; requiredDate: string | Date }) => ({
      partId: item.partId,
      quantity: item.quantity,
      requiredDate: new Date(item.requiredDate),
    }));

    const results = await checkBatchATP(parsedItems);

    // Optionally save ATP records for each part
    if (saveRecords) {
      for (const item of parsedItems) {
        const atp = await calculateATP(item.partId, item.quantity, item.requiredDate);
        await updateATPRecords(item.partId, atp.grid);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("ATP POST error:", error);
    return NextResponse.json(
      { error: "Failed to check batch ATP" },
      { status: 500 }
    );
  }
}
