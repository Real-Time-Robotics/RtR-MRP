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
  { params }: { params?: Record<string, string>; user: AuthUser },
) {
  const lineId = params?.lineId;
  if (!lineId) return errorResponse('Line ID không hợp lệ', 400);
  try {
    const tracking = await PRService.trackPRLineById(lineId);
    return successResponse(tracking);
  } catch (e) {
    if (e instanceof PRServiceError) return errorResponse(e.message, 404);
    throw e;
  }
}

export const GET = withPermission(handler, { read: 'purchasing:view' });
