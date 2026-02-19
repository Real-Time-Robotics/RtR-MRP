// src/app/api/compliance/sessions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withRoleAuth } from '@/lib/api/with-auth';
import {
  getUserActiveSessions,
  revokeSession,
  revokeAllUserSessions,
  getSessionStatistics,
} from "@/lib/compliance";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
export const GET = withRoleAuth(['admin'], async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "stats") {
      // Admin only
      const stats = await getSessionStatistics();
      return NextResponse.json(stats);
    }

    // Get user's active sessions
    const sessions = await getUserActiveSessions(session.user.id);
    return NextResponse.json({ sessions });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/compliance/sessions' });
    return NextResponse.json(
      { error: "Query failed" },
      { status: 500 }
    );
  }
});

export const DELETE = withRoleAuth(['admin'], async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get("token");
    const revokeAll = searchParams.get("all") === "true";

    if (revokeAll) {
      // Get current session token to exclude
      const currentToken = request.headers.get("authorization")?.split(" ")[1];
      const count = await revokeAllUserSessions(
        session.user.id,
        "user_initiated",
        currentToken
      );
      return NextResponse.json({ success: true, revokedCount: count });
    }

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Session token required" },
        { status: 400 }
      );
    }

    const success = await revokeSession(sessionToken, "user_initiated");

    if (!success) {
      return NextResponse.json(
        { error: "Failed to revoke session" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/compliance/sessions' });
    return NextResponse.json(
      { error: "Revocation failed" },
      { status: 500 }
    );
  }
});
