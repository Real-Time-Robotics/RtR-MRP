// =============================================================================
// AI QUALITY API ROUTE
// GET /api/ai/quality - Get quality dashboard metrics
// POST /api/ai/quality - Run batch quality assessment
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getQualityMetricsCalculator } from '@/lib/ai/quality/quality-metrics-calculator';
import { getQualityPredictionEngine } from '@/lib/ai/quality/quality-prediction-engine';

// =============================================================================
// GET - Quality Dashboard Metrics
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
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
    console.error('[Quality API] GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Batch Quality Assessment
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
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
    console.error('[Quality API] POST Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
