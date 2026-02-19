// src/app/api/saved-views/route.ts
// Saved Views API - CRUD for saved filters and views

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import {
  getSavedViews,
  getDefaultView,
  createSavedView,
} from '@/lib/saved-views/saved-views-service';
import { z } from 'zod';
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// Validation schemas
const createViewSchema = z.object({
  name: z.string().min(1).max(100),
  entityType: z.string().min(1).max(50),
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

// GET /api/saved-views - Get saved views
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const defaultOnly = searchParams.get('default') === 'true';

    if (!entityType) {
      return NextResponse.json(
        { error: 'entityType is required' },
        { status: 400 }
      );
    }

    if (defaultOnly) {
      const view = await getDefaultView(entityType, session.user.id);
      return NextResponse.json({
        success: true,
        data: view,
      });
    }

    const views = await getSavedViews(entityType, session.user.id);

    return NextResponse.json({
      success: true,
      data: views,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/saved-views' });
    return NextResponse.json(
      { error: 'Failed to get saved views' },
      { status: 500 }
    );
  }
});

// POST /api/saved-views - Create a saved view
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const body = await request.json();
    const parsed = createViewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const view = await createSavedView({
      ...parsed.data,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: view,
      message: 'View saved successfully',
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/saved-views' });
    return NextResponse.json(
      { error: 'Failed to create saved view' },
      { status: 500 }
    );
  }
});
