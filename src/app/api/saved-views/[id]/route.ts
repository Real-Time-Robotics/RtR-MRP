// src/app/api/saved-views/[id]/route.ts
// Saved Views API - Single view operations

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getSavedView,
  updateSavedView,
  deleteSavedView,
  duplicateSavedView,
} from '@/lib/saved-views/saved-views-service';
import { z } from 'zod';

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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const view = await getSavedView(id, session.user.id);

    if (!view) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: view,
    });
  } catch (error) {
    console.error('Failed to get saved view:', error);
    return NextResponse.json(
      { error: 'Failed to get saved view' },
      { status: 500 }
    );
  }
}

// PUT /api/saved-views/[id] - Update a view
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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
    console.error('Failed to update saved view:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update saved view' },
      { status: 500 }
    );
  }
}

// DELETE /api/saved-views/[id] - Delete a view
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteSavedView(id, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'View deleted',
    });
  } catch (error) {
    console.error('Failed to delete saved view:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete saved view' },
      { status: 500 }
    );
  }
}

// POST /api/saved-views/[id] - Duplicate a view
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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
    console.error('Failed to duplicate saved view:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to duplicate saved view' },
      { status: 500 }
    );
  }
}
