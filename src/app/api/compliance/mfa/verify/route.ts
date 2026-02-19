// src/app/api/compliance/mfa/verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { verifyMFALogin, createMFAChallenge, verifyMFAChallenge } from "@/lib/compliance";
import { logger } from "@/lib/logger";
import { withAuth } from '@/lib/api/with-auth';

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
export const POST = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const bodySchema = z.object({
      action: z.string(),
      userId: z.string().optional(),
      code: z.string().optional(),
      challengeId: z.string().optional(),
      purpose: z.string().optional(),
    });

    const rawBody = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const { action, userId, code, challengeId, purpose } = body;
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";

    if (action === "login") {
      if (!userId || !code) {
        return NextResponse.json(
          { error: "userId and code required" },
          { status: 400 }
        );
      }

      const result = await verifyMFALogin(userId, code, ipAddress);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "challenge") {
      if (!userId || !purpose) {
        return NextResponse.json(
          { error: "userId and purpose required" },
          { status: 400 }
        );
      }

      const result = await createMFAChallenge(userId, purpose, ipAddress);

      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        challengeId: result.challengeId,
        expiresAt: result.expiresAt,
      });
    }

    if (action === "verify-challenge") {
      if (!challengeId || !code) {
        return NextResponse.json(
          { error: "challengeId and code required" },
          { status: 400 }
        );
      }

      const result = await verifyMFAChallenge(challengeId, code);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/compliance/mfa/verify' });
    return NextResponse.json(
      { error: "MFA verification failed" },
      { status: 500 }
    );
  }
});
