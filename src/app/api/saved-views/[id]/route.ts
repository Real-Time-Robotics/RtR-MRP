// src/app/api/saved-views/[id]/route.ts
// Saved Views API - Single view operations

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import {
  getSavedView,
  updateSavedView,
  deleteSavedView,
  duplicateSavedView,
} from '@/lib/saved-views/saved-views-service';
import { z } from 'zod';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// Validation schema
const updateViewSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  sort: z.object({
    column: z.string(),
    direction: z.enum(['asc', 'desc']),
  }).optional(),
  columns: z.object({
    visible: z.array(z.string()),
    order: z.array(z.string()).optional(),
    widths: z.record(z.string(), z.number()).optional(),
  }).optional(),
  isDefault: z.boolean().optional(),
  isShared: z.boolean().optional(),
});

// GET /api/saved-views/[id] - Get a single view
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const view = await getSavedView(id, session.user.id);

    if (!view) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: view,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/saved-views/[id]' });
    return NextResponse.json(
      { error: 'Failed to get saved view' },
      { status: 500 }
    );
  }
});

// PUT /api/saved-views/[id] - Update a view
export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateViewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const view = await updateSavedView(id, parsed.data, session.user.id);

    return NextResponse.json({
      success: true,
      data: view,
      message: 'View updated successfully',
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/saved-views/[id]' });
    return NextResponse.json(
      { error: 'Failed to update saved view' },
      { status: 500 }
    );
  }
});

// DELETE /api/saved-views/[id] - Delete a view
export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    await deleteSavedView(id, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'View deleted',
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/saved-views/[id]' });
    return NextResponse.json(
      { error: 'Failed to delete saved view' },
      { status: 500 }
    );
  }
});

// POST /api/saved-views/[id] - Duplicate a view
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const newName = body.name;

    if (!newName || typeof newName !== 'string') {
      return NextResponse.json(
        { error: 'name is required for duplication' },
        { status: 400 }
      );
    }

    const view = await duplicateSavedView(id, session.user.id, newName);

    return NextResponse.json({
      success: true,
      data: view,
      message: 'View duplicated successfully',
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/saved-views/[id]' });
    return NextResponse.json(
      { error: 'Failed to duplicate saved view' },
      { status: 500 }
    );
  }
});
