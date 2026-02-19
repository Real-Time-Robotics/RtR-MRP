// src/app/api/compliance/mfa/setup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { withRoleAuth } from '@/lib/api/with-auth';
import { setupMFA, verifyMFASetup } from "@/lib/compliance";
import { logger } from "@/lib/logger";

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
export const POST = withRoleAuth(['admin'], async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const bodySchema = z.object({
      action: z.string(),
      deviceName: z.string().optional(),
      code: z.string().optional(),
      deviceId: z.string().optional(),
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
});
