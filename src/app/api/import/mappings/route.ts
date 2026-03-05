// src/app/api/import/mappings/route.ts
// Import Mappings API - CRUD for saved column mappings

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import {
  saveImportMapping,
  getSavedMappings,
  useSavedMapping,
  deleteSavedMapping,
} from '@/lib/import';
import { z } from 'zod';
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// Validation schema
const createMappingSchema = z.object({
  name: z.string().min(1).max(100),
  targetType: z.string().min(1),
  mapping: z.record(z.string(), z.string()),
});

// GET /api/import/mappings - Get saved mappings
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { searchParams } = new URL(request.url);
    const targetType = searchParams.get('targetType') || undefined;

    const mappings = await getSavedMappings(session.user.id, targetType);

    return NextResponse.json({ success: true, data: mappings });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/import/mappings' });
    return NextResponse.json(
      { error: 'Failed to get saved mappings' },
      { status: 500 }
    );
  }
});

// POST /api/import/mappings - Create new mapping
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const body = await request.json();
    const parsed = createMappingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, targetType, mapping } = parsed.data;

    const savedMapping = await saveImportMapping(
      name,
      targetType,
      mapping,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      data: savedMapping,
      message: 'Mapping saved successfully',
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/import/mappings' });
    return NextResponse.json(
      { error: 'Failed to save mapping' },
      { status: 500 }
    );
  }
});

// PUT /api/import/mappings - Use a mapping (increment usage count)
export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const body = await request.json();
    const { mappingId } = body;

    if (!mappingId) {
      return NextResponse.json(
        { error: 'Mapping ID required' },
        { status: 400 }
      );
    }

    // Verify ownership before updating usage
    const existing = await import('@/lib/prisma').then(m => m.default.importMapping.findUnique({
      where: { id: mappingId },
      select: { createdBy: true },
    }));

    if (!existing) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }
    if (existing.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const mapping = await useSavedMapping(mappingId);

    return NextResponse.json({
      success: true,
      data: mapping,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/import/mappings' });
    return NextResponse.json(
      { error: 'Failed to update mapping' },
      { status: 500 }
    );
  }
});

// DELETE /api/import/mappings - Delete a mapping
export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('id');

    if (!mappingId) {
      return NextResponse.json(
        { error: 'Mapping ID required' },
        { status: 400 }
      );
    }

    await deleteSavedMapping(mappingId, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Mapping deleted',
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/import/mappings' });
    return NextResponse.json(
      { error: 'Failed to delete mapping' },
      { status: 500 }
    );
  }
});
