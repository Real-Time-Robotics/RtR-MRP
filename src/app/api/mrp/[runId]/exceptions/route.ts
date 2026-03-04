import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";
import { checkReadEndpointLimit } from "@/lib/rate-limit";

// GET /api/mrp/[runId]/exceptions — Get exceptions grouped by type for a specific MRP run
export const GET = withAuth(async (request, context, _session) => {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { runId } = await context.params;

    // Verify MRP run exists
    const mrpRun = await prisma.mrpRun.findUnique({ where: { id: runId } });
    if (!mrpRun) {
      return NextResponse.json({ error: "MRP run not found" }, { status: 404 });
    }

    // Fetch exceptions for this run with part info
    const exceptions = await prisma.mRPException.findMany({
      where: { mrpRunId: runId },
      include: {
        part: { select: { id: true, partNumber: true, name: true } },
      },
      orderBy: [{ severity: "asc" }, { exceptionType: "asc" }],
    });

    // Group by exceptionType
    const groupMap = new Map<
      string,
      {
        type: string;
        severity: string;
        message: string;
        suggestedAction: string | null;
        items: Array<{
          id: string;
          partId: string | null;
          partNumber: string | null;
          partDescription: string | null;
          details: {
            status: string;
            quantity: number | null;
            currentDate: string | null;
            suggestedDate: string | null;
          };
        }>;
      }
    >();

    const suggestedActions: Record<string, string> = {
      MISSING_LEAD_TIME: "Cập nhật Lead Time trong Part Planning",
      MAKE_NO_BOM: "Tạo BOM cho part này",
      DRAFT_BOM_ONLY: "Release BOM sang trạng thái active",
      NO_SUPPLIER: "Gán nhà cung cấp cho part",
      SINGLE_SOURCE: "Tìm nhà cung cấp thay thế",
      INACTIVE_SUPPLIER: "Kiểm tra và kích hoạt lại nhà cung cấp",
      CYCLE_DETECTED: "Kiểm tra và sửa vòng lặp BOM",
      EXPEDITE_REQUIRED: "Liên hệ nhà cung cấp để đẩy nhanh",
      STOCK_BLOCKED: "Kiểm tra tồn kho bị block",
    };

    for (const e of exceptions) {
      if (!groupMap.has(e.exceptionType)) {
        groupMap.set(e.exceptionType, {
          type: e.exceptionType,
          severity: e.severity,
          message: e.message,
          suggestedAction: suggestedActions[e.exceptionType] || null,
          items: [],
        });
      }

      groupMap.get(e.exceptionType)!.items.push({
        id: e.id,
        partId: e.part?.id || null,
        partNumber: e.part?.partNumber || null,
        partDescription: e.part?.name || null,
        details: {
          status: e.status,
          quantity: e.quantity ? Number(e.quantity) : null,
          currentDate: e.currentDate?.toISOString() || null,
          suggestedDate: e.suggestedDate?.toISOString() || null,
        },
      });
    }

    // Sort groups: CRITICAL first, then WARNING, then INFO
    const severityOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    const byType = Array.from(groupMap.values()).sort(
      (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
    );

    // Count by severity
    const counts = {
      critical: exceptions.filter((e) => e.severity === "CRITICAL").length,
      warning: exceptions.filter((e) => e.severity === "WARNING").length,
      info: exceptions.filter((e) => e.severity === "INFO").length,
    };

    return NextResponse.json({
      byType,
      total: exceptions.length,
      counts,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), {
      context: "GET /api/mrp/[runId]/exceptions",
    });
    return NextResponse.json({ error: "Failed to fetch exceptions" }, { status: 500 });
  }
});
