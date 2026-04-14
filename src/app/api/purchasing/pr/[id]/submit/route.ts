import { NextRequest } from 'next/server';
import {
  withPermission,
  successResponse,
  errorResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { PRService, PRServiceError } from '@/lib/purchasing/pr-service';

async function handler(
  _request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser },
) {
  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);
  try {
    const pr = await PRService.submitPR(id, user.id);
    return successResponse(pr);
  } catch (e) {
    if (e instanceof PRServiceError) return errorResponse(e.message, 400);
    throw e;
  }
}

export const POST = withPermission(handler, { create: 'purchasing:create' });
