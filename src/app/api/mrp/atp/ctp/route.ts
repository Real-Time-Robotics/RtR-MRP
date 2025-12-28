import { NextRequest, NextResponse } from "next/server";
import { calculateATP } from "@/lib/mrp";

// GET /api/mrp/atp/ctp - Calculate CTP (Capable to Promise) for a part
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const partId = searchParams.get("partId");
    const quantity = parseFloat(searchParams.get("quantity") || "1");
    const date = searchParams.get("date")
      ? new Date(searchParams.get("date")!)
      : new Date();
    const siteId = searchParams.get("siteId") || undefined;

    if (!partId) {
      return NextResponse.json(
        { error: "partId is required" },
        { status: 400 }
      );
    }

    // Calculate ATP which includes CTP details
    const result = await calculateATP(partId, quantity, date, siteId);

    // Return CTP-focused response
    return NextResponse.json({
      partId: result.partId,
      partNumber: result.partNumber,
      requestedQty: result.requestedQty,
      requestedDate: result.requestedDate,
      atpQty: result.atpQty,
      atpDate: result.atpDate,
      ctpQty: result.ctpQty,
      ctpDate: result.ctpDate,
      canFulfill: result.atpQty + result.ctpQty >= result.requestedQty,
      ctpDetails: result.ctpDetails,
    });
  } catch (error) {
    console.error("CTP GET error:", error);
    return NextResponse.json(
      { error: "Failed to calculate CTP" },
      { status: 500 }
    );
  }
}

// POST /api/mrp/atp/ctp - Batch CTP check
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "items array is required" },
        { status: 400 }
      );
    }

    const results = [];

    for (const item of items) {
      const result = await calculateATP(
        item.partId,
        item.quantity,
        new Date(item.requiredDate),
        item.siteId
      );

      results.push({
        partId: result.partId,
        partNumber: result.partNumber,
        requestedQty: result.requestedQty,
        canFulfill: result.atpQty + result.ctpQty >= result.requestedQty,
        atpQty: result.atpQty,
        atpDate: result.atpDate,
        ctpQty: result.ctpQty,
        ctpDate: result.ctpDate,
        ctpDetails: result.ctpDetails,
      });
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("CTP POST error:", error);
    return NextResponse.json(
      { error: "Failed to check batch CTP" },
      { status: 500 }
    );
  }
}
