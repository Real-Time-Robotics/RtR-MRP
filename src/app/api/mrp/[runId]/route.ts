import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withAuth } from '@/lib/api/with-auth';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
// GET - Get MRP run details
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { runId } = await context.params;

    const run = await prisma.mrpRun.findUnique({
      where: { id: runId },
      include: {
        suggestions: {
          include: {
            part: true,
            supplier: true,
          },
          orderBy: [{ priority: "asc" }, { actionType: "asc" }],
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "MRP run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/mrp/[runId]' });
    return NextResponse.json(
      { error: "Failed to fetch MRP run" },
      { status: 500 }
    );
  }
});
