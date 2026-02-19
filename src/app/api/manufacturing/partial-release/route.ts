import { NextRequest, NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { checkPartialAvailability, releasePartialWorkOrder, getPartialReleaseCandidates } from "@/lib/manufacturing/partial-release-service";
import { z } from "zod";
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

const PartialReleaseSchema = z.object({
  workOrderId: z.string().min(1, "Work order ID is required"),
  releaseQty: z.number().int().min(1, "Release quantity must be at least 1"),
  notes: z.string().optional(),
});

export const GET = withAuth(async (request, context, session) => {
  try {

    const { searchParams } = new URL(request.url);
    const workOrderId = searchParams.get("workOrderId");

    if (workOrderId) {
      const check = await checkPartialAvailability(workOrderId);
      return NextResponse.json(check);
    }

    const candidates = await getPartialReleaseCandidates();
    return NextResponse.json({ data: candidates });
  } catch (error) {
    return NextResponse.json({ error: "Failed to check partial availability" }, { status: 500 });
  }
});

export const POST = withAuth(async (request, context, session) => {
  try {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();

    const validation = PartialReleaseSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { workOrderId, releaseQty, notes } = validation.data;
    const result = await releasePartialWorkOrder(workOrderId, releaseQty, session.user?.id || "system", notes);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to release partial WO" }, { status: 500 });
  }
});
