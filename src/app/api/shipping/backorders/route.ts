import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { detectBackorders, processBackorders, getBackorderSummary } from "@/lib/shipping/backorder-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [backorders, summary] = await Promise.all([
      detectBackorders(),
      getBackorderSummary(),
    ]);
    return NextResponse.json({ data: backorders, summary });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch backorders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await processBackorders(session.user?.id || "system");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to process backorders" }, { status: 500 });
  }
}
