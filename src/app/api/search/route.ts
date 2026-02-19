import { NextRequest, NextResponse } from "next/server";
import { globalSearch } from "@/lib/search-engine";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request: NextRequest, _context, _session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
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
});
