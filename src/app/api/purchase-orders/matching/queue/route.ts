// =============================================================================
// MISMATCH QUEUE API
// GET /api/purchase-orders/matching/queue — Mismatches pending review (FIFO)
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  withPermission,
  successResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { checkReadEndpointLimit } from '@/lib/rate-limit';

async function getHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const mismatches = await prisma.threeWayMatch.findMany({
      where: { status: 'mismatch_pending_review' },
      include: {
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
            totalAmount: true,
            supplier: { select: { id: true, name: true, code: true } },
          },
        },
        grn: {
          select: {
            id: true,
            grnNumber: true,
            receivedDate: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // FIFO — oldest first
    });

    const stats = {
      total: mismatches.length,
      totalPoAmount: mismatches.reduce((sum, m) => sum + m.poTotalAmount, 0),
      avgQtyVariance:
        mismatches.length > 0
          ? Math.round(
              (mismatches.reduce((sum, m) => sum + Math.abs(m.qtyVariance || 0), 0) /
                mismatches.length) *
                100
            ) / 100
          : 0,
    };

    return successResponse({ mismatches, stats });
  } catch (error) {
    console.error('[MATCHING_QUEUE]', error);
    return successResponse({ mismatches: [], stats: { total: 0, totalPoAmount: 0, avgQtyVariance: 0 } });
  }
}

export const GET = withPermission(getHandler, { read: 'purchasing:view' });
