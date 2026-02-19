import { NextRequest, NextResponse } from "next/server";
import { generateCoCPDF } from "@/lib/quality/coc-generator";
import { logger } from "@/lib/logger";
import { withAuth } from '@/lib/api/with-auth';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    const blob = await generateCoCPDF(id);

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", `attachment; filename="CoC-${id}.pdf"`);

    return new NextResponse(blob, { headers });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/quality/certificates/[id]/generate' });
    return NextResponse.json(
      { error: "Failed to generate certificate PDF" },
      { status: 500 }
    );
  }
});
