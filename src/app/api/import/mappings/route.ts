// src/app/api/import/mappings/route.ts
// Import Mappings API - CRUD for saved column mappings

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  saveImportMapping,
  getSavedMappings,
  useSavedMapping,
  deleteSavedMapping,
} from '@/lib/import';
import { z } from 'zod';

// Validation schema
const createMappingSchema = z.object({
  name: z.string().min(1).max(100),
  targetType: z.string().min(1),
  mapping: z.record(z.string(), z.string()),
});

// GET /api/import/mappings - Get saved mappings
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get('targetType') || undefined;

    const mappings = await getSavedMappings(session.user.id, targetType);

    return NextResponse.json({ success: true, data: mappings });
  } catch (error) {
    console.error('Failed to get saved mappings:', error);
    return NextResponse.json(
      { error: 'Failed to get saved mappings' },
      { status: 500 }
    );
  }
}

// POST /api/import/mappings - Create new mapping
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    console.error('Failed to save mapping:', error);
    return NextResponse.json(
      { error: 'Failed to save mapping' },
      { status: 500 }
    );
  }
}

// PUT /api/import/mappings - Use a mapping (increment usage count)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mappingId } = body;

    if (!mappingId) {
      return NextResponse.json(
        { error: 'Mapping ID required' },
        { status: 400 }
      );
    }

    const mapping = await useSavedMapping(mappingId);

    return NextResponse.json({
      success: true,
      data: mapping,
    });
  } catch (error) {
    console.error('Failed to update mapping:', error);
    return NextResponse.json(
      { error: 'Failed to update mapping' },
      { status: 500 }
    );
  }
}

// DELETE /api/import/mappings - Delete a mapping
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    console.error('Failed to delete mapping:', error);
    return NextResponse.json(
      { error: 'Failed to delete mapping' },
      { status: 500 }
    );
  }
}
