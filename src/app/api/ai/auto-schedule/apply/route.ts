// =============================================================================
// AUTO-SCHEDULE APPLY API - Apply schedule changes
// POST: Apply schedule to work orders
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { getScheduleExecutor } from '@/lib/ai/autonomous/schedule-executor';
import { ScheduleResult } from '@/lib/ai/autonomous/scheduling-engine';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

const applyBodySchema = z.object({
  scheduleResult: z.any(),
  dryRun: z.boolean().optional(),
  notifyAffectedParties: z.boolean().optional(),
  validateBeforeApply: z.boolean().optional(),
  rollbackOnError: z.boolean().optional(),
});
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const rawBody = await request.json();
    const parseResult = applyBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const {
      scheduleResult,
      dryRun = false,
      notifyAffectedParties = true,
      validateBeforeApply = true,
      rollbackOnError = true,
    } = parseResult.data;

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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/auto-schedule/apply' });
    return NextResponse.json(
      {
        error: 'Không thể áp dụng lịch sản xuất',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/ai/auto-schedule/apply' });
    return NextResponse.json(
      {
        error: 'Không thể hoàn tác thay đổi',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
});
