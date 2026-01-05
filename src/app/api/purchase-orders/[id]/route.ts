import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  withPermission,
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from '@/lib/api/with-permission';

// =============================================================================
// VALIDATION
// =============================================================================

const updatePOSchema = z.object({
  poNumber: z.string().min(1).optional(),
  supplierId: z.string().optional(),
  orderDate: z.string().or(z.date()).optional(),
  expectedDate: z.string().or(z.date()).optional(),
  status: z.enum(['draft', 'pending', 'confirmed', 'in_progress', 'received', 'cancelled']).optional(),
  notes: z.string().optional().nullable(),
});

// =============================================================================
// GET - Get single PO
// =============================================================================

async function getHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: any }
) {
  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      lines: {
        include: { part: true },
        orderBy: { lineNumber: 'asc' },
      },
    },
  });

  if (!order) return notFoundResponse('Đơn mua hàng');
  return successResponse(order);
}

// =============================================================================
// PUT - Update PO
// =============================================================================

async function putHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: any }
) {
  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!existing) return notFoundResponse('Đơn mua hàng');

  if (!['draft', 'pending', 'confirmed'].includes(existing.status)) {
    return errorResponse('Không thể chỉnh sửa PO ở trạng thái này', 400);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const validation = updatePOSchema.safeParse(body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    validation.error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(err.message);
    });
    return validationErrorResponse(errors);
  }

  const updateData: Record<string, unknown> = { ...validation.data };
  if (validation.data.orderDate) updateData.orderDate = new Date(validation.data.orderDate);
  if (validation.data.expectedDate) updateData.expectedDate = new Date(validation.data.expectedDate);

  const order = await prisma.purchaseOrder.update({
    where: { id },
    data: updateData,
    include: { supplier: true, lines: { include: { part: true } } },
  });

  return successResponse(order);
}

// =============================================================================
// DELETE - Cancel/Delete PO
// =============================================================================

async function deleteHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: any }
) {
  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!existing) return notFoundResponse('Đơn mua hàng');

  if (existing.status === 'draft') {
    await prisma.purchaseOrder.delete({ where: { id } });
    return successResponse({ deleted: true, id });
  }

  if (['received', 'cancelled'].includes(existing.status)) {
    return errorResponse('Không thể hủy PO đã nhận hàng hoặc đã hủy', 400);
  }

  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'cancelled' },
  });

  return successResponse({ cancelled: true, id });
}

// =============================================================================
// EXPORTS
// =============================================================================

export const GET = withPermission(getHandler, { read: 'purchasing:view' });
export const PUT = withPermission(putHandler, { update: 'orders:edit' });
export const DELETE = withPermission(deleteHandler, { delete: 'orders:delete' });
