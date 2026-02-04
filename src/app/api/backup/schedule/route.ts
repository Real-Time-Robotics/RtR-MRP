// src/app/api/backup/schedule/route.ts
// Backup Schedule API - Manage backup schedule settings

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getBackupSchedule,
  updateBackupSchedule,
} from '@/lib/backup/backup-service';
import { z } from 'zod';

// Validation schema
const updateScheduleSchema = z.object({
  enabled: z.boolean().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  retention: z.number().min(1).max(365).optional(),
});

// GET /api/backup/schedule - Get backup schedule settings
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

    const schedule = await getBackupSchedule();

    return NextResponse.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error('Failed to get backup schedule:', error);
    return NextResponse.json(
      { error: 'Failed to get backup schedule' },
      { status: 500 }
    );
  }
}

// PUT /api/backup/schedule - Update backup schedule settings
export async function PUT(request: NextRequest) {
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
    console.error('Failed to update backup schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update backup schedule' },
      { status: 500 }
    );
  }
}
