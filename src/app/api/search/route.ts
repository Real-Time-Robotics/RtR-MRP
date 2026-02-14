import { NextRequest, NextResponse } from "next/server";
import { globalSearch } from "@/lib/search-engine";
import { auth } from "@/lib/auth";
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20") || 20, 100);

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await globalSearch(query, limit);
    return NextResponse.json({ results });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/search' });
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
