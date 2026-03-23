// =============================================================================
// SUPPLIER RANKING API
// GET /api/suppliers/ranking — Leaderboard sorted by latest overallScore
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  withPermission,
  successResponse,
  errorResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { checkReadEndpointLimit } from '@/lib/rate-limit';
import { cacheAside } from '@/lib/cache';

async function getHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit')) || 20;
  const sortBy = url.searchParams.get('sortBy') || 'overallScore';

  // Valid sort columns
  const validSorts = ['overallScore', 'deliveryScore', 'qualityScore', 'priceScore', 'responseScore'];
  const sortColumn = validSorts.includes(sortBy) ? sortBy : 'overallScore';

  const cacheKey = `suppliers:ranking:${sortColumn}:${limit}`;
  const ranked = await cacheAside(cacheKey, async () => {
  // Get suppliers with their latest score — limit to top N
  const suppliers = await prisma.supplier.findMany({
    where: { status: 'active' },
    take: 200,
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      rating: true,
      scores: {
        orderBy: { periodEnd: 'desc' },
        take: 1,
        select: {
          overallScore: true,
          deliveryScore: true,
          qualityScore: true,
          priceScore: true,
          responseScore: true,
          periodEnd: true,
        },
      },
    },
  });

  // Map to ranking format, only include suppliers with scores
  const withScores = suppliers
    .filter((s) => s.scores.length > 0)
    .map((s) => ({
      supplierId: s.id,
      supplierCode: s.code,
      supplierName: s.name,
      category: s.category,
      currentRating: s.rating,
      latestScore: s.scores[0],
    }));

  // Sort by the chosen column
  withScores.sort((a, b) => {
    const aVal = (a.latestScore as any)[sortColumn] || 0;
    const bVal = (b.latestScore as any)[sortColumn] || 0;
    return bVal - aVal;
  });

  // Add rank
  return withScores.slice(0, limit).map((item, index) => ({
    rank: index + 1,
    ...item,
  }));
  }, 300); // Cache for 5 minutes

  return successResponse({
    rankings: ranked,
    total: ranked.length,
  });
}

export const GET = withPermission(getHandler, { read: 'orders:view' });
