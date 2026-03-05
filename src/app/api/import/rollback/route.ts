// src/app/api/import/rollback/route.ts
// Import Rollback API - Rollback a completed import session

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { rollbackImportSession, getImportSession } from '@/lib/import';
import { logger } from '@/lib/logger';
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

// POST /api/import/rollback - Rollback an import session
export const POST = withAuth(async (request, context, session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Get session and verify ownership
    const importSession = await getImportSession(sessionId);

    if (!importSession) {
      return NextResponse.json(
        { error: 'Import session not found' },
        { status: 404 }
      );
    }

    if (importSession.importedBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Only allow rollback for COMPLETED or COMPLETED_WITH_ERRORS
    const allowedStatuses = ['COMPLETED', 'COMPLETED_WITH_ERRORS'];
    if (!allowedStatuses.includes(importSession.status)) {
      return NextResponse.json(
        { error: `Cannot rollback session with status: ${importSession.status}` },
        { status: 400 }
      );
    }

    // Execute rollback (returns actual deleted count)
    const result = await rollbackImportSession(sessionId);

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        status: 'ROLLED_BACK',
        recordsDeleted: result.deletedCount,
      },
      message: `Successfully rolled back ${result.deletedCount} records`,
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: '/api/import/rollback' }
    );
    return NextResponse.json(
      { error: 'Failed to rollback import session' },
      { status: 500 }
    );
  }
});
