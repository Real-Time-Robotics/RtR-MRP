import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createReworkWorkOrder, completeReworkWO, getPendingReworkNCRs } from "@/lib/quality/rework-wo-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pending = await getPendingReworkNCRs();
    return NextResponse.json({ data: pending });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch pending rework NCRs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    if (body.action === "complete") {
      const result = await completeReworkWO(body.workOrderId, body.completedQty, session.user?.id || "system", body.notes);
      return NextResponse.json(result);
    }

    const result = await createReworkWorkOrder({
      ncrId: body.ncrId,
      reworkInstructions: body.reworkInstructions,
      quantity: body.quantity,
      priority: body.priority,
      userId: session.user?.id || "system",
      notes: body.notes,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to process rework request" }, { status: 500 });
  }
}
