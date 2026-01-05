import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getStockStatus } from '@/lib/bom-engine';

// =============================================================================
// GET - List inventory with aggregation
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const partId = searchParams.get('partId');
    const warehouseId = searchParams.get('warehouseId');
    const status = searchParams.get('status');

    // Build where clause
    const where: Record<string, unknown> = {};
    if (partId) where.partId = partId;
    if (warehouseId) where.warehouseId = warehouseId;

    const inventoryData = await prisma.inventory.findMany({
      where,
      include: {
        part: true,
        warehouse: true,
      },
      orderBy: [{ part: { partNumber: 'asc' } }],
    });

    // Group by part and calculate status
    const partMap = new Map<
      string,
      {
        partId: string;
        partNumber: string;
        name: string;
        category: string;
        unit: string;
        unitCost: number;
        isCritical: boolean;
        minStockLevel: number;
        reorderPoint: number;
        quantity: number;
        reserved: number;
        available: number;
        status: string;
        warehouseId?: string;
        warehouseName?: string;
      }
    >();

    inventoryData.forEach((inv) => {
      const existing = partMap.get(inv.partId);
      if (existing) {
        existing.quantity += inv.quantity;
        existing.reserved += inv.reservedQty;
        existing.available = existing.quantity - existing.reserved;
        existing.status = getStockStatus(
          existing.available,
          existing.minStockLevel,
          existing.reorderPoint
        );
      } else {
        const available = inv.quantity - inv.reservedQty;
        partMap.set(inv.partId, {
          partId: inv.partId,
          partNumber: inv.part.partNumber,
          name: inv.part.name,
          category: inv.part.category,
          unit: inv.part.unit,
          unitCost: inv.part.unitCost,
          isCritical: inv.part.isCritical,
          minStockLevel: inv.part.minStockLevel,
          reorderPoint: inv.part.reorderPoint,
          quantity: inv.quantity,
          reserved: inv.reservedQty,
          available,
          status: getStockStatus(
            available,
            inv.part.minStockLevel,
            inv.part.reorderPoint
          ),
          warehouseId: inv.warehouseId,
          warehouseName: inv.warehouse.name,
        });
      }
    });

    let result = Array.from(partMap.values());

    // Filter by status if specified
    if (status) {
      if (status === 'critical') {
        result = result.filter(
          (i) => i.status === 'CRITICAL' || i.status === 'OUT_OF_STOCK'
        );
      } else if (status === 'reorder') {
        result = result.filter((i) => i.status === 'REORDER');
      } else if (status === 'ok') {
        result = result.filter((i) => i.status === 'OK');
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Failed to fetch inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}
