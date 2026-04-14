import { NextRequest } from 'next/server';
import { z } from 'zod';
import { PRStatus } from '@prisma/client';
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

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
  requiredDate: z.string().or(z.date()),
  departmentId: z.string().optional(),
  currency: z.string().optional(),
  budgetCode: z.string().optional(),
  costCenter: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

async function getHandler(request: NextRequest, { user }: { user: AuthUser }) {
  const { searchParams } = new URL(request.url);
  const result = await PRService.searchPRs({
    search: searchParams.get('search') ?? undefined,
    status: (searchParams.get('status') as PRStatus) ?? undefined,
    requesterId: searchParams.get('requesterId') ?? undefined,
    page: Number(searchParams.get('page') ?? 1),
    limit: Number(searchParams.get('limit') ?? 20),
  });
  // PRList component reads result.items / result.pagination directly from
  // the response body, so spread alongside the standard success wrapper.
  return successResponse(result);
}

async function postHandler(request: NextRequest, { user }: { user: AuthUser }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    parsed.error.issues.forEach((err) => {
      const path = err.path.join('.');
      (errors[path] ||= []).push(err.message);
    });
    return validationErrorResponse(errors);
  }
  try {
    const pr = await PRService.createPR(parsed.data, user.id);
    return successResponse(pr, 201);
  } catch (e) {
    if (e instanceof PRServiceError) return errorResponse(e.message, 400);
    throw e;
  }
}

export const GET = withPermission(getHandler, { read: 'purchasing:view' });
export const POST = withPermission(postHandler, { create: 'purchasing:create' });
