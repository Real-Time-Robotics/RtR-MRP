import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import { allocateMaterials, regenerateAllocations } from "@/lib/mrp-engine";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';
// POST - Allocate materials to work order
// Auto-regenerates allocations from BOM if none exist
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    // Check if WO has any allocations; if not, regenerate from BOM first
    const existingCount = await prisma.materialAllocation.count({
      where: { workOrderId: id },
    });

    if (existingCount === 0) {
      const regenResult = await regenerateAllocations(id);
      if (!regenResult.regenerated) {
        return NextResponse.json({
          error: regenResult.reason || "Khong the tao danh sach vat tu. Kiem tra BOM da active chua.",
          allocations: [],
          fullyAllocated: false,
        }, { status: 400 });
      }
    }

    const result = await allocateMaterials(id);

    return NextResponse.json(result);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/production/[id]/allocate' });
    return NextResponse.json(
      { error: "Failed to allocate materials" },
      { status: 500 }
    );
  }
});
