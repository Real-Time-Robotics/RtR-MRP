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

const schema = z.object({
  prIds: z.array(z.string().min(1)).min(1),
  orderDate: z.string().or(z.date()).optional(),
  expectedDate: z.string().or(z.date()).optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
});

async function handler(request: NextRequest, { user }: { user: AuthUser }) {
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
    const { prIds, ...options } = parsed.data;
    const poIds = await PRService.convertToPO(prIds, user.id, options);
    return successResponse({ poIds });
  } catch (e) {
    if (e instanceof PRServiceError) return errorResponse(e.message, 400);
    throw e;
  }
}

export const POST = withPermission(handler, { create: 'purchasing:approve' });
