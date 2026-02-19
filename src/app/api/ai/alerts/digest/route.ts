// =============================================================================
// API: /api/ai/alerts/digest
// Alert digest (daily/weekly)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { unifiedAlertService } from '@/lib/ai/alerts';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// GET: Get digest
// =============================================================================

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
    const period = searchParams.get('period') || 'daily';

    let digest;
    if (period === 'weekly') {
      digest = await unifiedAlertService.getWeeklyReport();
    } else {
      digest = await unifiedAlertService.getDailyDigest();
    }

    return NextResponse.json({
      success: true,
      data: digest,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/alerts/digest' });
    return NextResponse.json(
      { error: 'Failed to generate digest' },
      { status: 500 }
    );
  }
});
