// =============================================================================
// SUPPLIER SCORES API
// GET /api/suppliers/[id]/scores — Score history + trend
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  withPermission,
  successResponse,
  errorResponse,
  notFoundResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { checkReadEndpointLimit } from '@/lib/rate-limit';

async function getHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return notFoundResponse('Nhà cung cấp');

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit')) || 12;

  const scores = await prisma.supplierScore.findMany({
    where: { supplierId: id },
    orderBy: { periodEnd: 'desc' },
    take: limit,
  });

  const latestScore = scores[0] || null;

  // Trend: compare latest to previous period
  let trend = null;
  if (scores.length >= 2) {
    trend = {
      overall: Math.round((scores[0].overallScore - scores[1].overallScore) * 100) / 100,
      delivery: Math.round((scores[0].deliveryScore - scores[1].deliveryScore) * 100) / 100,
      quality: Math.round((scores[0].qualityScore - scores[1].qualityScore) * 100) / 100,
      price: Math.round((scores[0].priceScore - scores[1].priceScore) * 100) / 100,
      response: Math.round((scores[0].responseScore - scores[1].responseScore) * 100) / 100,
    };
  }

  return successResponse({
    latestScore,
    trend,
    history: scores,
  });
}

export const GET = withPermission(getHandler, { read: 'orders:view' });
