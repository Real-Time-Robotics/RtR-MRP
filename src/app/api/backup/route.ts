// src/app/api/backup/route.ts
// Backup API - Create and list backups

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createBackup,
  listBackups,
  cleanupOldBackups,
} from '@/lib/backup/backup-service';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Validation schema
const createBackupSchema = z.object({
  type: z.enum(['MANUAL', 'AUTO', 'PRE_UPDATE']).default('MANUAL'),
  name: z.string().optional(),
});

// GET /api/backup - List backups
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permission
    if (session.user.role !== 'admin' && session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type') || undefined;

    const backups = await listBackups({ limit, type });

    return NextResponse.json({
      success: true,
      data: backups,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/backup' });
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    );
  }
}

// POST /api/backup - Create a new backup
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permission
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createBackupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await createBackup({
      type: parsed.data.type,
      name: parsed.data.name,
      userId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Backup failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        backupId: result.backupId,
        filePath: result.filePath,
        fileSize: result.fileSize,
        duration: result.duration,
      },
      message: 'Backup created successfully',
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/backup' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create backup' },
      { status: 500 }
    );
  }
}

// DELETE /api/backup - Cleanup old backups
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permission
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deletedCount = await cleanupOldBackups();

    return NextResponse.json({
      success: true,
      data: { deletedCount },
      message: `Cleaned up ${deletedCount} old backup(s)`,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/backup' });
    return NextResponse.json(
      { error: 'Failed to cleanup backups' },
      { status: 500 }
    );
  }
}
