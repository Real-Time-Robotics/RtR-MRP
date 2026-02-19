import { NextRequest, NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { submitBomForApproval, approveBom, rejectBom, createNewBomVersion, getBomVersionHistory } from "@/lib/bom/bom-version-service";
import { z } from 'zod';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

    const history = await getBomVersionHistory(productId);
    return NextResponse.json({ data: history });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch BOM versions" }, { status: 500 });
  }
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const bodySchema = z.object({
      action: z.enum(['submit', 'approve', 'reject', 'new_version']),
      bomId: z.string().optional(),
      notes: z.string().optional(),
      activateImmediately: z.boolean().optional(),
      reason: z.string().optional(),
      productId: z.string().optional(),
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
    const userId = session.user?.id || "system";

    switch (body.action) {
      case "submit":
        if (!body.bomId) return NextResponse.json({ error: "bomId is required for submit" }, { status: 400 });
        return NextResponse.json(await submitBomForApproval(body.bomId, userId, body.notes));
      case "approve":
        if (!body.bomId) return NextResponse.json({ error: "bomId is required for approve" }, { status: 400 });
        return NextResponse.json(await approveBom(body.bomId, userId, body.activateImmediately, body.notes));
      case "reject":
        if (!body.bomId) return NextResponse.json({ error: "bomId is required for reject" }, { status: 400 });
        if (!body.reason) return NextResponse.json({ error: "reason is required for reject" }, { status: 400 });
        return NextResponse.json(await rejectBom(body.bomId, userId, body.reason));
      case "new_version":
        if (!body.productId) return NextResponse.json({ error: "productId is required for new_version" }, { status: 400 });
        return NextResponse.json(await createNewBomVersion(body.productId, userId, body.notes));
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to process BOM version action" }, { status: 500 });
  }
});
