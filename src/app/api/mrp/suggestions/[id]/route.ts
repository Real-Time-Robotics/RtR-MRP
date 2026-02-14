import { NextResponse } from "next/server";
import { approveSuggestion, rejectSuggestion } from "@/lib/mrp-engine";
import { logger } from "@/lib/logger";

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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PATCH /api/mrp/suggestions/[id]' });
    return NextResponse.json(
      { error: "Failed to update suggestion" },
      { status: 500 }
    );
  }
}
