import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getHoldInventory } from "@/lib/quality/hold-service";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inventory = await getHoldInventory();
    return NextResponse.json({ inventory });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), {
      context: "GET /api/quality/hold",
    });
    return NextResponse.json({ error: "Failed to fetch HOLD inventory" }, { status: 500 });
  }
}
