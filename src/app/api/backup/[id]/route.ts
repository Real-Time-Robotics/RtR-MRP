// src/app/api/backup/[id]/route.ts
// Backup API - Get specific backup and download

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { getBackup, getBackupFile } from '@/lib/backup/backup-service';
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
// GET /api/backup/[id] - Get backup details or download
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
// Check admin permission
    if (session.user.role !== 'admin' && session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';

    if (download) {
      // Download the backup file
      const file = await getBackupFile(id);
      if (!file) {
        return NextResponse.json(
          { error: 'Backup file not found' },
          { status: 404 }
        );
      }

      // Convert Buffer to Uint8Array for NextResponse compatibility
      const uint8Array = new Uint8Array(file.buffer);

      return new NextResponse(uint8Array, {
        headers: {
          'Content-Type': file.mimeType,
          'Content-Disposition': `attachment; filename="${file.fileName}"`,
          'Content-Length': file.buffer.length.toString(),
        },
      });
    }

    // Get backup details
    const backup = await getBackup(id);
    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: backup,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/backup/[id]' });
    return NextResponse.json(
      { error: 'Failed to get backup' },
      { status: 500 }
    );
  }
});
