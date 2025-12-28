import { NextResponse } from "next/server";
import { approveSuggestion, rejectSuggestion } from "@/lib/mrp-engine";

// PATCH - Approve or reject suggestion
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, createPO = false, userId = "system" } = body;

    if (action === "approve") {
      const result = await approveSuggestion(id, userId, createPO);
      return NextResponse.json(result);
    } else if (action === "reject") {
      const result = await rejectSuggestion(id, userId);
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Suggestion API error:", error);
    return NextResponse.json(
      { error: "Failed to update suggestion" },
      { status: 500 }
    );
  }
}
