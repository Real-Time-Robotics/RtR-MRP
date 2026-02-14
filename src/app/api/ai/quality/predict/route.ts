// =============================================================================
// AI QUALITY PREDICTION API ROUTE
// POST /api/ai/quality/predict - Predict quality issues for parts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getQualityPredictionEngine } from '@/lib/ai/quality/quality-prediction-engine';
import { getAIQualityAnalyzer } from '@/lib/ai/quality/ai-quality-analyzer';

// =============================================================================
// POST - Quality Prediction
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { partId, monthsAhead = 1, includeAI = false } = body;

    if (!partId) {
      return NextResponse.json(
        { success: false, error: 'partId is required' },
        { status: 400 }
      );
    }

    const predictionEngine = getQualityPredictionEngine();

    // Get NCR prediction and forecast
    const [ncrPrediction, forecast] = await Promise.all([
      predictionEngine.predictNCR(partId, monthsAhead),
      predictionEngine.generateForecast(partId, monthsAhead + 2),
    ]);

    const response: any = {
      success: true,
      data: {
        partId,
        partSku: ncrPrediction.partSku,
        predictionPeriod: {
          start: ncrPrediction.predictionPeriod.start.toISOString(),
          end: ncrPrediction.predictionPeriod.end.toISOString(),
          monthsAhead,
        },
        ncrPrediction: {
          probability: ncrPrediction.probability,
          expectedCount: ncrPrediction.expectedNCRCount,
          confidenceLevel: ncrPrediction.confidenceLevel,
          riskFactors: ncrPrediction.riskFactors,
          mitigatingFactors: ncrPrediction.mitigatingFactors,
          recommendations: ncrPrediction.recommendations,
        },
        historicalBasis: {
          periodsAnalyzed: ncrPrediction.historicalBasis.periodsAnalyzed,
          historicalRate: ncrPrediction.historicalBasis.historicalRate,
          recentTrend: ncrPrediction.historicalBasis.recentTrend,
        },
        forecast: {
          overallTrend: forecast.overallTrend,
          confidenceLevel: forecast.confidenceLevel,
          periods: forecast.forecastPeriods.map((p) => ({
            period: p.period,
            predictedFPY: p.predictedFPY,
            predictedNCRCount: p.predictedNCRCount,
            predictedPPM: p.predictedPPM,
            confidenceLevel: p.confidenceLevel,
            riskEvents: p.riskEvents,
          })),
          keyAssumptions: forecast.keyAssumptions,
          risks: forecast.risks,
          opportunities: forecast.opportunities,
        },
      },
      generatedAt: new Date().toISOString(),
    };

    // Add AI insights if requested
    if (includeAI) {
      try {
        const aiAnalyzer = getAIQualityAnalyzer();
        const defectInsight = await aiAnalyzer.predictDefects(partId, monthsAhead);
        response.data.aiPrediction = {
          predictedDefects: defectInsight.predictedDefects,
          earlyWarningSignals: defectInsight.earlyWarningSignals,
          analysis: defectInsight.aiAnalysis,
          confidenceLevel: defectInsight.confidenceLevel,
        };
      } catch (aiError) {
        logger.warn('AI prediction failed', { context: 'POST /api/ai/quality/predict', error: String(aiError) });
        response.data.aiPrediction = null;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/quality/predict' });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
