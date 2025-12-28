import { NextRequest, NextResponse } from "next/server";
import { calculateRCCP } from "@/lib/production/capacity-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const periodType =
      (searchParams.get("periodType") as "day" | "week" | "month") || "week";
    const weeks = parseInt(searchParams.get("weeks") || "4");

    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(startDate.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);

    const rccp = await calculateRCCP(startDate, endDate, periodType);

    return NextResponse.json(rccp);
  } catch (error) {
    console.error("Failed to calculate RCCP:", error);
    return NextResponse.json(
      { error: "Failed to calculate RCCP" },
      { status: 500 }
    );
  }
}
