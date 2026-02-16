import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runABCClassification, getABCSummary } from "@/lib/inventory/abc-classification";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const summary = await getABCSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch ABC summary" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const config = body.config || undefined;

    const result = await runABCClassification(config);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to run ABC classification" }, { status: 500 });
  }
}
