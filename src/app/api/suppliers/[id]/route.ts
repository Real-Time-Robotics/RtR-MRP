import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  withPermission,
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { auditUpdate, auditDelete } from '@/lib/audit/route-audit';
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

// =============================================================================
// SUPPLIER VALIDATION SCHEMA
// =============================================================================

const updateSupplierSchema = z.object({
  code: z.string().min(1, 'Mã nhà cung cấp là bắt buộc').optional(),
  name: z.string().min(1, 'Tên nhà cung cấp là bắt buộc').optional(),
  country: z.string().min(1, 'Quốc gia là bắt buộc').optional(),
  ndaaCompliant: z.boolean().optional(),
  contactName: z.string().nullish(),
  contactEmail: z.string().email('Email không hợp lệ').nullish(),
  contactPhone: z.string().nullish(),
  address: z.string().nullish(),
  paymentTerms: z.string().nullish(),
  leadTimeDays: z.number().int().min(0, 'Lead time phải >= 0').optional(),
  rating: z.number().min(0).max(5).nullish(),
  category: z.string().nullish(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
});

// =============================================================================
// GET - Get single supplier
// =============================================================================

async function getHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  // Rate limiting
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;

  if (!id) {
    return errorResponse('ID không hợp lệ', 400);
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      partSuppliers: {
        include: {
          part: {
            select: {
              id: true,
              partNumber: true,
              name: true,
              category: true,
            },
          },
        },
      },
      purchaseOrders: {
        take: 5,
        orderBy: { orderDate: 'desc' },
        select: {
          id: true,
          poNumber: true,
          orderDate: true,
          status: true,
          totalAmount: true,
        },
      },
      _count: {
        select: {
          partSuppliers: true,
          purchaseOrders: true,
        },
      },
    },
  });

  if (!supplier) {
    return notFoundResponse('Nhà cung cấp');
  }

  return successResponse(supplier);
}

// =============================================================================
// PUT - Update supplier
// =============================================================================

async function putHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  // Rate limiting
  const rlResult = await checkWriteEndpointLimit(request);
  if (rlResult) return rlResult;

  const id = params?.id;

  if (!id) {
    return errorResponse('ID không hợp lệ', 400);
  }

  // Check if supplier exists
  const existing = await prisma.supplier.findUnique({
    where: { id },
  });

  if (!existing) {
    return notFoundResponse('Nhà cung cấp');
  }

  // Parse and validate body
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Dữ liệu JSON không hợp lệ', 400);
  }

  const validation = updateSupplierSchema.safeParse(body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    validation.error.issues.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(err.message);
    });
    return validationErrorResponse(errors);
  }

  // Check unique code if changing
  if (validation.data.code && validation.data.code !== existing.code) {
    const codeExists = await prisma.supplier.findUnique({
      where: { code: validation.data.code },
    });
    if (codeExists) {
      return errorResponse('Mã nhà cung cấp đã tồn tại', 409);
    }
  }

  // Update supplier
  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      ...validation.data,
      updatedAt: new Date(),
    },
  });

  // Audit trail: log changes
  auditUpdate(request, { id: user.id, name: user.name, email: user.email }, "Supplier", id!, existing as unknown as Record<string, unknown>, validation.data as Record<string, unknown>);

  return successResponse(supplier);
}

// =============================================================================
// DELETE - Delete supplier (soft delete)
// =============================================================================

async function deleteHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  // Rate limiting
  const rlResult2 = await checkWriteEndpointLimit(request);
  if (rlResult2) return rlResult2;

  const id = params?.id;

  if (!id) {
    return errorResponse('ID không hợp lệ', 400);
  }

  // Check if supplier exists
  const existing = await prisma.supplier.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          purchaseOrders: {
            where: {
              status: { in: ['draft', 'pending', 'confirmed', 'in_progress'] },
            },
          },
        },
      },
    },
  });

  if (!existing) {
    return notFoundResponse('Nhà cung cấp');
  }

  // Check for active purchase orders
  if (existing._count.purchaseOrders > 0) {
    return errorResponse(
      `Không thể xóa nhà cung cấp này vì còn ${existing._count.purchaseOrders} đơn hàng đang xử lý`,
      409
    );
  }

  // Soft delete - set status to inactive
  await prisma.supplier.update({
    where: { id },
    data: {
      status: 'inactive',
      updatedAt: new Date(),
    },
  });

  // Audit trail: log delete
  auditDelete(request, { id: user.id, name: user.name, email: user.email }, "Supplier", id!, { code: existing.code, name: existing.name });

  return successResponse({ deleted: true, id });
}

// =============================================================================
// EXPORT HANDLERS WITH PERMISSIONS
// =============================================================================

export const GET = withPermission(getHandler, {
  read: 'orders:view',
});

export const PUT = withPermission(putHandler, {
  update: 'orders:edit',
});

export const DELETE = withPermission(deleteHandler, {
  delete: 'orders:delete',
});
