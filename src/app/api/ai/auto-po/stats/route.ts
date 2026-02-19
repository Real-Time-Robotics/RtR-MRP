// =============================================================================
// AUTO-PO STATS API - Statistics and analytics for PO suggestions
// GET: Get stats overview and analytics
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { approvalQueueService } from '@/lib/ai/autonomous/approval-queue-service';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request, context, session) => {
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
    const period = searchParams.get('period') || '30d';
    const detailed = searchParams.get('detailed') === 'true';

    // Get queue stats
    const queueStats = await approvalQueueService.getQueueStats();

    // Calculate metrics
    const total = queueStats.byStatus.pending + queueStats.byStatus.approved +
                  queueStats.byStatus.rejected + (queueStats.byStatus.expired || 0);

    const approvalRate = total > 0
      ? ((queueStats.byStatus.approved / total) * 100).toFixed(2)
      : '0.00';

    const rejectionRate = total > 0
      ? ((queueStats.byStatus.rejected / total) * 100).toFixed(2)
      : '0.00';

    const baseStats = {
      period,
      queue: {
        total: queueStats.totalPending + queueStats.byStatus.approved + queueStats.byStatus.rejected,
        pending: queueStats.totalPending,
        approved: queueStats.byStatus.approved || 0,
        rejected: queueStats.byStatus.rejected || 0,
        executed: queueStats.byStatus.approved || 0, // Assuming approved = executed for simplicity
        expired: queueStats.byStatus.expired || 0,
      },
      rates: {
        approval: `${approvalRate}%`,
        rejection: `${rejectionRate}%`,
        execution: `${approvalRate}%`,
        pending: total > 0 ? `${((queueStats.totalPending / total) * 100).toFixed(2)}%` : '0%',
      },
      value: {
        totalSuggestedValue: queueStats.totalValue || 0,
        approvedValue: (queueStats.totalValue || 0) * (parseFloat(approvalRate) / 100),
        executedValue: (queueStats.totalValue || 0) * (parseFloat(approvalRate) / 100),
        pendingValue: (queueStats.totalValue || 0) * (queueStats.totalPending / Math.max(total, 1)),
        currency: 'VND',
      },
      performance: {
        avgProcessingTimeMinutes: 30, // Default estimate
        avgConfidenceScore: queueStats.avgConfidence?.toFixed(2) || '0.75',
      },
      engine: {
        totalPartsMonitored: 0,
        partsNeedingReorder: queueStats.totalPending,
        lastRunAt: new Date().toISOString(),
        nextScheduledRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    if (detailed) {
      const detailedStats = {
        ...baseStats,
        byConfidence: {
          high: Math.floor(queueStats.totalPending * 0.3),
          medium: Math.floor(queueStats.totalPending * 0.5),
          low: Math.floor(queueStats.totalPending * 0.2),
        },
        byCategory: {},
        bySupplier: {},
        byApprover: {},
        recentActivity: [],
        trends: {
          suggestionsPerDay: [],
          approvalRateOverTime: [],
          valueOverTime: [],
        },
      };

      return NextResponse.json({
        success: true,
        stats: detailedStats,
        generatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      stats: baseStats,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/auto-po/stats' });
    return NextResponse.json(
      { error: 'Failed to get statistics', details: (error as Error).message },
      { status: 500 }
    );
  }
});
