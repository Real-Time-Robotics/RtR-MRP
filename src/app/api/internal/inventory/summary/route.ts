import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateInternalRequest } from '@/lib/api/internal-auth'
import { logger } from '@/lib/logger';
import { checkReadEndpointLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const authError = validateInternalRequest(req)
  if (authError) return authError

  // Rate limiting
  const rateLimitResult = await checkReadEndpointLimit(req);
  if (rateLimitResult) return rateLimitResult;

  try {
    // Get all parts with their inventory and cost data
    const parts = await prisma.part.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        partNumber: true,
        name: true,
        unit: true,
        unitCost: true,
        reorderPoint: true,
        minStockLevel: true,
        inventory: {
          select: {
            quantity: true,
            reservedQty: true,
          },
        },
      },
    })

    let totalSKUs = 0
    let totalValue = 0
    const lowStock: Array<{
      partId: string
      sku: string
      name: string
      quantity: number
      reorderPoint: number
      unit: string
    }> = []
    const outOfStock: Array<{
      partId: string
      sku: string
      name: string
      unit: string
    }> = []

    for (const part of parts) {
      const totalQty = part.inventory.reduce(
        (sum, inv) => sum + inv.quantity,
        0
      )

      if (totalQty > 0 || part.inventory.length > 0) {
        totalSKUs++
      }

      totalValue += totalQty * part.unitCost

      if (totalQty === 0) {
        outOfStock.push({
          partId: part.id,
          sku: part.partNumber,
          name: part.name,
          unit: part.unit,
        })
      } else if (
        part.reorderPoint > 0 &&
        totalQty <= part.reorderPoint
      ) {
        lowStock.push({
          partId: part.id,
          sku: part.partNumber,
          name: part.name,
          quantity: totalQty,
          reorderPoint: part.reorderPoint,
          unit: part.unit,
        })
      }
    }

    return NextResponse.json({
      totalSKUs,
      totalValue: Math.round(totalValue * 100) / 100,
      lowStock,
      outOfStock,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
    })
  } catch (error) {
    logger.error('[Internal API] Inventory summary error:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to get inventory summary' },
      { status: 500 }
    )
  }
}
