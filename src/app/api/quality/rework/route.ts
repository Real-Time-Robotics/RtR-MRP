import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { createReworkWorkOrder, completeReworkWO, getPendingReworkNCRs } from "@/lib/quality/rework-wo-service";
import { z } from "zod";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
const ReworkCompleteSchema = z.object({
  action: z.literal("complete"),
  workOrderId: z.string().min(1, "Work order ID is required"),
  completedQty: z.number().int().min(0, "Completed quantity must be >= 0"),
  notes: z.string().optional(),
});

const ReworkCreateSchema = z.object({
  action: z.string().optional(),
  ncrId: z.string().min(1, "NCR ID is required"),
  reworkInstructions: z.string().min(1, "Rework instructions are required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  priority: z.string().optional(),
  notes: z.string().optional(),
});

const ReworkBodySchema = z.union([ReworkCompleteSchema, ReworkCreateSchema]);

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const pending = await getPendingReworkNCRs();
    return NextResponse.json({ data: pending });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch pending rework NCRs" }, { status: 500 });
  }
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const body = await request.json();

    const validation = ReworkBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    if (data.action === "complete" && "workOrderId" in data) {
      const result = await completeReworkWO(data.workOrderId, data.completedQty, session.user?.id || "system", data.notes);
      return NextResponse.json(result);
    }

    if ("ncrId" in data) {
      const result = await createReworkWorkOrder({
        ncrId: data.ncrId,
        reworkInstructions: data.reworkInstructions,
        quantity: data.quantity,
        priority: data.priority,
        userId: session.user?.id || "system",
        notes: data.notes,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process rework request" }, { status: 500 });
  }
});
