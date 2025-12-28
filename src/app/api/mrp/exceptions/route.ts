import { NextRequest, NextResponse } from "next/server";
import {
  detectExceptions,
  getExceptionSummary,
  getExceptions,
  resolveException,
  acknowledgeException,
  ignoreException,
  clearOldExceptions,
} from "@/lib/mrp";

// GET /api/mrp/exceptions - Get exceptions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const summary = searchParams.get("summary") === "true";
    const status = searchParams.get("status") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const exceptionType = searchParams.get("type") || undefined;
    const partId = searchParams.get("partId") || undefined;
    const siteId = searchParams.get("siteId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100");

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
    console.error("Exceptions GET error:", error);
    return NextResponse.json(
      { error: "Failed to get exceptions" },
      { status: 500 }
    );
  }
}

// POST /api/mrp/exceptions - Detect exceptions or take action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
    console.error("Exceptions POST error:", error);
    return NextResponse.json(
      { error: "Failed to process exception action" },
      { status: 500 }
    );
  }
}
