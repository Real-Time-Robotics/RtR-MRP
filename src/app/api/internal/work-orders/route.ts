import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateInternalRequest } from '@/lib/api/internal-auth'
import { triggerWorkOrderWorkflow } from '@/lib/workflow/workflow-triggers'
import { logger } from '@/lib/logger';
import { checkWriteEndpointLimit } from '@/lib/rate-limit';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  const authError = validateInternalRequest(req)
  if (authError) return authError

  // Rate limiting
  const rateLimitResult = await checkWriteEndpointLimit(req);
  if (rateLimitResult) return rateLimitResult;

  try {
    const bodySchema = z.object({
      source: z.string().optional(),
      sourceDealId: z.string().optional(),
      title: z.string(),
      items: z.array(z.object({
        partId: z.string(),
        quantity: z.number(),
      })),
      customer: z.string().optional(),
      dueDate: z.string().optional(),
    })
    const rawBody = await req.json()
    const parseResult = bodySchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const body = parseResult.data
    const { source, sourceDealId, title, items, customer, dueDate } = body

    if (!title || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: title, items' },
        { status: 400 }
      )
    }

    // We need a product to create a work order — use the first item's part
    // to look up or create a product reference
    const firstItem = items[0]
    if (!firstItem?.partId || !firstItem?.quantity) {
      return NextResponse.json(
        { error: 'Each item must have partId and quantity' },
        { status: 400 }
      )
    }

    // Find the first available product to link the work order to
    // In a full integration, the caller would provide a productId
    let product = await prisma.product.findFirst({
      where: { status: 'active' },
      select: { id: true },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'No active product found to associate with work order' },
        { status: 400 }
      )
    }

    // Generate a unique WO number
    const lastWO = await prisma.workOrder.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { woNumber: true },
    })
    const nextNum = lastWO
      ? parseInt(lastWO.woNumber.replace(/\D/g, '') || '0', 10) + 1
      : 1
    const woNumber = `WO-${String(nextNum).padStart(5, '0')}`

    const workOrder = await prisma.workOrder.create({
      data: {
        woNumber,
        productId: product.id,
        quantity: items.reduce(
          (sum: number, item: { quantity: number }) => sum + item.quantity,
          0
        ),
        priority: 'normal',
        status: 'draft',
        plannedEnd: dueDate ? new Date(dueDate) : undefined,
        notes: [
          title,
          source ? `Source: ${source}` : null,
          sourceDealId ? `Deal: ${sourceDealId}` : null,
          customer ? `Customer: ${customer}` : null,
        ]
          .filter(Boolean)
          .join(' | '),
        allocations: {
          create: items.map(
            (item: { partId: string; quantity: number }) => ({
              partId: item.partId,
              requiredQty: item.quantity,
              allocatedQty: 0,
              issuedQty: 0,
              status: 'pending',
            })
          ),
        },
      },
      select: {
        id: true,
        woNumber: true,
        status: true,
      },
    })

    // Trigger approval workflow (non-blocking)
    try {
      await triggerWorkOrderWorkflow(workOrder.id, 'system', {
        productId: product.id,
        quantity: items.reduce(
          (sum: number, item: { quantity: number }) => sum + item.quantity,
          0
        ),
        priority: 'normal',
      })
    } catch (err) {
      logger.error('[Internal API] WO workflow trigger error:', { error: String(err) })
    }

    return NextResponse.json(
      {
        workOrderId: workOrder.id,
        woNumber: workOrder.woNumber,
        status: 'created',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('[Internal API] Create work order error:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to create work order' },
      { status: 500 }
    )
  }
}
