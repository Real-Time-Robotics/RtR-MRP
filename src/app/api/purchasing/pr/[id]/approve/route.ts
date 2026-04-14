import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  withPermission,
  successResponse,
  errorResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { PRService, PRServiceError } from '@/lib/purchasing/pr-service';

const schema = z.object({ notes: z.string().optional() });

async function handler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser },
) {
  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);
  let notes: string | undefined;
  try {
    const body = await request.json();
    notes = schema.parse(body).notes;
  } catch {
    // body optional
  }
  try {
    const pr = await PRService.approvePR(id, user.id, notes);
    return successResponse(pr);
  } catch (e) {
    if (e instanceof PRServiceError) return errorResponse(e.message, 400);
    throw e;
  }
}

export const POST = withPermission(handler, { create: 'purchasing:approve' });
