import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from '@/lib/api/with-auth';
import { runABCClassification, getABCSummary } from "@/lib/inventory/abc-classification";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const abcBodySchema = z.object({
  config: z.any().optional(),
});

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const summary = await getABCSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch ABC summary" }, { status: 500 });
  }
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = abcBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const config = parseResult.data.config || undefined;

    const result = await runABCClassification(config);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to run ABC classification" }, { status: 500 });
  }
});
