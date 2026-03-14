// =============================================================================
// QUOTATION DETAIL API
// GET    /api/quotations/[id] — Get detail
// PUT    /api/quotations/[id] — Update (draft only)
// DELETE /api/quotations/[id] — Delete (draft only)
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  withPermission,
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { updateQuotationSchema } from '@/lib/validations/quotation';
import { calculateLineTotal, calculateQuotationTotals } from '@/lib/sales/quotation-calc';
import { auditUpdate, auditDelete } from '@/lib/audit/route-audit';
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

// =============================================================================
// GET
// =============================================================================

async function getHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: { part: { select: { id: true, partNumber: true, name: true, unit: true } } },
      },
      salesOrder: { select: { id: true, orderNumber: true, status: true } },
    },
  });

  if (!quotation) return notFoundResponse('Báo giá');
  return successResponse(quotation);
}

// =============================================================================
// PUT
// =============================================================================

async function putHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) return notFoundResponse('Báo giá');

  if (existing.status !== 'draft') {
    return errorResponse('Chỉ có thể sửa báo giá ở trạng thái Nháp', 400);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const validation = updateQuotationSchema.safeParse(body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    validation.error.issues.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(err.message);
    });
    return validationErrorResponse(errors);
  }

  const data = validation.data;

  // Validate customer if changed
  if (data.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) return errorResponse('Khách hàng không tồn tại', 404);
  }

  // Build update
  const updateData: Record<string, unknown> = {};
  if (data.customerId) updateData.customerId = data.customerId;
  if (data.validUntil) updateData.validUntil = new Date(data.validUntil);
  if (data.discountPercent !== undefined) updateData.discountPercent = data.discountPercent;
  if (data.currency) updateData.currency = data.currency;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.terms !== undefined) updateData.terms = data.terms;

  // If items provided, recalculate and replace
  if (data.items && data.items.length > 0) {
    // Validate parts
    const partIds = data.items.map((item) => item.partId);
    const parts = await prisma.part.findMany({
      where: { id: { in: partIds } },
      select: { id: true },
    });
    const foundPartIds = new Set(parts.map((p) => p.id));
    const missingParts = partIds.filter((pid) => !foundPartIds.has(pid));
    if (missingParts.length > 0) {
      return errorResponse(`Linh kiện không tồn tại: ${missingParts.join(', ')}`, 400);
    }

    const itemsWithTotals = data.items.map((item) => ({
      ...item,
      lineTotal: calculateLineTotal(item),
    }));
    const totals = calculateQuotationTotals(
      data.items,
      data.discountPercent ?? existing.discountPercent
    );
    Object.assign(updateData, totals);

    // Replace items in transaction
    await prisma.$transaction([
      prisma.quotationItem.deleteMany({ where: { quotationId: id } }),
      prisma.quotation.update({
        where: { id },
        data: {
          ...updateData,
          items: {
            create: itemsWithTotals.map((item) => ({
              partId: item.partId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent || 0,
              taxRate: item.taxRate || 0,
              lineTotal: item.lineTotal,
            })),
          },
        },
      }),
    ]);
  } else if (Object.keys(updateData).length > 0) {
    await prisma.quotation.update({ where: { id }, data: updateData });
  }

  // Fetch updated
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, code: true, name: true } },
      items: {
        include: { part: { select: { id: true, partNumber: true, name: true } } },
      },
    },
  });

  auditUpdate(
    request,
    { id: user.id, name: user.name, email: user.email },
    'Quotation',
    id,
    existing as unknown as Record<string, unknown>,
    data as Record<string, unknown>
  );

  return successResponse(quotation);
}

// =============================================================================
// DELETE
// =============================================================================

async function deleteHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) return notFoundResponse('Báo giá');

  if (existing.status !== 'draft') {
    return errorResponse('Chỉ có thể xóa báo giá ở trạng thái Nháp', 400);
  }

  await prisma.quotation.delete({ where: { id } });

  auditDelete(
    request,
    { id: user.id, name: user.name, email: user.email },
    'Quotation',
    id,
    { quoteNumber: existing.quoteNumber }
  );

  return successResponse({ deleted: true, id });
}

// =============================================================================
// EXPORTS
// =============================================================================

export const GET = withPermission(getHandler, { read: 'orders:view' });
export const PUT = withPermission(putHandler, { update: 'orders:edit' });
export const DELETE = withPermission(deleteHandler, { delete: 'orders:delete' });
