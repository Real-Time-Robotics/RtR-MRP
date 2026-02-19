import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
// GET - List all manufacturers (from Supplier table)
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    // Get all active suppliers as manufacturers
    const suppliers = await prisma.supplier.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Return supplier names as manufacturer options
    const manufacturers = suppliers.map((s) => s.name);

    return NextResponse.json({
      data: manufacturers,
      total: manufacturers.length,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/parts/manufacturers' });
    return NextResponse.json(
      { error: "Đã xảy ra lỗi", code: "PARTS_MANUFACTURER_ERROR" },
      { status: 500 }
    );
  }
});
