// =============================================================================
// GRN DETAIL API
// GET /api/purchase-orders/grn/[id] — Get GRN detail
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  withPermission,
  successResponse,
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
  if (!id) {
    return notFoundResponse('Phiếu nhận hàng');
  }

  const grn = await prisma.goodsReceiptNote.findUnique({
    where: { id },
    include: {
      purchaseOrder: {
        select: {
          id: true,
          poNumber: true,
          status: true,
          supplier: { select: { id: true, name: true, code: true } },
        },
      },
      items: {
        include: {
          part: {
            select: {
              id: true,
              partNumber: true,
              name: true,
              unit: true,
            },
          },
        },
      },
    },
  });

  if (!grn) {
    return notFoundResponse('Phiếu nhận hàng');
  }

  return successResponse(grn);
}

export const GET = withPermission(getHandler, { read: 'purchasing:view' });
