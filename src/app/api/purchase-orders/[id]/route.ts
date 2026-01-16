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

// Schema for PO line item
const POLineSchema = z.object({
  partId: z.string().min(1, "Part ID là bắt buộc"),
  quantity: z.number().int().min(1, "Số lượng phải >= 1"),
  unitPrice: z.number().min(0, "Đơn giá phải >= 0"),
});

const updatePOSchema = z.object({
  poNumber: z.string().min(1).optional(),
  supplierId: z.string().optional(),
  orderDate: z.string().or(z.date()).optional(),
  expectedDate: z.string().or(z.date()).optional(),
  status: z.enum(['draft', 'pending', 'confirmed', 'in_progress', 'received', 'cancelled']).optional(),
  notes: z.string().optional().nullable(),
  lines: z.array(POLineSchema).optional(),
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
    validation.error.issues.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(err.message);
    });
    return validationErrorResponse(errors);
  }

  const { lines, ...headerData } = validation.data;

  // Build header update data
  const updateData: Record<string, unknown> = { ...headerData };
  if (headerData.orderDate) updateData.orderDate = new Date(headerData.orderDate);
  if (headerData.expectedDate) updateData.expectedDate = new Date(headerData.expectedDate);

  // Validate parts exist if lines provided
  if (lines && lines.length > 0) {
    const partIds = lines.map((line) => line.partId);
    const parts = await prisma.part.findMany({
      where: { id: { in: partIds } },
      select: { id: true },
    });
    const foundPartIds = new Set(parts.map((p) => p.id));
    const missingParts = partIds.filter((pid) => !foundPartIds.has(pid));
    if (missingParts.length > 0) {
      return errorResponse(`Parts không tồn tại: ${missingParts.join(", ")}`, 400);
    }

    // Calculate new total amount
    const totalAmount = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    updateData.totalAmount = totalAmount;
  }

  // Use transaction to update header and lines together
  const order = await prisma.$transaction(async (tx) => {
    // Delete existing lines if new lines provided
    if (lines && lines.length > 0) {
      await tx.purchaseOrderLine.deleteMany({
        where: { poId: id },
      });
    }

    // Update header and create new lines
    return tx.purchaseOrder.update({
      where: { id },
      data: {
        ...updateData,
        ...(lines && lines.length > 0 && {
          lines: {
            create: lines.map((line, index) => ({
              lineNumber: index + 1,
              partId: line.partId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.quantity * line.unitPrice,
            })),
          },
        }),
      },
      include: {
        supplier: true,
        lines: {
          include: { part: true },
          orderBy: { lineNumber: 'asc' },
        }
      },
    });
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
