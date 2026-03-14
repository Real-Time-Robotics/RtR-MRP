// =============================================================================
// QUOTATION CONVERT API
// POST /api/quotations/[id]/convert — Manually convert quotation to SO
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
import { convertQuotationToSO } from '@/lib/sales/quote-conversion';
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

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    select: { id: true, status: true, quoteNumber: true, salesOrderId: true },
  });

  if (!quotation) return notFoundResponse('Báo giá');

  if (quotation.salesOrderId) {
    return errorResponse('Báo giá đã được chuyển đổi thành đơn hàng', 400);
  }

  // Manual convert allows both sent and accepted statuses
  if (quotation.status !== 'sent' && quotation.status !== 'accepted') {
    return errorResponse(
      `Chỉ có thể chuyển đổi báo giá ở trạng thái "sent" hoặc "accepted". Trạng thái hiện tại: ${quotation.status}`,
      400
    );
  }

  try {
    let overrides;
    try {
      const body = await request.json();
      overrides = body;
    } catch {
      // No body is fine
    }

    const previousStatus = quotation.status;

    const result = await convertQuotationToSO({
      quotationId: id,
      userId: user.id,
      sourceType: 'quote_manual',
      overrides,
    });

    auditStatusChange(
      request,
      { id: user.id, name: user.name, email: user.email },
      'Quotation',
      id,
      previousStatus,
      'converted'
    );

    return successResponse({
      message: 'Báo giá đã được chuyển đổi thành đơn hàng',
      ...result,
    });
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    console.error('[QUOTATION_CONVERT]', error);
    return errorResponse('Không thể chuyển đổi báo giá', 500);
  }
}

export const POST = withPermission(postHandler, { create: 'orders:create' });
