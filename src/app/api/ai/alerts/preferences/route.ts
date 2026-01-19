// =============================================================================
// API: /api/ai/alerts/preferences
// User notification preferences
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { unifiedAlertService, NotificationPreferences } from '@/lib/ai/alerts';

// =============================================================================
// GET: Get user preferences
// =============================================================================

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = unifiedAlertService.getUserPreferences(session.user.id);

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('[Preferences API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT: Update user preferences
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates: Partial<NotificationPreferences> = body;

    const preferences = unifiedAlertService.updateUserPreferences(
      session.user.id,
      updates
    );

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('[Preferences API] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
