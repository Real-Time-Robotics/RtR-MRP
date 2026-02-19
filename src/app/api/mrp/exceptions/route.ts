import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  detectExceptions,
  getExceptionSummary,
  getExceptions,
  resolveException,
  acknowledgeException,
  ignoreException,
  clearOldExceptions,
} from "@/lib/mrp";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';

const exceptionBodySchema = z.object({
  action: z.enum(["detect", "resolve", "acknowledge", "ignore", "clear"]),
  exceptionId: z.string().optional(),
  userId: z.string().optional(),
  resolution: z.string().optional(),
  reason: z.string().optional(),
  mrpRunId: z.string().optional(),
  daysOld: z.number().optional(),
});

// GET /api/mrp/exceptions - Get exceptions
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const searchParams = request.nextUrl.searchParams;
    const summary = searchParams.get("summary") === "true";
    const status = searchParams.get("status") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const exceptionType = searchParams.get("type") || undefined;
    const partId = searchParams.get("partId") || undefined;
    const siteId = searchParams.get("siteId") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "100") || 100, 100);

    if (summary) {
      const summaryData = await getExceptionSummary(siteId);
      return NextResponse.json(summaryData);
    }

    const exceptions = await getExceptions({
      status,
      severity,
      exceptionType,
      partId,
      siteId,
      limit,
    });

    return NextResponse.json(exceptions);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/mrp/exceptions' });
    return NextResponse.json(
      { error: "Failed to get exceptions" },
      { status: 500 }
    );
  }
});

// POST /api/mrp/exceptions - Detect exceptions or take action
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const rawBody = await request.json();
    const parseResult = exceptionBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const { action, exceptionId, userId, resolution, reason, mrpRunId } = body;

    if (action === "detect") {
      const exceptions = await detectExceptions(mrpRunId);
      return NextResponse.json({
        success: true,
        count: exceptions.length,
        exceptions,
      });
    }

    if (action === "resolve") {
      if (!exceptionId || !resolution || !userId) {
        return NextResponse.json(
          { error: "exceptionId, resolution, and userId are required" },
          { status: 400 }
        );
      }
      await resolveException(exceptionId, resolution, userId);
      return NextResponse.json({ success: true });
    }

    if (action === "acknowledge") {
      if (!exceptionId || !userId) {
        return NextResponse.json(
          { error: "exceptionId and userId are required" },
          { status: 400 }
        );
      }
      await acknowledgeException(exceptionId, userId);
      return NextResponse.json({ success: true });
    }

    if (action === "ignore") {
      if (!exceptionId || !userId) {
        return NextResponse.json(
          { error: "exceptionId and userId are required" },
          { status: 400 }
        );
      }
      await ignoreException(exceptionId, userId, reason);
      return NextResponse.json({ success: true });
    }

    if (action === "clear") {
      const daysOld = body.daysOld || 30;
      const count = await clearOldExceptions(daysOld);
      return NextResponse.json({ success: true, cleared: count });
    }

    return NextResponse.json(
      { error: "Invalid action. Use: detect, resolve, acknowledge, ignore, or clear" },
      { status: 400 }
    );
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/mrp/exceptions' });
    return NextResponse.json(
      { error: "Failed to process exception action" },
      { status: 500 }
    );
  }
});
