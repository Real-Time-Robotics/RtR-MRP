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
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        woNumber: true,
        quantity: true,
        completedQty: true,
        scrapQty: true,
        priority: true,
        status: true,
        plannedStart: true,
        plannedEnd: true,
        actualStart: true,
        actualEnd: true,
        assignedTo: true,
        workCenter: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
        salesOrder: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
        allocations: {
          select: {
            partId: true,
            requiredQty: true,
            allocatedQty: true,
            issuedQty: true,
            status: true,
            part: {
              select: {
                partNumber: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
    })

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    const progress =
      workOrder.quantity > 0
        ? Math.round((workOrder.completedQty / workOrder.quantity) * 100)
        : 0

    return NextResponse.json({
      id: workOrder.id,
      woNumber: workOrder.woNumber,
      status: workOrder.status,
      priority: workOrder.priority,
      progress,
      quantity: workOrder.quantity,
      completedQty: workOrder.completedQty,
      scrapQty: workOrder.scrapQty,
      plannedStart: workOrder.plannedStart,
      plannedEnd: workOrder.plannedEnd,
      actualStart: workOrder.actualStart,
      actualEnd: workOrder.actualEnd,
      assignedTo: workOrder.assignedTo,
      workCenter: workOrder.workCenter,
      notes: workOrder.notes,
      product: workOrder.product,
      salesOrder: workOrder.salesOrder,
      items: workOrder.allocations.map((a) => ({
        partId: a.partId,
        partNumber: a.part.partNumber,
        partName: a.part.name,
        unit: a.part.unit,
        requiredQty: a.requiredQty,
        allocatedQty: a.allocatedQty,
        issuedQty: a.issuedQty,
        status: a.status,
      })),
      createdAt: workOrder.createdAt,
      updatedAt: workOrder.updatedAt,
    })
  } catch (error) {
    logger.error('[Internal API] Work order detail error:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to get work order' },
      { status: 500 }
    )
  }
}
