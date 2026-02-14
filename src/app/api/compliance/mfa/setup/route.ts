// src/app/api/compliance/mfa/setup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setupMFA, verifyMFASetup } from "@/lib/compliance";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, deviceName, code, deviceId } = body;

    if (action === "setup") {
      const result = await setupMFA(session.user.id, deviceName || "Authenticator App");

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        deviceId: result.deviceId,
        secret: result.secret,
        qrCodeUrl: result.qrCodeUrl,
        backupCodes: result.backupCodes,
      });
    }

    if (action === "verify") {
      if (!code || !deviceId) {
        return NextResponse.json(
          { error: "Code and deviceId required" },
          { status: 400 }
        );
      }

      const result = await verifyMFASetup(session.user.id, deviceId, code);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/compliance/mfa/setup' });
    return NextResponse.json(
      { error: "MFA setup failed" },
      { status: 500 }
    );
  }
}
