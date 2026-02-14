import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

// GET - List all products with BOM summary
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: { status: "active" },
      include: {
        bomHeaders: {
          where: { status: "active" },
          include: {
            bomLines: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const data = products.map((product) => {
      const activeBom = product.bomHeaders[0];
      const totalParts = activeBom?.bomLines.length || 0;

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        basePrice: product.basePrice || 0,
        status: product.status,
        bomVersion: activeBom?.version || "N/A",
        totalParts,
        hasBom: !!activeBom,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/bom/products' });
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
