import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { getHoldInventory } from "@/lib/quality/hold-service";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const inventory = await getHoldInventory();
    return NextResponse.json({ inventory });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), {
      context: "GET /api/quality/hold",
    });
    return NextResponse.json({ error: "Failed to fetch HOLD inventory" }, { status: 500 });
  }
});
