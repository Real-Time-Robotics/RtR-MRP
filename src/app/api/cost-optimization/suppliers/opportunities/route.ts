import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkReadEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  detectConsolidationOpportunities,
  detectNegotiationOpportunities,
  detectLocalSourceOpportunities,
  detectSwitchSupplierOpportunities,
  SupplierSpendData,
} from "@/lib/cost-optimization/supplier-optimization";

export const GET = withAuth(async (request, _context, _session) => {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    // Get spend data grouped by supplier with part details
    const supplierSpendRaw = await prisma.$queryRaw<
      {
        supplierId: string;
        supplierName: string;
        supplierCountry: string;
        totalSpend: number;
        orderCount: number;
        avgOrderValue: number;
      }[]
    >`
      SELECT
        s.id as "supplierId",
        s.name as "supplierName",
        s.country as "supplierCountry",
        COALESCE(SUM(pol."lineTotal"), 0)::float as "totalSpend",
        COUNT(DISTINCT po.id)::int as "orderCount",
        CASE WHEN COUNT(DISTINCT po.id) > 0
          THEN (COALESCE(SUM(pol."lineTotal"), 0) / COUNT(DISTINCT po.id))::float
          ELSE 0
        END as "avgOrderValue"
      FROM suppliers s
      LEFT JOIN purchase_orders po ON po."supplierId" = s.id
      LEFT JOIN purchase_order_lines pol ON pol."poId" = po.id
      WHERE s.status = 'active'
      GROUP BY s.id, s.name, s.country
      HAVING COALESCE(SUM(pol."lineTotal"), 0) > 0
      ORDER BY "totalSpend" DESC
    `;

    // Get parts per supplier
    const supplierParts = await prisma.$queryRaw<
      {
        supplierId: string;
        partId: string;
        partNumber: string;
        totalSpend: number;
        totalQty: number;
        avgUnitPrice: number;
      }[]
    >`
      SELECT
        po."supplierId" as "supplierId",
        p.id as "partId",
        p."partNumber" as "partNumber",
        COALESCE(SUM(pol."lineTotal"), 0)::float as "totalSpend",
        COALESCE(SUM(pol.quantity), 0)::int as "totalQty",
        CASE WHEN SUM(pol.quantity) > 0
          THEN (SUM(pol."lineTotal") / SUM(pol.quantity))::float
          ELSE 0
        END as "avgUnitPrice"
      FROM purchase_order_lines pol
      JOIN purchase_orders po ON po.id = pol."poId"
      JOIN parts p ON p.id = pol."partId"
      GROUP BY po."supplierId", p.id, p."partNumber"
    `;

    // Build SupplierSpendData
    const supplierData: SupplierSpendData[] = supplierSpendRaw.map((s) => ({
      supplierId: s.supplierId,
      supplierName: s.supplierName,
      totalSpend: s.totalSpend,
      orderCount: s.orderCount,
      avgOrderValue: s.avgOrderValue,
      parts: supplierParts
        .filter((p) => p.supplierId === s.supplierId)
        .map((p) => ({
          partId: p.partId,
          partNumber: p.partNumber,
          spend: p.totalSpend,
          quantity: p.totalQty,
          unitPrice: p.avgUnitPrice,
        })),
    }));

    // Build country map
    const supplierCountries: Record<string, string> = {};
    for (const s of supplierSpendRaw) {
      supplierCountries[s.supplierId] = s.supplierCountry || "";
    }

    // Detect all opportunity types
    const consolidation = detectConsolidationOpportunities(supplierData);
    const negotiation = detectNegotiationOpportunities(supplierData);
    const localSource = detectLocalSourceOpportunities(supplierData, supplierCountries);

    // Switch supplier: find parts with multiple suppliers at different prices
    const partWithMultipleSuppliers = await prisma.$queryRaw<
      {
        partId: string;
        partNumber: string;
        supplierId: string;
        supplierName: string;
        avgPrice: number;
        ndaaCompliant: boolean;
        rating: number;
      }[]
    >`
      SELECT
        p.id as "partId",
        p."partNumber",
        s.id as "supplierId",
        s.name as "supplierName",
        ps."unitPrice"::float as "avgPrice",
        s."ndaaCompliant",
        COALESCE(s.rating, 5)::float as "rating"
      FROM part_suppliers ps
      JOIN parts p ON p.id = ps."partId"
      JOIN suppliers s ON s.id = ps."supplierId"
      WHERE s.status = 'active'
      ORDER BY p.id, ps."unitPrice" ASC
    `;

    // Group by part
    const partMap = new Map<
      string,
      {
        partId: string;
        partNumber: string;
        suppliers: {
          supplierId: string;
          supplierName: string;
          price: number;
          ndaaCompliant: boolean;
          qualityRating: number;
        }[];
      }
    >();

    for (const row of partWithMultipleSuppliers) {
      if (!partMap.has(row.partId)) {
        partMap.set(row.partId, {
          partId: row.partId,
          partNumber: row.partNumber,
          suppliers: [],
        });
      }
      partMap.get(row.partId)!.suppliers.push({
        supplierId: row.supplierId,
        supplierName: row.supplierName,
        price: row.avgPrice,
        ndaaCompliant: row.ndaaCompliant,
        qualityRating: row.rating,
      });
    }

    // Build switch supplier input for parts with 2+ suppliers
    const switchInput = Array.from(partMap.values())
      .filter((p) => p.suppliers.length >= 2)
      .map((p) => {
        const current = p.suppliers[p.suppliers.length - 1]; // Most expensive as "current"
        return {
          partId: p.partId,
          partNumber: p.partNumber,
          currentSupplierId: current.supplierId,
          currentSupplierName: current.supplierName,
          currentPrice: current.price,
          annualVolume: 1000, // Estimate
          alternativeSuppliers: p.suppliers.filter(
            (s) => s.supplierId !== current.supplierId
          ),
        };
      });

    const switchOpportunities = detectSwitchSupplierOpportunities(switchInput);

    const allOpportunities = [
      ...consolidation,
      ...switchOpportunities,
      ...negotiation,
      ...localSource,
    ];

    const totalPotentialSavings = allOpportunities.reduce(
      (sum, o) => sum + o.potentialSavings,
      0
    );

    return NextResponse.json({
      opportunities: allOpportunities,
      summary: {
        totalOpportunities: allOpportunities.length,
        totalPotentialSavings,
        byType: {
          consolidate: consolidation.length,
          switchSupplier: switchOpportunities.length,
          negotiate: negotiation.length,
          localSource: localSource.length,
        },
      },
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/suppliers/opportunities" }
    );
    return NextResponse.json(
      { error: "Failed to detect opportunities" },
      { status: 500 }
    );
  }
});
