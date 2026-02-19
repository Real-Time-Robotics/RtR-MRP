// src/app/api/compliance/audit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withRoleAuth } from '@/lib/api/with-auth';
import {
  searchAuditTrail,
  verifyAuditTrailIntegrity,
  getEntityHistory,
  generateAuditReport,
} from "@/lib/compliance";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
export const GET = withRoleAuth(['admin'], async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "verify") {
      const fromDate = searchParams.get("fromDate");
      const toDate = searchParams.get("toDate");

      const result = await verifyAuditTrailIntegrity({
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
        limit: 10000,
      });

      return NextResponse.json(result);
    }

    if (action === "history") {
      const entityType = searchParams.get("entityType");
      const entityId = searchParams.get("entityId");

      if (!entityType || !entityId) {
        return NextResponse.json(
          { error: "entityType and entityId required" },
          { status: 400 }
        );
      }

      const history = await getEntityHistory(entityType, entityId);
      return NextResponse.json({ entries: history });
    }

    if (action === "report") {
      const fromDate = searchParams.get("fromDate");
      const toDate = searchParams.get("toDate");

      if (!fromDate || !toDate) {
        return NextResponse.json(
          { error: "fromDate and toDate required for report" },
          { status: 400 }
        );
      }

      const report = await generateAuditReport({
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
      });

      return NextResponse.json(report);
    }

    // Default: search
    const userId = searchParams.get("userId") || undefined;
    const actionFilter = searchParams.get("actionFilter") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const isSecurityEvent = searchParams.get("isSecurityEvent");
    const searchText = searchParams.get("search") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50") || 50, 100);
    const offset = parseInt(searchParams.get("offset") || "0") || 0;

    const result = await searchAuditTrail({
      userId,
      action: actionFilter as "CREATE" | "READ" | "UPDATE" | "DELETE" | "EXPORT" | "LOGIN" | undefined,
      entityType,
      entityId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      isSecurityEvent: isSecurityEvent === "true" ? true : undefined,
      searchText,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/compliance/audit' });
    return NextResponse.json(
      { error: "Query failed" },
      { status: 500 }
    );
  }
});
