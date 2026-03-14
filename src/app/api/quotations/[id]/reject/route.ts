// =============================================================================
// QUOTATION REJECT API
// POST /api/quotations/[id]/reject — Reject quotation with reason
// =============================================================================

import { NextRequest } from 'next/server';
import {
  withPermission,
  successResponse,
  errorResponse,
  notFoundResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { prisma } from '@/lib/prisma';
import { auditStatusChange } from '@/lib/audit/route-audit';
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

async function postHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const { reason } = body;
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return errorResponse('Lý do từ chối là bắt buộc', 400);
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    select: { id: true, status: true, quoteNumber: true, salesOrderId: true },
  });

  if (!quotation) return notFoundResponse('Báo giá');

  if (quotation.salesOrderId) {
    return errorResponse('Không thể từ chối báo giá đã chuyển đổi', 400);
  }

  if (quotation.status !== 'sent' && quotation.status !== 'accepted') {
    return errorResponse(
      `Chỉ có thể từ chối báo giá ở trạng thái "sent" hoặc "accepted". Trạng thái hiện tại: ${quotation.status}`,
      400
    );
  }

  const previousStatus = quotation.status;

  const updated = await prisma.quotation.update({
    where: { id },
    data: {
      status: 'rejected',
      notes: quotation.status === 'sent'
        ? `Từ chối: ${reason.trim()}`
        : undefined,
    },
    include: {
      customer: { select: { id: true, code: true, name: true } },
      items: {
        include: {
          part: { select: { id: true, partNumber: true, name: true } },
        },
      },
    },
  });

  auditStatusChange(
    request,
    { id: user.id, name: user.name, email: user.email },
    'Quotation',
    id,
    previousStatus,
    'rejected'
  );

  return successResponse({
    message: 'Báo giá đã bị từ chối',
    quotation: updated,
  });
}

export const POST = withPermission(postHandler, { update: 'orders:edit' });
