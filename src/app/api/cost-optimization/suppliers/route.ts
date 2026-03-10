import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkReadEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (request, _context, _session) => {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    // Get spend by supplier from PO lines
    const spendData = await prisma.$queryRaw<
      {
        supplierId: string;
        supplierName: string;
        totalSpend: number;
        orderCount: number;
        partCount: number;
      }[]
    >`
      SELECT
        s.id as "supplierId",
        s.name as "supplierName",
        COALESCE(SUM(pol."lineTotal"), 0)::float as "totalSpend",
        COUNT(DISTINCT po.id)::int as "orderCount",
        COUNT(DISTINCT pol."partId")::int as "partCount"
      FROM suppliers s
      LEFT JOIN purchase_orders po ON po."supplierId" = s.id
      LEFT JOIN purchase_order_lines pol ON pol."poId" = po.id
      WHERE s.status = 'active'
      GROUP BY s.id, s.name
      ORDER BY "totalSpend" DESC
    `;

    const totalSpend = spendData.reduce((sum, s) => sum + (s.totalSpend || 0), 0);
    const activeSuppliers = spendData.filter((s) => s.totalSpend > 0).length;

    // Top 10 for chart
    const topSuppliers = spendData.slice(0, 10).map((s) => ({
      ...s,
      percent: totalSpend > 0 ? (s.totalSpend / totalSpend) * 100 : 0,
    }));

    // Others
    const othersSpend = spendData
      .slice(10)
      .reduce((sum, s) => sum + (s.totalSpend || 0), 0);

    if (othersSpend > 0) {
      topSuppliers.push({
        supplierId: "others",
        supplierName: "Others",
        totalSpend: othersSpend,
        orderCount: 0,
        partCount: 0,
        percent: totalSpend > 0 ? (othersSpend / totalSpend) * 100 : 0,
      });
    }

    return NextResponse.json({
      summary: {
        totalSpend,
        supplierCount: activeSuppliers,
        totalSuppliers: spendData.length,
      },
      topSuppliers,
      allSuppliers: spendData,
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/suppliers" }
    );
    return NextResponse.json(
      { error: "Failed to fetch supplier spend" },
      { status: 500 }
    );
  }
});
