// =============================================================================
// MRP RUN API ROUTE
// POST /api/mrp/run - Execute MRP calculation
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// =============================================================================
// TYPES
// =============================================================================

interface MRPRunRequest {
  orderIds: string[];
  options?: {
    includeSafetyStock?: boolean;
    planningHorizon?: number;
  };
}

interface MRPRequirement {
  partId: string;
  partNumber: string;
  partName: string;
  category: string;
  unit: string;
  grossRequirement: number;
  onHand: number;
  onOrder: number;
  safetyStock: number;
  netRequirement: number;
  status: 'CRITICAL' | 'LOW' | 'OK';
  supplierName: string | null;
  supplierId: string | null;
  leadTime: number;
  unitCost: number;
  totalCost: number;
}

interface MRPSuggestion {
  id: string;
  partId: string;
  partNumber: string;
  partName: string;
  supplierName: string | null;
  supplierId: string | null;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  orderDate: string;
  requiredDate: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  leadTime: number;
}

// =============================================================================
// HELPER: BOM Explosion
// =============================================================================

interface BomComponent {
  partId: string;
  quantity: number;
  scrapRate: number;
}

async function explodeBOM(productId: string): Promise<Map<string, number>> {
  const components = new Map<string, number>();

  // Get active BOM for the product
  const bomHeader = await prisma.bomHeader.findFirst({
    where: {
      productId,
      status: 'active',
    },
    include: {
      bomLines: {
        include: {
          part: true,
        },
      },
    },
  });

  if (!bomHeader) {
    return components;
  }

  // Calculate required quantities including scrap
  for (const line of bomHeader.bomLines) {
    const scrapMultiplier = 1 + (line.scrapRate || 0);
    const requiredQty = line.quantity * scrapMultiplier;

    const existingQty = components.get(line.partId) || 0;
    components.set(line.partId, existingQty + requiredQty);
  }

  return components;
}

