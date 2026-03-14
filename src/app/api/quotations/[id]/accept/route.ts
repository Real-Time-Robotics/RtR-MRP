// =============================================================================
// QUOTATION ACCEPT API
// POST /api/quotations/[id]/accept — Accept quotation and auto-convert to SO
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

  if (quotation.status !== 'sent') {
    return errorResponse(
      `Chỉ có thể chấp nhận báo giá ở trạng thái "sent". Trạng thái hiện tại: ${quotation.status}`,
      400
    );
  }

  try {
    // Parse optional overrides from body
    let overrides;
    try {
      const body = await request.json();
      overrides = body;
    } catch {
      // No body is fine for accept
    }

    const result = await convertQuotationToSO({
      quotationId: id,
      userId: user.id,
      sourceType: 'quote_auto',
      overrides,
    });

    auditStatusChange(
      request,
      { id: user.id, name: user.name, email: user.email },
      'Quotation',
      id,
      'sent',
      'converted'
    );

    return successResponse({
      message: 'Báo giá đã được chấp nhận và chuyển đổi thành đơn hàng',
      ...result,
    });
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    console.error('[QUOTATION_ACCEPT]', error);
    return errorResponse('Không thể chấp nhận báo giá', 500);
  }
}

export const POST = withPermission(postHandler, { create: 'orders:create' });
