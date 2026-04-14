import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  withPermission,
  successResponse,
  errorResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { PRService, PRServiceError } from '@/lib/purchasing/pr-service';

const cancelSchema = z.object({ reason: z.string().optional() });

async function getHandler(
  _request: NextRequest,
  { params }: { params?: Record<string, string>; user: AuthUser },
) {
  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);
  try {
    const pr = await PRService.getPRPipelineStatus(id);
    return successResponse(pr);
  } catch (e) {
    if (e instanceof PRServiceError) return errorResponse(e.message, 404);
    throw e;
  }
}

async function deleteHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser },
) {
  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);
  let reason: string | undefined;
  try {
    const body = await request.json();
    reason = cancelSchema.parse(body).reason;
  } catch {
    // body optional
  }
  try {
    const pr = await PRService.cancelPR(id, user.id, reason);
    return successResponse(pr);
  } catch (e) {
    if (e instanceof PRServiceError) return errorResponse(e.message, 400);
    throw e;
  }
}

export const GET = withPermission(getHandler, { read: 'purchasing:view' });
export const DELETE = withPermission(deleteHandler, { delete: 'purchasing:create' });
