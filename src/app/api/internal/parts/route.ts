import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateInternalRequest } from '@/lib/api/internal-auth'
import { logger } from '@/lib/logger';
import { checkReadEndpointLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  // Rate limiting
  const rateLimitResult = await checkReadEndpointLimit(req);
  if (rateLimitResult) return rateLimitResult;

  const authError = validateInternalRequest(req)
  if (authError) return authError

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''

    const parts = await prisma.part.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { partNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: {
        id: true,
        partNumber: true,
        name: true,
        unit: true,
        unitCost: true,
        inventory: {
          select: {
            quantity: true,
            reservedQty: true,
          },
        },
      },
      take: 50,
      orderBy: { name: 'asc' },
    })

    const result = parts.map((part) => {
      const inStock = part.inventory.reduce((sum, inv) => sum + inv.quantity, 0)
      const reserved = part.inventory.reduce((sum, inv) => sum + inv.reservedQty, 0)
      return {
        id: part.id,
        sku: part.partNumber,
        name: part.name,
        unit: part.unit,
        price: part.unitCost,
        inStock,
        reserved,
        available: inStock - reserved,
      }
    })

    return NextResponse.json({ parts: result })
  } catch (error) {
    logger.error('[Internal API] Parts search error:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to search parts' },
      { status: 500 }
    )
  }
}
