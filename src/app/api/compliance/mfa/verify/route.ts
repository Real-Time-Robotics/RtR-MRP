// src/app/api/compliance/mfa/verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyMFALogin, createMFAChallenge, verifyMFAChallenge } from "@/lib/compliance";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
    console.error("MFA verification error:", error);
    return NextResponse.json(
      { error: "MFA verification failed" },
      { status: 500 }
    );
  }
}