// =============================================================================
// POST /api/mrp/run
// Execute MRP calculation for selected orders
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: MRPRunRequest = await request.json();
    const { orderIds, options } = body;
    const includeSafetyStock = options?.includeSafetyStock !== false;
    const planningHorizon = options?.planningHorizon || 30;

    if (!orderIds || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No orders selected for MRP' },
        { status: 400 }
      );
    }

    // Step 1: Get sales orders with items
    const salesOrders = await prisma.salesOrder.findMany({
      where: { id: { in: orderIds } },
      include: {
        lines: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    if (salesOrders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid sales orders found' },
        { status: 404 }
      );
    }

    // Step 2: Calculate gross requirements by exploding BOM for each product
    const grossRequirements = new Map<string, { qty: number; requiredDate: Date }>();

    for (const order of salesOrders) {
      for (const line of order.lines) {
        // Explode BOM for this product
        const components = await explodeBOM(line.productId);

        for (const [partId, qtyPerUnit] of components) {
          const totalQty = qtyPerUnit * line.quantity;
          const existing = grossRequirements.get(partId);

          if (existing) {
            existing.qty += totalQty;
            // Take earliest required date
            if (order.requiredDate < existing.requiredDate) {
              existing.requiredDate = order.requiredDate;
            }
          } else {
            grossRequirements.set(partId, {
              qty: totalQty,
              requiredDate: order.requiredDate,
            });
          }
        }
      }
    }

    // Step 3: Get current inventory and part details for all required parts
    const partIds = Array.from(grossRequirements.keys());

    const [parts, inventories, purchaseOrderLines] = await Promise.all([
      prisma.part.findMany({
        where: { id: { in: partIds } },
        include: {
          partSuppliers: {
            where: { isPreferred: true },
            include: { supplier: true },
            take: 1,
          },
        },
      }),
      prisma.inventory.findMany({
        where: { partId: { in: partIds } },
      }),
      prisma.purchaseOrderLine.findMany({
        where: {
          partId: { in: partIds },
          status: { in: ['pending', 'ordered', 'partial'] },
        },
        include: {
          po: true,
        },
      }),
    ]);

    // Build lookup maps
    const partMap = new Map(parts.map(p => [p.id, p]));

    // Calculate on-hand inventory per part
    const onHandMap = new Map<string, number>();
    for (const inv of inventories) {
      const current = onHandMap.get(inv.partId) || 0;
      onHandMap.set(inv.partId, current + inv.quantity - inv.reservedQty);
    }

    // Calculate on-order quantities per part
    const onOrderMap = new Map<string, number>();
    for (const poLine of purchaseOrderLines) {
      const current = onOrderMap.get(poLine.partId) || 0;
      onOrderMap.set(poLine.partId, current + (poLine.quantity - poLine.receivedQty));
    }

    // Step 4: Calculate net requirements
    const requirements: MRPRequirement[] = [];
    const suggestions: MRPSuggestion[] = [];
    const runDate = new Date();

    for (const [partId, gross] of grossRequirements) {
      const part = partMap.get(partId);
      if (!part) continue;

      const onHand = onHandMap.get(partId) || 0;
      const onOrder = onOrderMap.get(partId) || 0;
      const safetyStock = includeSafetyStock ? (part.safetyStock || 0) : 0;

      // Net Requirement = Gross - On Hand - On Order + Safety Stock
      const netRequirement = Math.max(0, gross.qty - onHand - onOrder + safetyStock);

      // Determine status
      let status: 'CRITICAL' | 'LOW' | 'OK' = 'OK';
      if (netRequirement > 0) {
        const daysUntilRequired = Math.ceil(
          (gross.requiredDate.getTime() - runDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const leadTime = part.leadTimeDays || 14;

        if (daysUntilRequired < leadTime) {
          status = 'CRITICAL';
        } else if (daysUntilRequired < leadTime * 1.5) {
          status = 'LOW';
        }
      }

      // Get preferred supplier
      const preferredSupplier = part.partSuppliers[0];

      const requirement: MRPRequirement = {
        partId: part.id,
        partNumber: part.partNumber,
        partName: part.name,
        category: part.category,
        unit: part.unit,
        grossRequirement: Math.round(gross.qty),
        onHand,
        onOrder,
        safetyStock,
        netRequirement: Math.round(netRequirement),
        status,
        supplierName: preferredSupplier?.supplier.name || null,
        supplierId: preferredSupplier?.supplierId || null,
        leadTime: part.leadTimeDays || 14,
        unitCost: part.unitCost || 0,
        totalCost: Math.round(netRequirement * (part.unitCost || 0)),
      };

      requirements.push(requirement);

      // Create purchase suggestion if net requirement > 0
      if (netRequirement > 0) {
        const leadTime = part.leadTimeDays || 14;
        const orderDate = new Date(gross.requiredDate);
        orderDate.setDate(orderDate.getDate() - leadTime);

        const suggestion: MRPSuggestion = {
          id: `sug_${part.id}`,
          partId: part.id,
          partNumber: part.partNumber,
          partName: part.name,
          supplierName: preferredSupplier?.supplier.name || null,
          supplierId: preferredSupplier?.supplierId || null,
          quantity: Math.round(netRequirement),
          unit: part.unit,
          unitCost: preferredSupplier?.unitPrice || part.unitCost || 0,
          totalCost: Math.round(netRequirement * (preferredSupplier?.unitPrice || part.unitCost || 0)),
          orderDate: orderDate.toISOString().split('T')[0],
          requiredDate: gross.requiredDate.toISOString().split('T')[0],
          priority: status === 'CRITICAL' ? 'URGENT' : status === 'LOW' ? 'HIGH' : 'NORMAL',
          leadTime,
        };

        suggestions.push(suggestion);
      }
    }

    // Sort requirements by status (CRITICAL first)
    const statusOrder = { CRITICAL: 0, LOW: 1, OK: 2 };
    requirements.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    // Sort suggestions by priority and order date
    const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2 };
    suggestions.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
    });

    // Step 5: Save MRP run history
    const runNumber = `MRP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const mrpRun = await prisma.mrpRun.create({
      data: {
        runNumber,
        runDate: runDate,
        planningHorizon,
        status: 'completed',
        totalParts: requirements.length,
        purchaseSuggestions: suggestions.length,
        expediteAlerts: requirements.filter(r => r.status === 'CRITICAL').length,
        shortageWarnings: requirements.filter(r => r.status === 'LOW').length,
        parameters: {
          orderIds,
          includeSafetyStock,
          planningHorizon,
        },
        completedAt: new Date(),
      },
    });

    // Save suggestions to database
    if (suggestions.length > 0) {
      await prisma.mrpSuggestion.createMany({
        data: suggestions.map(s => ({
          mrpRunId: mrpRun.id,
          partId: s.partId,
          actionType: 'PURCHASE',
          priority: s.priority,
          suggestedQty: s.quantity,
          suggestedDate: new Date(s.requiredDate),
          currentStock: requirements.find(r => r.partId === s.partId)?.onHand || 0,
          requiredQty: requirements.find(r => r.partId === s.partId)?.grossRequirement || 0,
          shortageQty: s.quantity,
          reason: `Net requirement after BOM explosion for ${orderIds.length} sales order(s)`,
          supplierId: s.supplierId,
          estimatedCost: s.totalCost,
          status: 'pending',
        })),
      });
    }

    // Calculate summary
    const summary = {
      totalRequirements: requirements.length,
      criticalItems: requirements.filter(r => r.status === 'CRITICAL').length,
      lowItems: requirements.filter(r => r.status === 'LOW').length,
      okItems: requirements.filter(r => r.status === 'OK').length,
      totalPurchaseValue: suggestions.reduce((sum, s) => sum + s.totalCost, 0),
    };

    const result = {
      runId: mrpRun.id,
      runNumber: mrpRun.runNumber,
      runDate: mrpRun.runDate.toISOString(),
      salesOrders: orderIds,
      status: 'Completed',
      summary,
      requirements,
      suggestions,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[MRP API] Error running MRP:', error);
    return NextResponse.json(
      { success: false, error: 'MRP calculation failed' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/mrp/run
// Get MRP run history
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const runs = await prisma.mrpRun.findMany({
      take: limit,
      orderBy: { runDate: 'desc' },
      include: {
        suggestions: {
          take: 5,
          include: {
            part: {
              select: {
                partNumber: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const formattedRuns = runs.map(run => ({
      runId: run.id,
      runNumber: run.runNumber,
      runDate: run.runDate.toISOString(),
      salesOrders: (run.parameters as any)?.orderIds || [],
      status: run.status === 'completed' ? 'Completed' : run.status,
      totalRequirements: run.totalParts || 0,
      criticalItems: run.expediteAlerts || 0,
      lowItems: run.shortageWarnings || 0,
      purchaseSuggestions: run.purchaseSuggestions || 0,
      totalPurchaseValue: run.suggestions.reduce((sum, s) => sum + (s.estimatedCost || 0), 0),
      createdBy: run.createdBy || 'System',
      completedAt: run.completedAt?.toISOString(),
    }));

    return NextResponse.json({ success: true, data: formattedRuns });
  } catch (error) {
    console.error('[MRP API] Error fetching MRP history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch MRP history' },
      { status: 500 }
    );
  }
}
