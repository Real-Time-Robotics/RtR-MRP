// =============================================================================
// AI QUALITY SUPPLIER ANALYSIS API ROUTE
// GET /api/ai/quality/suppliers/[supplierId] - Get supplier quality insights
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { getQualityDataExtractor } from '@/lib/ai/quality/quality-data-extractor';
import { getQualityMetricsCalculator } from '@/lib/ai/quality/quality-metrics-calculator';
import { getAIQualityAnalyzer } from '@/lib/ai/quality/ai-quality-analyzer';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
interface RouteParams {
  params: Promise<{ supplierId: string }>;
}

// =============================================================================
// GET - Supplier Quality Analysis
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
const { supplierId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const months = parseInt(searchParams.get('months') || '12');
    const includeAI = searchParams.get('includeAI') === 'true';

    const dataExtractor = getQualityDataExtractor();
    const metricsCalculator = getQualityMetricsCalculator();

    // Get supplier data
    const [supplierData, supplierScore] = await Promise.all([
      dataExtractor.extractSupplierQualityData(supplierId, months),
      metricsCalculator.calculateSupplierQualityScore(supplierId, months),
    ]);

    if (!supplierData) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: Record<string, any> = {
      success: true,
      data: {
        supplierId,
        supplierName: supplierData.supplierName,
        qualityScore: {
          overall: supplierScore.overallScore,
          grade: supplierScore.grade,
          trend: supplierScore.trend,
          components: supplierScore.components,
        },
        metrics: {
          totalLots: supplierData.totalLots,
          acceptedLots: supplierData.acceptedLots,
          rejectedLots: supplierData.rejectedLots,
          acceptanceRate: supplierData.acceptanceRate,
          totalNCRs: supplierData.totalNCRs,
          openNCRs: supplierData.openNCRs,
          avgDaysToResolve: supplierData.avgDaysToResolve,
          lastInspectionDate: supplierData.lastInspectionDate?.toISOString() || null,
        },
        defectCategories: supplierData.defectCategories,
        qualityTrend: supplierData.qualityTrend,
        recommendations: supplierScore.recommendations,
      },
      generatedAt: new Date().toISOString(),
    };

    // Add AI insights if requested
    if (includeAI) {
      try {
        const aiAnalyzer = getAIQualityAnalyzer();
        const insights = await aiAnalyzer.analyzeSupplierQuality(supplierId, months);
        response.data.aiInsights = {
          strengths: insights.strengthsAnalysis,
          weaknesses: insights.weaknessesAnalysis,
          improvementAreas: insights.improvementAreas,
          riskProfile: insights.riskProfile,
          comparativeAnalysis: insights.comparativeAnalysis,
          recommendation: insights.aiRecommendation,
        };
      } catch (aiError) {
        logger.warn('AI supplier insights failed', { context: 'GET /api/ai/quality/suppliers/[supplierId]', error: String(aiError) });
        response.data.aiInsights = null;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/quality/suppliers/[supplierId]' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch supplier quality analysis',
      },
      { status: 500 }
    );
  }
});
