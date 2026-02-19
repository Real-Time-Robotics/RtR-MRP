// =============================================================================
// AI QUALITY NCR ANALYSIS API ROUTE
// GET /api/ai/quality/ncr/[ncrId] - Get AI root cause analysis for NCR
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { getAIQualityAnalyzer } from '@/lib/ai/quality/ai-quality-analyzer';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
interface RouteParams {
  params: Promise<{ ncrId: string }>;
}

// =============================================================================
// GET - NCR Root Cause Analysis
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
const { ncrId } = await context.params;

    const aiAnalyzer = getAIQualityAnalyzer();
    const analysis = await aiAnalyzer.analyzeRootCause(ncrId);

    return NextResponse.json({
      success: true,
      data: {
        ncrId: analysis.ncrId,
        ncrNumber: analysis.ncrNumber,
        defectDescription: analysis.defectDescription,
        analysis: {
          primaryCauses: analysis.analysis.primaryCauses,
          contributingFactors: analysis.analysis.contributingFactors,
          evidenceBasis: analysis.analysis.evidenceBasis,
          confidenceLevel: analysis.analysis.confidenceLevel,
        },
        recommendations: analysis.recommendations,
        similarIncidents: analysis.similarIncidents.map((i) => ({
          ncrNumber: i.ncrNumber,
          date: i.date.toISOString(),
          similarity: i.similarity,
          resolution: i.resolution,
        })),
        preventionStrategies: analysis.preventionStrategies,
        aiInsights: analysis.aiInsights,
        generatedAt: analysis.generatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/quality/ncr/[ncrId]' });

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'NCR not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze NCR',
      },
      { status: 500 }
    );
  }
});
