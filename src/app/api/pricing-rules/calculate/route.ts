// =============================================================================
// PRICE CALCULATION API
// GET /api/pricing-rules/calculate?partId=&customerId=&quantity=
// Returns calculated price with applied rules
// =============================================================================

import { NextRequest } from 'next/server';
import {
  withPermission,
  successResponse,
  errorResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { calculatePrice } from '@/lib/sales/pricing-engine';
import { checkReadEndpointLimit } from '@/lib/rate-limit';

async function getHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const { searchParams } = new URL(request.url);
  const partId = searchParams.get('partId');
  const customerId = searchParams.get('customerId') || undefined;
  const quantity = parseInt(searchParams.get('quantity') || '1', 10);
  const dateStr = searchParams.get('date');

  if (!partId) {
    return errorResponse('partId là bắt buộc', 400);
  }

  if (isNaN(quantity) || quantity < 1) {
    return errorResponse('Số lượng phải là số nguyên dương', 400);
  }

  try {
    const result = await calculatePrice(
      partId,
      customerId,
      quantity,
      dateStr ? new Date(dateStr) : new Date()
    );

    return successResponse(result);
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    console.error('[PRICING_CALCULATE]', error);
    return errorResponse('Không thể tính giá', 500);
  }
}

export const GET = withPermission(getHandler, { read: 'orders:view' });
