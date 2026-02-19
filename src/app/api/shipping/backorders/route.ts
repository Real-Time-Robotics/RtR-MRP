import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { detectBackorders, processBackorders, getBackorderSummary } from "@/lib/shipping/backorder-service";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const [backorders, summary] = await Promise.all([
      detectBackorders(),
      getBackorderSummary(),
    ]);
    return NextResponse.json({ data: backorders, summary });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch backorders" }, { status: 500 });
  }
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const result = await processBackorders(session.user?.id || "system");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to process backorders" }, { status: 500 });
  }
});
