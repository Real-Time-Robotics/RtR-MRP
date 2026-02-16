import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkPartialAvailability, releasePartialWorkOrder, getPartialReleaseCandidates } from "@/lib/manufacturing/partial-release-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workOrderId = searchParams.get("workOrderId");

    if (workOrderId) {
      const check = await checkPartialAvailability(workOrderId);
      return NextResponse.json(check);
    }

    const candidates = await getPartialReleaseCandidates();
    return NextResponse.json({ data: candidates });
  } catch (error) {
    return NextResponse.json({ error: "Failed to check partial availability" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workOrderId, releaseQty, notes } = await request.json();
    const result = await releasePartialWorkOrder(workOrderId, releaseQty, session.user?.id || "system", notes);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to release partial WO" }, { status: 500 });
  }
}
