import { NextRequest, NextResponse } from "next/server";
import { getSchedule } from "@/lib/production/scheduling-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const workCenterIds = searchParams.get("workCenterIds")?.split(",");

    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const schedule = await getSchedule(startDate, endDate, workCenterIds);

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Failed to fetch schedule:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}
