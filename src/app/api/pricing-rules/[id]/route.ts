// =============================================================================
// PRICING RULE DETAIL API
// GET    /api/pricing-rules/[id] — Get detail
// PUT    /api/pricing-rules/[id] — Update
// DELETE /api/pricing-rules/[id] — Delete
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
import { updatePricingRuleSchema } from '@/lib/validations/pricing-rule';
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

  const rule = await prisma.pricingRule.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, code: true, name: true } },
      part: { select: { id: true, partNumber: true, name: true, unitCost: true } },
    },
  });

  if (!rule) return notFoundResponse('Quy tắc giá');
  return successResponse(rule);
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

  const existing = await prisma.pricingRule.findUnique({ where: { id } });
  if (!existing) return notFoundResponse('Quy tắc giá');

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const validation = updatePricingRuleSchema.safeParse(body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    validation.error.issues.forEach((err) => {
      const path = err.path.join('.') || '_root';
      if (!errors[path]) errors[path] = [];
      errors[path].push(err.message);
    });
    return validationErrorResponse(errors);
  }

  const data = validation.data;

  // Build update data, converting date strings
  const updateData: Record<string, unknown> = { ...data };
  if (data.validFrom !== undefined) {
    updateData.validFrom = data.validFrom ? new Date(data.validFrom) : null;
  }
  if (data.validTo !== undefined) {
    updateData.validTo = data.validTo ? new Date(data.validTo) : null;
  }

  const rule = await prisma.pricingRule.update({
    where: { id },
    data: updateData,
    include: {
      customer: { select: { id: true, code: true, name: true } },
      part: { select: { id: true, partNumber: true, name: true } },
    },
  });

  auditUpdate(
    request,
    { id: user.id, name: user.name, email: user.email },
    'PricingRule',
    id,
    existing as unknown as Record<string, unknown>,
    data as Record<string, unknown>
  );

  return successResponse(rule);
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

  const existing = await prisma.pricingRule.findUnique({ where: { id } });
  if (!existing) return notFoundResponse('Quy tắc giá');

  await prisma.pricingRule.delete({ where: { id } });

  auditDelete(
    request,
    { id: user.id, name: user.name, email: user.email },
    'PricingRule',
    id,
    { name: existing.name, type: existing.type }
  );

  return successResponse({ deleted: true, id });
}

// =============================================================================
// EXPORTS
// =============================================================================

export const GET = withPermission(getHandler, { read: 'orders:view' });
export const PUT = withPermission(putHandler, { update: 'orders:edit' });
export const DELETE = withPermission(deleteHandler, { delete: 'orders:delete' });
