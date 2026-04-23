import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  withPermission,
  successResponse,
  errorResponse,
  validationErrorResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { PRService, PRServiceError } from '@/lib/purchasing/pr-service';
import { handleError } from '@/lib/error-handler';

const schema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
});

async function handler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser },
) {
  try {
    const id = params?.id;
    if (!id) return errorResponse('ID không hợp lệ', 400);
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      parsed.error.issues.forEach((err) => {
        const path = err.path.join('.');
        (errors[path] ||= []).push(err.message);
      });
      return validationErrorResponse(errors);
    }
    try {
      const pr = await PRService.rejectPR(id, user.id, parsed.data.reason);
      return successResponse(pr);
    } catch (e) {
      if (e instanceof PRServiceError) return errorResponse(e.message, 400);
      throw e;
    }
  } catch (error) {
    return handleError(error);
  }
}

export const POST = withPermission(handler, { create: 'purchasing:approve' });
