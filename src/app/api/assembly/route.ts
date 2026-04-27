// POST /api/assembly — Create Assembly Order
// GET  /api/assembly — List Assembly Orders
// Sprint 27 TIP-S27-03

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/api/with-auth';
import { hasRole } from '@/lib/auth/rbac';
import { generateAoNumber } from '@/lib/assembly/service';

const createSchema = z.object({
  productId: z.string().min(1),
  bomHeaderId: z.string().min(1).optional(),
  targetQuantity: z.number().int().positive().default(1),
  assignedToUserId: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest, _context, session) => {
  const allowed = await hasRole(session.user.id, 'production', 'engineer', 'admin');
  if (!allowed) {
    return NextResponse.json(
      { error: 'Requires role: production, engineer, or admin', code: 'FORBIDDEN_ROLE' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { productId, bomHeaderId, targetQuantity, assignedToUserId, notes } = parsed.data;

  // Verify product exists
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Resolve BOM header
  let resolvedBomHeaderId = bomHeaderId;
  if (!resolvedBomHeaderId) {
    const latestBom = await prisma.bomHeader.findFirst({
      where: { productId, status: 'active' },
      orderBy: { effectiveDate: 'desc' },
    });
    if (!latestBom) {
      return NextResponse.json(
        { error: 'No active BOM found for product' },
        { status: 422 }
      );
    }
    resolvedBomHeaderId = latestBom.id;
  }

  const aoNumber = await generateAoNumber();

  const ao = await prisma.assemblyOrder.create({
    data: {
      aoNumber,
      productId,
      bomHeaderId: resolvedBomHeaderId,
      targetQuantity,
      assignedToUserId: assignedToUserId || null,
      createdByUserId: session.user.id,
      notes: notes || null,
      status: 'DRAFT',
    },
    include: {
      product: true,
      bomHeader: { include: { bomLines: true } },
    },
  });

  return NextResponse.json({ ao }, { status: 201 });
});

export const GET = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const productId = searchParams.get('productId');
  const assignedToUserId = searchParams.get('assignedToUserId');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (productId) where.productId = productId;
  if (assignedToUserId) where.assignedToUserId = assignedToUserId;

  const [items, total] = await Promise.all([
    prisma.assemblyOrder.findMany({
      where,
      include: { product: true, assignedToUser: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.assemblyOrder.count({ where }),
  ]);

  return NextResponse.json({
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
