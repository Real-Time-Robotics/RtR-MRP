import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getStockStatus } from '@/lib/bom-engine';
import { validateQuery } from '@/lib/api/validation';
import { InventoryQuerySchema } from '@/lib/validations';

// =============================================================================
// GET - List inventory with aggregation
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query params
    const queryResult = validateQuery(InventoryQuerySchema, request.nextUrl.searchParams);
    if (!queryResult.success) {
      return queryResult.response;
    }
    const { partId, warehouseId, status } = queryResult.data;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (partId) where.partId = partId;
    if (warehouseId) where.warehouseId = warehouseId;

    const inventoryData = await prisma.inventory.findMany({
      where,
      include: {
        part: {
          include: {
            costs: true,
            planning: true,
          }
        },
        warehouse: true,
      },
      orderBy: [{ part: { partNumber: 'asc' } }],
    });

    // Map to flat structure with status calculation
    let result = inventoryData.map((inv) => {
      const available = inv.quantity - inv.reservedQty;
      // Handle potential nulls for optional relations
      const unitCost = inv.part.costs?.[0]?.unitCost || 0;
      const minStockLevel = inv.part.planning?.minStockLevel || 0;
      const reorderPoint = inv.part.planning?.reorderPoint || 0;
      const safetyStock = inv.part.planning?.safetyStock || 0;

      return {
        id: inv.id, // Inventory ID
        partId: inv.partId,
        partNumber: inv.part.partNumber,
        name: inv.part.name,
        category: inv.part.category,
        unit: inv.part.unit,
        unitCost: unitCost,
        isCritical: inv.part.isCritical,
        minStockLevel: minStockLevel,
        reorderPoint: reorderPoint,
        safetyStock: safetyStock,
        quantity: inv.quantity,
        reserved: inv.reservedQty,
        available,
        status: getStockStatus(
          available,
          minStockLevel,
          reorderPoint
        ),
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse.name,
      };
    });

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
