import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/logger';
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
// VALIDATION SCHEMA
// =============================================================================

const updateCustomerSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  type: z.string().nullish(),
  country: z.string().nullish(),
  contactName: z.string().nullish(),
  contactEmail: z.string().email('Email không hợp lệ').nullish().or(z.literal('')),
  contactPhone: z.string().nullish(),
  billingAddress: z.string().nullish(),
  paymentTerms: z.string().nullish(),
  creditLimit: z.number().min(0).optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
});

// =============================================================================
// GET - Get single customer
// =============================================================================

async function getHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  // Rate limiting
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      salesOrders: {
        take: 10,
        orderBy: { orderDate: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          orderDate: true,
          status: true,
          totalAmount: true,
        },
      },
      _count: {
        select: { salesOrders: true },
      },
    },
  });

  if (!customer) return notFoundResponse('Khách hàng');
  return successResponse(customer);
}

// =============================================================================
// PUT - Update customer
// =============================================================================

async function putHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  // Rate limiting
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return notFoundResponse('Khách hàng');

  let body;
  try {
    body = await request.json();
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/customers/[id]', detail: 'Invalid JSON body' });
    return errorResponse('Dữ liệu JSON không hợp lệ', 400);
  }

  const validation = updateCustomerSchema.safeParse(body);
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
    const codeExists = await prisma.customer.findUnique({
      where: { code: validation.data.code },
    });
    if (codeExists) return errorResponse('Mã khách hàng đã tồn tại', 409);
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...validation.data,
      contactEmail: validation.data.contactEmail || null,
    },
  });

  // Audit trail: log changes
  auditUpdate(request, { id: user.id, name: user.name, email: user.email }, "Customer", id!, existing as unknown as Record<string, unknown>, validation.data as Record<string, unknown>);

  return successResponse(customer);
}

// =============================================================================
// DELETE - Delete customer (soft delete)
// =============================================================================

async function deleteHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  // Rate limiting
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const existing = await prisma.customer.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          salesOrders: {
            where: { status: { in: ['draft', 'pending', 'confirmed'] } },
          },
        },
      },
    },
  });

  if (!existing) return notFoundResponse('Khách hàng');

  if (existing._count.salesOrders > 0) {
    return errorResponse(
      `Không thể xóa khách hàng này vì còn ${existing._count.salesOrders} đơn hàng đang xử lý`,
      409
    );
  }

  await prisma.customer.update({
    where: { id },
    data: { status: 'inactive' },
  });

  // Audit trail: log delete
  auditDelete(request, { id: user.id, name: user.name, email: user.email }, "Customer", id!, { code: existing.code, name: existing.name });

  return successResponse({ deleted: true, id });
}

// =============================================================================
// EXPORT HANDLERS WITH PERMISSIONS
// =============================================================================

export const GET = withPermission(getHandler, { read: 'orders:view' });
export const PUT = withPermission(putHandler, { update: 'orders:edit' });
export const DELETE = withPermission(deleteHandler, { delete: 'orders:delete' });
