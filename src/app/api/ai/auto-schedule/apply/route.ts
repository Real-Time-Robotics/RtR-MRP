// =============================================================================
// AUTO-SCHEDULE APPLY API - Apply schedule changes
// POST: Apply schedule to work orders
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getScheduleExecutor } from '@/lib/ai/autonomous/schedule-executor';
import { ScheduleResult } from '@/lib/ai/autonomous/scheduling-engine';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      scheduleResult,
      dryRun = false,
      notifyAffectedParties = true,
      validateBeforeApply = true,
      rollbackOnError = true,
    } = body;

    if (!scheduleResult) {
      return NextResponse.json(
        { error: 'scheduleResult is required' },
        { status: 400 }
      );
    }

    const executor = getScheduleExecutor();
    const userId = session.user?.id || 'system';

    const executionResult = await executor.applyScheduleChanges(
      scheduleResult as ScheduleResult,
      userId,
      {
        dryRun,
        notifyAffectedParties,
        validateBeforeApply,
        rollbackOnError,
      }
    );

    if (!executionResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Một số thay đổi không thể áp dụng',
        result: executionResult,
      });
    }

    return NextResponse.json({
      success: true,
      message: dryRun
        ? 'Kết quả mô phỏng (chưa áp dụng thực tế)'
        : 'Đã áp dụng lịch sản xuất thành công',
      result: executionResult,
      summary: {
        totalChanges: executionResult.totalChanges,
        successful: executionResult.successfulChanges,
        failed: executionResult.failedChanges,
        notifications: executionResult.notifications.length,
      },
    });
  } catch (error) {
    console.error('[Auto-Schedule Apply API] Error:', error);
    return NextResponse.json(
      {
        error: 'Không thể áp dụng lịch sản xuất',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const auditId = searchParams.get('auditId');

    if (!auditId) {
      return NextResponse.json(
        { error: 'auditId is required' },
        { status: 400 }
      );
    }

    const executor = getScheduleExecutor();
    const userId = session.user?.id || 'system';

    const revertResult = await executor.revertScheduleChange(auditId, userId);

    if (!revertResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Không thể hoàn tác thay đổi',
        result: revertResult,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Đã hoàn tác thay đổi lịch sản xuất',
      result: revertResult,
    });
  } catch (error) {
    console.error('[Auto-Schedule Apply API] Error:', error);
    return NextResponse.json(
      {
        error: 'Không thể hoàn tác thay đổi',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
