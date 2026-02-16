import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendToSubcontractor, receiveFromSubcontractor, getPendingSubcontractShipments, getSubcontractingSummary } from "@/lib/manufacturing/subcontracting-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [pending, summary] = await Promise.all([
      getPendingSubcontractShipments(),
      getSubcontractingSummary(),
    ]);
    return NextResponse.json({ data: pending, summary });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch subcontracting data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const userId = session.user?.id || "system";

    if (body.action === "receive") {
      const result = await receiveFromSubcontractor({ ...body, userId });
      return NextResponse.json(result);
    }

    const result = await sendToSubcontractor({ ...body, userId });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to process subcontracting" }, { status: 500 });
  }
}
