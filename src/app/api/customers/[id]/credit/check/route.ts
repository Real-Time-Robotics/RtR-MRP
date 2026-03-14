// =============================================================================
// CREDIT CHECK API
// POST /api/customers/[id]/credit/check — Check if order amount is within credit
// =============================================================================

import { NextRequest } from 'next/server';
import {
  withPermission,
  successResponse,
  errorResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { checkCreditAvailable } from '@/lib/customers/credit-engine';
import { checkReadEndpointLimit } from '@/lib/rate-limit';

async function postHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const amount = body?.amount;
  if (typeof amount !== 'number' || amount <= 0) {
    return errorResponse('Số tiền phải là số dương', 400);
  }

  try {
    const result = await checkCreditAvailable(id, amount);

    return successResponse({
      ...result,
      remaining: result.remaining === Infinity ? null : result.remaining,
      orderAmount: amount,
      message: result.available
        ? 'Đủ hạn mức tín dụng'
        : `Vượt hạn mức ${Math.round((amount - result.remaining) * 100) / 100}`,
    });
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    console.error('[CREDIT_CHECK]', error);
    return errorResponse('Không thể kiểm tra hạn mức', 500);
  }
}

export const POST = withPermission(postHandler, { create: 'orders:create' });
