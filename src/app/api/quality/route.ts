import { NextResponse } from "next/server";
import { getQualityDashboardStats } from "@/lib/quality/quality-metrics";

export async function GET() {
  try {
    const stats = await getQualityDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to fetch quality stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch quality stats" },
      { status: 500 }
    );
  }
}
