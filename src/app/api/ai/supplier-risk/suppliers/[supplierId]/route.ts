// =============================================================================
// AI SUPPLIER RISK - INDIVIDUAL SUPPLIER API ROUTE
// GET /api/ai/supplier-risk/suppliers/[supplierId] - Get supplier risk assessment
// POST /api/ai/supplier-risk/suppliers/[supplierId] - Generate AI insights
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import {
  getRiskCalculator,
  getSupplierPerformanceScorer,
  getSupplierDataExtractor,
  getEarlyWarningSystem,
  getAISupplierAnalyzer,
  getDependencyAnalyzer,
} from '@/lib/ai/supplier-risk';
import { z } from 'zod';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
interface RouteParams {
  params: Promise<{ supplierId: string }>;
}

// =============================================================================
// GET - Supplier Risk Assessment
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
    const includeScorecard = searchParams.get('includeScorecard') !== 'false';
    const includeData = searchParams.get('includeData') === 'true';
    const includeWarnings = searchParams.get('includeWarnings') !== 'false';

    const riskCalculator = getRiskCalculator();
    const performanceScorer = getSupplierPerformanceScorer();
    const dataExtractor = getSupplierDataExtractor();
    const warningSystem = getEarlyWarningSystem();
    const dependencyAnalyzer = getDependencyAnalyzer();

    // Get risk assessment
    const riskAssessment = await riskCalculator.calculateSupplierRisk(supplierId, months);

    if (!riskAssessment) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: Record<string, any> = {
      success: true,
      data: {
        supplierId: riskAssessment.supplierId,
        supplierCode: riskAssessment.supplierCode,
        supplierName: riskAssessment.supplierName,
        country: riskAssessment.country,
        category: riskAssessment.category,
        riskAssessment: {
          overallRiskScore: riskAssessment.overallRiskScore,
          riskLevel: riskAssessment.riskLevel,
          riskFactors: riskAssessment.riskFactors,
          trend: riskAssessment.trend,
          historicalRisk: riskAssessment.historicalRisk.slice(-6),
          mitigationStatus: riskAssessment.mitigationStatus,
          recommendations: riskAssessment.recommendations,
        },
      },
      generatedAt: new Date().toISOString(),
    };

    // Optional: Include scorecard
    if (includeScorecard) {
      const scorecard = await performanceScorer.generateScorecard(supplierId, months);
      if (scorecard) {
        response.data.scorecard = {
          overallScore: scorecard.overallScore,
          overallGrade: scorecard.overallGrade,
          dimensions: {
            delivery: {
              score: scorecard.dimensions.delivery.score,
              grade: scorecard.dimensions.delivery.grade,
              trend: scorecard.dimensions.delivery.trend,
              metrics: scorecard.dimensions.delivery.metrics.slice(0, 4),
            },
            quality: {
              score: scorecard.dimensions.quality.score,
              grade: scorecard.dimensions.quality.grade,
              trend: scorecard.dimensions.quality.trend,
              metrics: scorecard.dimensions.quality.metrics.slice(0, 4),
            },
            cost: {
              score: scorecard.dimensions.cost.score,
              grade: scorecard.dimensions.cost.grade,
              trend: scorecard.dimensions.cost.trend,
              metrics: scorecard.dimensions.cost.metrics.slice(0, 3),
            },
            responsiveness: {
              score: scorecard.dimensions.responsiveness.score,
              grade: scorecard.dimensions.responsiveness.grade,
              trend: scorecard.dimensions.responsiveness.trend,
              metrics: scorecard.dimensions.responsiveness.metrics.slice(0, 3),
            },
          },
          trend: scorecard.trend,
          benchmarkComparison: scorecard.benchmarkComparison,
          strengths: scorecard.strengths,
          weaknesses: scorecard.weaknesses,
        };
      }
    }

    // Optional: Include detailed data
    if (includeData) {
      const comprehensiveData = await dataExtractor.extractComprehensiveData(supplierId, months);
      if (comprehensiveData) {
        response.data.performanceData = {
          delivery: {
            onTimeRate: comprehensiveData.delivery.summary.onTimeRate,
            totalOrders: comprehensiveData.delivery.summary.totalOrders,
            lateOrders: comprehensiveData.delivery.summary.lateOrders,
            avgDaysLate: comprehensiveData.delivery.summary.avgDaysLate,
            perfectOrderRate: comprehensiveData.delivery.summary.perfectOrderRate,
            trend: comprehensiveData.delivery.trend.slice(-6),
          },
          quality: {
            acceptanceRate: comprehensiveData.quality.summary.acceptanceRate,
            ppm: comprehensiveData.quality.summary.ppm,
            totalNCRs: comprehensiveData.quality.summary.totalNCRs,
            openNCRs: comprehensiveData.quality.summary.openNCRs,
            avgDaysToResolve: comprehensiveData.quality.summary.avgDaysToResolveNCR,
            defectBreakdown: comprehensiveData.quality.defectBreakdown.slice(0, 5),
            trend: comprehensiveData.quality.qualityTrend.slice(-6),
          },
          pricing: {
            avgUnitPrice: comprehensiveData.pricing.summary.avgUnitPrice,
            priceChangePercent: comprehensiveData.pricing.summary.priceChangePercent,
            totalSpend: comprehensiveData.pricing.summary.totalSpend,
            priceHistory: comprehensiveData.pricing.priceHistory.slice(-6),
          },
          orders: {
            totalOrders: comprehensiveData.orders.summary.totalOrders,
            fulfillmentRate: comprehensiveData.orders.summary.fulfillmentRate,
            avgOrderFrequencyDays: comprehensiveData.orders.summary.avgOrderFrequencyDays,
            statusBreakdown: comprehensiveData.orders.summary.statusBreakdown,
          },
          leadTime: {
            quotedLeadTimeDays: comprehensiveData.leadTime.summary.quotedLeadTimeDays,
            avgActualLeadTime: comprehensiveData.leadTime.summary.avgActualLeadTime,
            leadTimeVariancePercent: comprehensiveData.leadTime.summary.leadTimeVariancePercent,
            reliabilityScore: comprehensiveData.leadTime.summary.reliabilityScore,
          },
          partsSupplied: comprehensiveData.partsSupplied.slice(0, 10),
          dataCompleteness: comprehensiveData.dataCompleteness,
        };
      }
    }

    // Optional: Include warnings
    if (includeWarnings) {
      const warningSignals = await warningSystem.getEarlyWarningSignals(supplierId);
      const dependencyInfo = await dependencyAnalyzer.getSupplierDependencyBreakdown(supplierId);

      response.data.warnings = {
        earlyWarningSignals: warningSignals.slice(0, 5),
        dependencyInfo: dependencyInfo
          ? {
              totalPartsSupplied: dependencyInfo.totalPartsSupplied,
              criticalPartsSupplied: dependencyInfo.criticalPartsSupplied,
              soleSourceParts: dependencyInfo.soleSourceParts,
              dependencyScore: dependencyInfo.dependencyScore,
              riskIfRemoved: dependencyInfo.riskIfRemoved,
            }
          : null,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/supplier-risk/suppliers/[supplierId]' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch supplier risk assessment',
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// POST - Generate AI Insights or Actions
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
const { supplierId } = await context.params;
    const bodySchema = z.object({
      action: z.enum(['ai_insight', 'mitigation_plan', 'report', 'save_assessment']),
      months: z.number().optional(),
      reportType: z.enum(['detailed', 'executive', 'quarterly']).optional(),
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
    const { action, months = 12, reportType = 'detailed' } = body;

    switch (action) {
      case 'ai_insight': {
        const aiAnalyzer = getAISupplierAnalyzer();
        const insight = await aiAnalyzer.generateSupplierInsight(supplierId, months);

        if (!insight) {
          return NextResponse.json(
            { success: false, error: 'Unable to generate insight' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            executiveSummary: insight.executiveSummary,
            performanceAnalysis: insight.performanceAnalysis,
            riskAssessment: insight.riskAssessment,
            strategicRecommendations: insight.strategicRecommendations,
            predictedPerformance: insight.predictedPerformance,
            developmentPlan: insight.developmentPlan,
            confidenceLevel: insight.confidenceLevel,
            dataQuality: insight.dataQuality,
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'mitigation_plan': {
        const aiAnalyzer = getAISupplierAnalyzer();
        const plan = await aiAnalyzer.getRiskMitigationPlan(supplierId);

        if (!plan) {
          return NextResponse.json(
            { success: false, error: 'Unable to generate mitigation plan' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: plan,
          generatedAt: new Date().toISOString(),
        });
      }

      case 'report': {
        const aiAnalyzer = getAISupplierAnalyzer();
        const report = await aiAnalyzer.generateNarrativeReport(supplierId, reportType);

        return NextResponse.json({
          success: true,
          data: {
            report,
            reportType,
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'save_assessment': {
        const riskCalculator = getRiskCalculator();
        const assessment = await riskCalculator.calculateSupplierRisk(supplierId, months);

        if (!assessment) {
          return NextResponse.json(
            { success: false, error: 'Supplier not found' },
            { status: 404 }
          );
        }

        await riskCalculator.saveRiskAssessment(assessment);

        return NextResponse.json({
          success: true,
          message: 'Risk assessment saved successfully',
          data: {
            supplierId: assessment.supplierId,
            riskScore: assessment.overallRiskScore,
            riskLevel: assessment.riskLevel,
          },
          generatedAt: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Use: ai_insight, mitigation_plan, report, save_assessment',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/supplier-risk/suppliers/[supplierId]' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process supplier risk action',
      },
      { status: 500 }
    );
  }
});
