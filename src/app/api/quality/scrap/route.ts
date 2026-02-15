import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getScrapInventory } from "@/lib/quality/scrap-service";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inventory = await getScrapInventory();
    return NextResponse.json({ inventory });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), {
      context: "GET /api/quality/scrap",
    });
    return NextResponse.json({ error: "Failed to fetch SCRAP inventory" }, { status: 500 });
  }
}
