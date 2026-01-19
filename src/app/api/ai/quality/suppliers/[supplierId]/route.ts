// =============================================================================
// AI QUALITY SUPPLIER ANALYSIS API ROUTE
// GET /api/ai/quality/suppliers/[supplierId] - Get supplier quality insights
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getQualityDataExtractor } from '@/lib/ai/quality/quality-data-extractor';
import { getQualityMetricsCalculator } from '@/lib/ai/quality/quality-metrics-calculator';
import { getAIQualityAnalyzer } from '@/lib/ai/quality/ai-quality-analyzer';

interface RouteParams {
  params: Promise<{ supplierId: string }>;
}

// =============================================================================
// GET - Supplier Quality Analysis
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { supplierId } = await params;
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

    const response: any = {
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
        console.warn('[Quality API] AI supplier insights failed:', aiError);
        response.data.aiInsights = null;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Quality API] Supplier Analysis Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
