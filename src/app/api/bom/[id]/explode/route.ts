import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { explodeBOM } from "@/lib/bom-engine";
import { withAuth } from '@/lib/api/with-auth';
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const quantity = parseInt(searchParams.get("quantity") || "1");

    // Get product info
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, sku: true, name: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Explode BOM
    const { results, tree, summary } = await explodeBOM(id, quantity);

    return NextResponse.json({
      product,
      results,
      tree,
      summary,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/bom/[id]/explode' });
    return NextResponse.json(
      { error: "Failed to explode BOM" },
      { status: 500 }
    );
  }
});
