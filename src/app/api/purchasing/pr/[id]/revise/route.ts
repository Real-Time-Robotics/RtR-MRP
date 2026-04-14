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

const lineSchema = z.object({
  partId: z.string().optional().nullable(),
  itemDescription: z.string().optional().nullable(),
  itemCode: z.string().optional().nullable(),
  requestedQty: z.number().positive(),
  unit: z.string().optional(),
  estimatedPrice: z.number().min(0).optional().nullable(),
  preferredSupplierId: z.string().optional().nullable(),
  requiredDate: z.string().or(z.date()).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
  requiredDate: z.string().or(z.date()).optional(),
  lines: z.array(lineSchema).optional(),
});

async function handler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser },
) {
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
    const pr = await PRService.revisePR(id, user.id, parsed.data);
    return successResponse(pr);
  } catch (e) {
    if (e instanceof PRServiceError) return errorResponse(e.message, 400);
    throw e;
  }
}

export const POST = withPermission(handler, { update: 'purchasing:create' });
