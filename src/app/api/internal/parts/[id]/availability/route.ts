import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateInternalRequest } from '@/lib/api/internal-auth'
import { logger } from '@/lib/logger';
import { checkReadEndpointLimit } from '@/lib/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = validateInternalRequest(req)
  if (authError) return authError

  // Rate limiting
  const rateLimitResult = await checkReadEndpointLimit(req);
  if (rateLimitResult) return rateLimitResult;

  try {
    const part = await prisma.part.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        partNumber: true,
        name: true,
        unit: true,
        updatedAt: true,
        inventory: {
          select: {
            quantity: true,
            reservedQty: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!part) {
      return NextResponse.json(
        { error: 'Part not found' },
        { status: 404 }
      )
    }

    const inStock = part.inventory.reduce((sum, inv) => sum + inv.quantity, 0)
    const reserved = part.inventory.reduce((sum, inv) => sum + inv.reservedQty, 0)
    const lastUpdated = part.inventory.length > 0
      ? part.inventory.reduce((latest, inv) =>
          inv.updatedAt > latest ? inv.updatedAt : latest,
          part.inventory[0].updatedAt
        )
      : part.updatedAt

    return NextResponse.json({
      partId: part.id,
      sku: part.partNumber,
      name: part.name,
      inStock,
      reserved,
      available: inStock - reserved,
      unit: part.unit,
      lastUpdated,
    })
  } catch (error) {
    logger.error('[Internal API] Part availability error:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to get part availability' },
      { status: 500 }
    )
  }
}
