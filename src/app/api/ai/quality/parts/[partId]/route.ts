// =============================================================================
// AI QUALITY PART ANALYSIS API ROUTE
// GET /api/ai/quality/parts/[partId] - Get quality analysis for a part
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { getQualityDataExtractor } from '@/lib/ai/quality/quality-data-extractor';
import { getQualityMetricsCalculator } from '@/lib/ai/quality/quality-metrics-calculator';
import { getQualityPatternRecognition } from '@/lib/ai/quality/pattern-recognition';
import { getQualityAnomalyDetector } from '@/lib/ai/quality/anomaly-detector';
import { getQualityPredictionEngine } from '@/lib/ai/quality/quality-prediction-engine';
import { getAIQualityAnalyzer } from '@/lib/ai/quality/ai-quality-analyzer';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
interface RouteParams {
  params: Promise<{ partId: string }>;
}

// =============================================================================
// GET - Comprehensive Part Quality Analysis
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
const { partId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const months = parseInt(searchParams.get('months') || '6');
    const includeAI = searchParams.get('includeAI') === 'true';

    const dataExtractor = getQualityDataExtractor();
    const metricsCalculator = getQualityMetricsCalculator();
    const patternRecognition = getQualityPatternRecognition();
    const anomalyDetector = getQualityAnomalyDetector();
    const predictionEngine = getQualityPredictionEngine();

    // Get quality data in parallel
    const [
      qualitySummary,
      riskScore,
      drift,
      recurringIssues,
      anomalies,
      ncrPrediction,
      forecast,
    ] = await Promise.all([
      dataExtractor.extractPartQualitySummary(partId, months),
      predictionEngine.calculateRiskScore(partId, months),
      patternRecognition.detectQualityDrift(partId, months),
      patternRecognition.detectRecurringIssues(partId, months),
      anomalyDetector.detectAnomalies(partId, months),
      predictionEngine.predictNCR(partId, 1),
      predictionEngine.generateForecast(partId, 3),
    ]);

    if (!qualitySummary) {
      return NextResponse.json(
        { success: false, error: 'Part not found' },
        { status: 404 }
      );
    }

    // Build response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: Record<string, any> = {
      success: true,
      data: {
        partId,
        partSku: qualitySummary.partSku,
        partName: qualitySummary.partName,
        summary: {
          totalInspections: qualitySummary.totalInspections,
          firstPassYield: qualitySummary.firstPassYield,
          totalNCRs: qualitySummary.totalNCRs,
          openNCRs: qualitySummary.openNCRs,
          topDefects: qualitySummary.topDefects,
        },
        riskAssessment: {
          overallScore: riskScore.overallRiskScore,
          riskLevel: riskScore.riskLevel,
          factors: riskScore.riskFactors.map((f) => ({
            name: f.name,
            category: f.category,
            score: f.score,
            impact: f.impact,
            trend: f.trend,
          })),
          recommendations: riskScore.recommendations,
        },
        drift: {
          hasDrift: drift.hasDrift,
          direction: drift.driftDirection,
          magnitude: drift.driftMagnitude,
          confidence: drift.confidence,
          alerts: drift.alerts,
        },
        patterns: {
          hasRecurringIssues: recurringIssues.hasRecurringIssues,
          issueCount: recurringIssues.issues.length,
          issues: recurringIssues.issues.slice(0, 5).map((i) => ({
            defectCategory: i.defectCategory,
            occurrences: i.occurrences,
            frequency: i.frequency,
            isResolved: i.isResolved,
            pattern: i.pattern,
          })),
          impactScore: recurringIssues.impactScore,
        },
        anomalies: {
          count: anomalies.anomalyCount,
          riskLevel: anomalies.riskLevel,
          severityDistribution: anomalies.severityDistribution,
          recentAnomalies: anomalies.anomalies.slice(0, 5).map((a) => ({
            type: a.type,
            severity: a.severity,
            description: a.description,
            detectedAt: a.detectedAt.toISOString(),
          })),
        },
        prediction: {
          ncrProbability: ncrPrediction.probability,
          expectedNCRCount: ncrPrediction.expectedNCRCount,
          confidenceLevel: ncrPrediction.confidenceLevel,
          riskFactors: ncrPrediction.riskFactors,
          mitigatingFactors: ncrPrediction.mitigatingFactors,
        },
        forecast: {
          overallTrend: forecast.overallTrend,
          confidenceLevel: forecast.confidenceLevel,
          periods: forecast.forecastPeriods.map((p) => ({
            period: p.period,
            predictedFPY: p.predictedFPY.expected,
            predictedNCRCount: p.predictedNCRCount.expected,
            riskEvents: p.riskEvents,
          })),
        },
        qualityTrend: qualitySummary.qualityTrend,
      },
      generatedAt: new Date().toISOString(),
    };

    // Add AI insights if requested
    if (includeAI) {
      try {
        const aiAnalyzer = getAIQualityAnalyzer();
        const insightReport = await aiAnalyzer.generateInsightReport(partId, months);
        response.data.aiInsights = {
          executiveSummary: insightReport.executiveSummary,
          keyFindings: insightReport.keyFindings,
          recommendations: insightReport.aiRecommendations,
        };
      } catch (aiError) {
        logger.warn('AI insights generation failed', { context: 'GET /api/ai/quality/parts/[partId]', error: String(aiError) });
        response.data.aiInsights = null;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/quality/parts/[partId]' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch part quality analysis',
      },
      { status: 500 }
    );
  }
});
