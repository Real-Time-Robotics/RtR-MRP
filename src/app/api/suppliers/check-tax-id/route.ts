import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
/**
 * GET /api/suppliers/check-tax-id?taxId=xxx&excludeId=xxx
 * Check if a tax ID already exists (for duplicate warning)
 */
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const taxId = searchParams.get("taxId");
    const excludeId = searchParams.get("excludeId"); // For edit mode, exclude current supplier

    if (!taxId || taxId.trim() === "") {
      return NextResponse.json({ exists: false, supplier: null });
    }

    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        taxId: taxId.trim(),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        taxId: true,
      },
    });

    return NextResponse.json({
      exists: !!existingSupplier,
      supplier: existingSupplier,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/suppliers/check-tax-id' });
    return NextResponse.json({ error: "Lỗi kiểm tra mã số thuế" }, { status: 500 });
  }
});
