// src/app/api/backup/schedule/route.ts
// Backup Schedule API - Manage backup schedule settings

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import {
  getBackupSchedule,
  updateBackupSchedule,
} from '@/lib/backup/backup-service';
import { z } from 'zod';
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// Validation schema
const updateScheduleSchema = z.object({
  enabled: z.boolean().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  retention: z.number().min(1).max(365).optional(),
});

// GET /api/backup/schedule - Get backup schedule settings
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
// Check admin permission
    if (session.user.role !== 'admin' && session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schedule = await getBackupSchedule();

    return NextResponse.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/backup/schedule' });
    return NextResponse.json(
      { error: 'Failed to get backup schedule' },
      { status: 500 }
    );
  }
});

// PUT /api/backup/schedule - Update backup schedule settings
export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
// Check admin permission
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const schedule = await updateBackupSchedule(parsed.data, session.user.id);

    return NextResponse.json({
      success: true,
      data: schedule,
      message: 'Backup schedule updated',
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/backup/schedule' });
    return NextResponse.json(
      { error: 'Failed to update backup schedule' },
      { status: 500 }
    );
  }
});
