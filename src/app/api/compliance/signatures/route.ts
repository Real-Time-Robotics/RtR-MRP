// src/app/api/compliance/signatures/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { withRoleAuth } from '@/lib/api/with-auth';
import {
  createElectronicSignature,
  verifySignatureChain,
  getSignatureHistory,
  getWorkflowStatus,
} from "@/lib/compliance";
import { logger } from "@/lib/logger";

import { checkWriteEndpointLimit, checkReadEndpointLimit } from '@/lib/rate-limit';
export const POST = withRoleAuth(['admin'], async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const bodySchema = z.object({
      entityType: z.string(),
      entityId: z.string(),
      action: z.enum(["APPROVE", "REJECT", "REVIEW", "RELEASE", "VERIFY", "COMPLETE", "AUTHOR", "WITNESS"]),
      meaning: z.string().optional(),
      verificationMethod: z.enum(["password", "mfa_totp", "biometric"]).optional(),
      password: z.string().optional(),
      totpCode: z.string().optional(),
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
    const { entityType, entityId, action, meaning, verificationMethod, password, totpCode } = body;

    if (!entityType || !entityId || !action) {
      return NextResponse.json(
        { error: "entityType, entityId, and action are required" },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await createElectronicSignature(
      {
        userId: session.user.id,
        entityType,
        entityId,
        action,
        meaning,
        verificationMethod: verificationMethod || "password",
        ipAddress,
        userAgent,
      },
      { password, totpCode }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      signatureId: result.signatureId,
      signatureHash: result.signatureHash,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/compliance/signatures' });
    return NextResponse.json(
      { error: "Signature creation failed" },
      { status: 500 }
    );
  }
});

export const GET = withRoleAuth(['admin'], async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const action = searchParams.get("action");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    if (action === "verify") {
      const result = await verifySignatureChain(entityType, entityId);
      return NextResponse.json(result);
    }

    if (action === "workflow") {
      const result = await getWorkflowStatus(entityType, entityId);
      return NextResponse.json(result);
    }

    // Default: get signature history
    const history = await getSignatureHistory(entityType, entityId);
    return NextResponse.json({ signatures: history });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/compliance/signatures' });
    return NextResponse.json(
      { error: "Query failed" },
      { status: 500 }
    );
  }
});
