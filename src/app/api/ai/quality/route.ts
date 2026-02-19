// =============================================================================
// AI QUALITY API ROUTE
// GET /api/ai/quality - Get quality dashboard metrics
// POST /api/ai/quality - Run batch quality assessment
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { getQualityMetricsCalculator } from '@/lib/ai/quality/quality-metrics-calculator';
import { getQualityPredictionEngine } from '@/lib/ai/quality/quality-prediction-engine';
import { z } from 'zod';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// GET - Quality Dashboard Metrics
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
const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metricsCalculator = getQualityMetricsCalculator();

    // Get quality metrics summary
    const summary = await metricsCalculator.getQualityMetricsSummary(startDate, endDate);

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days,
        },
        metrics: {
          overallFPY: summary.overallFPY,
          overallPPM: summary.overallPPM,
          openNCRs: summary.openNCRs,
          openCAPAs: summary.openCAPAs,
          avgNCRResolutionDays: summary.avgNCRResolutionDays,
        },
        topDefectCategories: summary.topDefectCategories,
        qualityTrend: summary.qualityTrend,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/quality' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch quality metrics',
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// POST - Batch Quality Assessment
// =============================================================================

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
const bodySchema = z.object({
      partType: z.string().optional(),
      limit: z.number().optional(),
    });
    const rawBody = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const { partType, limit = 50 } = body;

    const predictionEngine = getQualityPredictionEngine();

    // Perform batch risk assessment
    const assessment = await predictionEngine.performBatchRiskAssessment(partType, limit);

    return NextResponse.json({
      success: true,
      data: {
        assessmentDate: assessment.assessmentDate.toISOString(),
        partsAssessed: assessment.partsAssessed,
        riskDistribution: assessment.riskDistribution,
        systemwideMetrics: assessment.systemwideMetrics,
        topRiskParts: assessment.topRiskParts.map((p) => ({
          partId: p.partId,
          partSku: p.partSku,
          partName: p.partName,
          riskScore: p.overallRiskScore,
          riskLevel: p.riskLevel,
          trendDirection: p.historicalPerformance.trendDirection,
        })),
        recommendations: assessment.recommendations,
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/quality' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform quality assessment',
      },
      { status: 500 }
    );
  }
});
