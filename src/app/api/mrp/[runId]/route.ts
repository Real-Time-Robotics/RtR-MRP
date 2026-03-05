import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withAuth } from '@/lib/api/with-auth';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
// GET - Get MRP run details
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { runId } = await context.params;

    const run = await prisma.mrpRun.findUnique({
      where: { id: runId },
      include: {
        suggestions: {
          include: {
            part: true,
            supplier: true,
          },
          orderBy: [{ priority: "asc" }, { actionType: "asc" }],
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "MRP run not found" }, { status: 404 });
    }

    // --- Fetch scheduled receipts (open PO quantities) for all parts ---
    const allPoLines = await prisma.purchaseOrderLine.findMany({
      where: {
        po: { status: { in: ['confirmed', 'in_progress'] } },
      },
      select: {
        partId: true,
        quantity: true,
        receivedQty: true,
      },
    });
    // Aggregate: partId → total open qty
    const onOrderMap = new Map<string, number>();
    for (const line of allPoLines) {
      const openQty = line.quantity - line.receivedQty;
      if (openQty > 0) {
        onOrderMap.set(line.partId, (onOrderMap.get(line.partId) || 0) + openQty);
      }
    }

    // Enrich suggestions with BOM children data
    // Collect all partNumbers from suggestions
    const partNumbers = run.suggestions.map(s => s.part.partNumber);

    // Find products matching these part numbers (by SKU) that have active BOMs
    const productsWithBom = partNumbers.length > 0
      ? await prisma.product.findMany({
          where: {
            sku: { in: partNumbers },
            bomHeaders: { some: { status: "active" } },
          },
          include: {
            bomHeaders: {
              where: { status: "active" },
              take: 1,
              include: {
                bomLines: {
                  include: {
                    part: {
                      include: {
                        inventory: {
                          select: { quantity: true, reservedQty: true },
                        },
                      },
                    },
                  },
                  orderBy: [{ moduleCode: "asc" }, { lineNumber: "asc" }],
                },
              },
            },
          },
        })
      : [];

    // Build BOM child type
    interface BomChildData {
      partId: string;
      partNumber: string;
      name: string;
      quantity: number;
      unit: string;
      stock: number;
      onOrder: number;
      isCritical: boolean;
      totalDemandAll?: number;
      children?: BomChildData[];
    }

    // Build map: partNumber → children (level 1)
    const bomChildrenMap = new Map<string, BomChildData[]>();

    // Collect all child part numbers for level 2 lookup
    const childPartNumbers: string[] = [];

    for (const product of productsWithBom) {
      const bom = product.bomHeaders[0];
      if (!bom) continue;
      const children = bom.bomLines.map(line => {
        childPartNumbers.push(line.part.partNumber);
        return {
          partId: line.part.id,
          partNumber: line.part.partNumber,
          name: line.part.name,
          quantity: line.quantity,
          unit: line.unit,
          stock: line.part.inventory.reduce(
            (sum: number, inv: { quantity: number; reservedQty: number }) => sum + inv.quantity - inv.reservedQty,
            0
          ),
          onOrder: onOrderMap.get(line.part.id) || 0,
          isCritical: line.isCritical,
        };
      });
      bomChildrenMap.set(product.sku, children);
    }

    // Level 2: fetch sub-BOM children for the children themselves
    const subProductsL2 = childPartNumbers.length > 0
      ? await prisma.product.findMany({
          where: {
            sku: { in: childPartNumbers },
            bomHeaders: { some: { status: "active" } },
          },
          include: {
            bomHeaders: {
              where: { status: "active" },
              take: 1,
              include: {
                bomLines: {
                  include: {
                    part: {
                      include: {
                        inventory: {
                          select: { quantity: true, reservedQty: true },
                        },
                      },
                    },
                  },
                  orderBy: [{ moduleCode: "asc" }, { lineNumber: "asc" }],
                },
              },
            },
          },
        })
      : [];

    // Build level 2 map
    const l2Map = new Map<string, BomChildData[]>();
    for (const sp of subProductsL2) {
      const bom = sp.bomHeaders[0];
      if (!bom || bom.bomLines.length === 0) continue;
      l2Map.set(
        sp.sku,
        bom.bomLines.map(line => ({
          partId: line.part.id,
          partNumber: line.part.partNumber,
          name: line.part.name,
          quantity: line.quantity,
          unit: line.unit,
          stock: line.part.inventory.reduce(
            (sum: number, inv: { quantity: number; reservedQty: number }) => sum + inv.quantity - inv.reservedQty,
            0
          ),
          onOrder: onOrderMap.get(line.part.id) || 0,
          isCritical: line.isCritical,
        }))
      );
    }

    // Attach level 2 children to level 1 children
    for (const [, children] of bomChildrenMap) {
      for (const child of children) {
        const subChildren = l2Map.get(child.partNumber);
        if (subChildren) {
          child.children = subChildren;
        }
      }
    }

    // Attach children + onOrder to each suggestion
    const enrichedSuggestions = run.suggestions.map(s => ({
      ...s,
      onOrder: onOrderMap.get(s.partId) || 0,
      bomChildren: bomChildrenMap.get(s.part.partNumber) || [],
    }));

    // --- Aggregate total demand per child partId across ALL suggestions ---
    const childTotalDemandMap = new Map<string, number>();
    function aggregateDemand(children: BomChildData[], parentQty: number) {
      for (const child of children) {
        const demand = child.quantity * parentQty;
        childTotalDemandMap.set(
          child.partId,
          (childTotalDemandMap.get(child.partId) || 0) + demand
        );
        if (child.children) {
          aggregateDemand(child.children, demand);
        }
      }
    }
    for (const s of enrichedSuggestions) {
      if (s.bomChildren.length > 0) {
        aggregateDemand(s.bomChildren, s.suggestedQty ?? 0);
      }
    }

    // Attach totalDemandAll to each BOM child
    function setTotalDemandAll(children: BomChildData[]) {
      for (const child of children) {
        child.totalDemandAll = childTotalDemandMap.get(child.partId) || 0;
        if (child.children) {
          setTotalDemandAll(child.children);
        }
      }
    }
    for (const s of enrichedSuggestions) {
      if (s.bomChildren.length > 0) {
        setTotalDemandAll(s.bomChildren);
      }
    }

    return NextResponse.json({
      ...run,
      suggestions: enrichedSuggestions,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/mrp/[runId]' });
    return NextResponse.json(
      { error: "Failed to fetch MRP run" },
      { status: 500 }
    );
  }
});
