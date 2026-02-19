import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { pickForShipment } from "@/lib/mrp-engine";

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
// POST /api/shipments/[id]/pick — Pick items and stage in SHIP warehouse
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    const result = await pickForShipment(id, session.user?.id || 'system');

    return NextResponse.json({
      success: result.success,
      pickedItems: result.pickedItems,
      message: result.message,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to pick shipment items" },
      { status: 400 }
    );
  }
});
