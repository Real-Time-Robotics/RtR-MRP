// src/app/api/backup/[id]/route.ts
// Backup API - Get specific backup and download

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getBackup, getBackupFile } from '@/lib/backup/backup-service';

// GET /api/backup/[id] - Get backup details or download
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permission
    if (session.user.role !== 'admin' && session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
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

      return new NextResponse(file.buffer, {
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
    console.error('Failed to get backup:', error);
    return NextResponse.json(
      { error: 'Failed to get backup' },
      { status: 500 }
    );
  }
}
