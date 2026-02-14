import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { explodeBOM } from "@/lib/bom-engine";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
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
      { error: error instanceof Error ? error.message : "Failed to explode BOM" },
      { status: 500 }
    );
  }
}
