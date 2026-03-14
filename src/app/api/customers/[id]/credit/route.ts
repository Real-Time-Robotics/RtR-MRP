// =============================================================================
// CUSTOMER CREDIT API
// GET /api/customers/[id]/credit — Get credit status
// PUT /api/customers/[id]/credit — Update credit settings (admin/manager only)
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
import { withRoleAuth, AuthSession, RouteContext } from '@/lib/api/with-auth';
import { updateCreditSchema } from '@/lib/validations/customer-credit';
import { calculateCreditUsed } from '@/lib/customers/credit-engine';
import { auditUpdate } from '@/lib/audit/route-audit';
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

// =============================================================================
// GET — Credit status
// =============================================================================

async function getHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      creditLimit: true,
      creditUsed: true,
      paymentTerms: true,
      tier: true,
    },
  });

  if (!customer) return notFoundResponse('Khách hàng');

  // Recalculate credit used from actual orders
  const freshCreditUsed = await calculateCreditUsed(id);

  // Update if stale
  if (freshCreditUsed !== customer.creditUsed) {
    await prisma.customer.update({
      where: { id },
      data: { creditUsed: freshCreditUsed },
    });
  }

  const creditLimit = customer.creditLimit;
  const remaining = creditLimit === 0 ? Infinity : creditLimit - freshCreditUsed;
  const utilizationPercent =
    creditLimit > 0
      ? Math.round((freshCreditUsed / creditLimit) * 10000) / 100
      : 0;

  return successResponse({
    ...customer,
    creditUsed: freshCreditUsed,
    creditRemaining: remaining === Infinity ? null : Math.round(remaining * 100) / 100,
    utilizationPercent,
    isUnlimited: creditLimit === 0,
  });
}

// =============================================================================
// PUT — Update credit settings (admin/manager only)
// =============================================================================

async function putRoleHandler(
  request: NextRequest,
  context: RouteContext,
  session: AuthSession
) {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await context.params;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return notFoundResponse('Khách hàng');

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const validation = updateCreditSchema.safeParse(body);
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

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit }),
      ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms }),
      ...(data.tier !== undefined && { tier: data.tier }),
    },
    select: {
      id: true,
      code: true,
      name: true,
      creditLimit: true,
      creditUsed: true,
      paymentTerms: true,
      tier: true,
    },
  });

  auditUpdate(
    request,
    { id: session.user.id, name: session.user.name, email: session.user.email },
    'Customer',
    id,
    {
      creditLimit: customer.creditLimit,
      paymentTerms: customer.paymentTerms,
      tier: (customer as any).tier,
    } as unknown as Record<string, unknown>,
    data as Record<string, unknown>
  );

  return successResponse(updated);
}

// =============================================================================
// EXPORTS
// =============================================================================

export const GET = withPermission(getHandler, { read: 'orders:view' });
export const PUT = withRoleAuth(['admin', 'manager'], putRoleHandler);
