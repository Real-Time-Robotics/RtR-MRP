import { NextRequest, NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { generateCycleCountList, recordCycleCount } from "@/lib/inventory/cycle-count-service";
import { z } from "zod";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
const CycleCountSchema = z.object({
  inventoryId: z.string().min(1, "Inventory ID is required"),
  countedQty: z.number({ error: "Counted quantity is required" }),
  notes: z.string().optional(),
});

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const maxItems = parseInt(searchParams.get("maxItems") || "50");

    const items = await generateCycleCountList(warehouseId, maxItems);
    return NextResponse.json({ data: items, total: items.length });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate cycle count list" }, { status: 500 });
  }
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const body = await request.json();
    const validation = CycleCountSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { inventoryId, countedQty, notes } = validation.data;
    const result = await recordCycleCount(inventoryId, countedQty, session.user?.id || "system", notes);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to record cycle count" }, { status: 500 });
  }
});
