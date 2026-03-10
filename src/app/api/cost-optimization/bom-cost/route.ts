import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkReadEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (request, _context, _session) => {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

    // Fetch product with active/draft BOM
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        bomHeaders: {
          where: { status: { in: ["active", "draft"] } },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          take: 1,
          include: {
            bomLines: {
              include: {
                part: {
                  select: {
                    id: true,
                    partNumber: true,
                    name: true,
                    category: true,
                    unitCost: true,
                    makeOrBuy: true,
                    ndaaCompliant: true,
                  },
                },
              },
              orderBy: [{ moduleCode: "asc" }, { lineNumber: "asc" }],
            },
          },
        },
        costTargets: {
          where: { status: { in: ["ACTIVE", "ON_TRACK", "AT_RISK"] } },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const bom = product.bomHeaders[0];
    if (!bom) {
      return NextResponse.json({
        product: { id: product.id, name: product.name, sku: product.sku },
        bomHeader: null,
        totalCost: 0,
        makeCost: 0,
        buyCost: 0,
        makePercent: 0,
        buyPercent: 0,
        targetCost: null,
        costGap: null,
        items: [],
        byModule: [],
        byMakeVsBuy: {
          make: { cost: 0, percent: 0, count: 0 },
          buy: { cost: 0, percent: 0, count: 0 },
          both: { cost: 0, percent: 0, count: 0 },
        },
        byCategory: [],
        topCostDrivers: [],
      });
    }

    // Build items
    let totalCost = 0;
    let makeCost = 0;
    let buyCost = 0;
    let makeCount = 0;
    let buyCount = 0;
    let bothCount = 0;

    const moduleMap = new Map<
      string,
      { moduleCode: string; moduleName: string; cost: number; partCount: number }
    >();
    const categoryMap = new Map<string, number>();

    // Check for sub-BOMs
    const partNumbers = bom.bomLines.map((l) => l.part.partNumber);
    const subBomProducts = partNumbers.length > 0
      ? await prisma.product.findMany({
          where: {
            sku: { in: partNumbers },
            bomHeaders: { some: { status: { in: ["active", "draft"] } } },
          },
          select: { sku: true },
        })
      : [];
    const subBomSkus = new Set(subBomProducts.map((p) => p.sku));

    const items = bom.bomLines.map((line) => {
      const unitCost = line.part.unitCost || 0;
      const lineCost = line.quantity * unitCost;

      totalCost += lineCost;

      const makeOrBuy = line.part.makeOrBuy || "BUY";
      if (makeOrBuy === "MAKE") {
        makeCost += lineCost;
        makeCount++;
      } else if (makeOrBuy === "BOTH") {
        // Split cost evenly for "BOTH"
        makeCost += lineCost / 2;
        buyCost += lineCost / 2;
        bothCount++;
      } else {
        buyCost += lineCost;
        buyCount++;
      }

      // Module aggregation
      const modCode = line.moduleCode || "MISC";
      const modName = line.moduleName || "Miscellaneous";
      const existing = moduleMap.get(modCode);
      if (existing) {
        existing.cost += lineCost;
        existing.partCount++;
      } else {
        moduleMap.set(modCode, {
          moduleCode: modCode,
          moduleName: modName,
          cost: lineCost,
          partCount: 1,
        });
      }

      // Category aggregation
      const cat = line.part.category || "Uncategorized";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + lineCost);

      return {
        partId: line.part.id,
        partNumber: line.part.partNumber,
        name: line.part.name,
        category: line.part.category,
        quantity: line.quantity,
        unit: line.unit,
        unitCost,
        totalCost: lineCost,
        costPercent: 0, // calculated below
        makeOrBuy,
        ndaaCompliant: line.part.ndaaCompliant,
        moduleCode: line.moduleCode,
        moduleName: line.moduleName,
        isCritical: line.isCritical,
        hasSubBom: subBomSkus.has(line.part.partNumber),
      };
    });

    // Calculate percentages
    items.forEach((item) => {
      item.costPercent = totalCost > 0 ? (item.totalCost / totalCost) * 100 : 0;
    });

    const byModule = Array.from(moduleMap.values()).map((m) => ({
      ...m,
      percent: totalCost > 0 ? (m.cost / totalCost) * 100 : 0,
    }));

    const byCategory = Array.from(categoryMap.entries())
      .map(([category, cost]) => ({
        category,
        cost,
        percent: totalCost > 0 ? (cost / totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost);

    const bothCost = totalCost - makeCost - buyCost;
    const byMakeVsBuy = {
      make: {
        cost: makeCost,
        percent: totalCost > 0 ? (makeCost / totalCost) * 100 : 0,
        count: makeCount,
      },
      buy: {
        cost: buyCost,
        percent: totalCost > 0 ? (buyCost / totalCost) * 100 : 0,
        count: buyCount,
      },
      both: {
        cost: bothCost,
        percent: totalCost > 0 ? (bothCost / totalCost) * 100 : 0,
        count: bothCount,
      },
    };

    const topCostDrivers = [...items]
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10)
      .map(({ partId, partNumber, name, totalCost: tc, costPercent, makeOrBuy }) => ({
        partId,
        partNumber,
        name,
        totalCost: tc,
        costPercent,
        makeOrBuy,
      }));

    const costTarget = product.costTargets[0];

    return NextResponse.json({
      product: { id: product.id, name: product.name, sku: product.sku },
      bomHeader: { id: bom.id, version: bom.version, status: bom.status },
      totalCost,
      makeCost,
      buyCost,
      makePercent: totalCost > 0 ? (makeCost / totalCost) * 100 : 0,
      buyPercent: totalCost > 0 ? (buyCost / totalCost) * 100 : 0,
      targetCost: costTarget?.targetCost ?? null,
      costGap: costTarget ? totalCost - costTarget.targetCost : null,
      items,
      byModule,
      byMakeVsBuy,
      byCategory,
      topCostDrivers,
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/bom-cost" }
    );
    return NextResponse.json(
      { error: "Failed to fetch BOM cost analysis" },
      { status: 500 }
    );
  }
});
