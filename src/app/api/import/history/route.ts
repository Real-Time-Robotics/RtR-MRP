// src/app/api/import/history/route.ts
// Import History API - Get import history and session details

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { getImportHistory, getImportSession, getImportLogs } from '@/lib/import';
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
// GET /api/import/history - Get import history
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const logsOnly = searchParams.get('logsOnly') === 'true';

    // If sessionId provided, get specific session or its logs
    if (sessionId) {
      if (logsOnly) {
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '50');
        const status = searchParams.get('status') || undefined;

        const result = await getImportLogs(sessionId, { page, pageSize, status });
        return NextResponse.json({ success: true, data: result });
      }

      const importSession = await getImportSession(sessionId);

      if (!importSession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      // Check ownership
      if (importSession.importedBy !== session.user.id) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }

      return NextResponse.json({ success: true, data: importSession });
    }

    // Get paginated history
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') || undefined;
    const entityType = searchParams.get('entityType') || undefined;

    const result = await getImportHistory(session.user.id, {
      page,
      pageSize,
      status,
      entityType,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/import/history' });
    return NextResponse.json(
      { error: 'Failed to get import history' },
      { status: 500 }
    );
  }
});
