// =============================================================================
// SUPPLIER SCORE CALCULATE API
// POST /api/suppliers/[id]/scores/calculate — Calculate & save score for period
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from '@/lib/api/with-permission';
import { withRoleAuth, AuthSession, RouteContext } from '@/lib/api/with-auth';
import { calculateScoreSchema } from '@/lib/validations/supplier-score';
import { calculateSupplierScore } from '@/lib/suppliers/scoring-engine';
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

async function postHandler(
  request: NextRequest,
  context: RouteContext,
  session: AuthSession
) {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await context.params;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return notFoundResponse('Nhà cung cấp');

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const validation = calculateScoreSchema.safeParse(body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    validation.error.issues.forEach((err) => {
      const path = err.path.join('.') || '_root';
      if (!errors[path]) errors[path] = [];
      errors[path].push(err.message);
    });
    return validationErrorResponse(errors);
  }

  const { periodStart, periodEnd } = validation.data;

  const result = await calculateSupplierScore(
    id,
    new Date(periodStart),
    new Date(periodEnd)
  );

  // Upsert: update if same period exists
  const score = await prisma.supplierScore.upsert({
    where: {
      supplierId_periodStart_periodEnd: {
        supplierId: id,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      },
    },
    create: {
      supplierId: id,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      deliveryScore: result.deliveryScore,
      qualityScore: result.qualityScore,
      priceScore: result.priceScore,
      responseScore: result.responseScore,
      overallScore: result.overallScore,
      totalOrders: result.stats.totalOrders,
      onTimeOrders: result.stats.onTimeOrders,
      lateOrders: result.stats.lateOrders,
      totalItems: result.stats.totalItems,
      acceptedItems: result.stats.acceptedItems,
      rejectedItems: result.stats.rejectedItems,
      avgLeadTimeDays: result.stats.avgLeadTimeDays,
      avgPriceVariance: result.stats.avgPriceVariance,
      calculatedById: session.user.id,
      calculatedAt: new Date(),
    },
    update: {
      deliveryScore: result.deliveryScore,
      qualityScore: result.qualityScore,
      priceScore: result.priceScore,
      responseScore: result.responseScore,
      overallScore: result.overallScore,
      totalOrders: result.stats.totalOrders,
      onTimeOrders: result.stats.onTimeOrders,
      lateOrders: result.stats.lateOrders,
      totalItems: result.stats.totalItems,
      acceptedItems: result.stats.acceptedItems,
      rejectedItems: result.stats.rejectedItems,
      avgLeadTimeDays: result.stats.avgLeadTimeDays,
      avgPriceVariance: result.stats.avgPriceVariance,
      calculatedById: session.user.id,
      calculatedAt: new Date(),
    },
  });

  return successResponse(score);
}

export const POST = withRoleAuth(['admin', 'manager'], postHandler);
