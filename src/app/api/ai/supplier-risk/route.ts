// =============================================================================
// AI SUPPLIER RISK API ROUTE
// GET /api/ai/supplier-risk - Get supply chain risk dashboard
// POST /api/ai/supplier-risk - Run risk analysis
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import {
  getRiskCalculator,
  getEarlyWarningSystem,
  getDependencyAnalyzer,
  getSupplierPerformanceScorer,
} from '@/lib/ai/supplier-risk';
import { z } from 'zod';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// GET - Supply Chain Risk Dashboard
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
    const months = parseInt(searchParams.get('months') || '12');
    const includeAlerts = searchParams.get('includeAlerts') !== 'false';
    const includeDependencies = searchParams.get('includeDependencies') !== 'false';

    const riskCalculator = getRiskCalculator();
    const warningSystem = getEarlyWarningSystem();
    const dependencyAnalyzer = getDependencyAnalyzer();
    const performanceScorer = getSupplierPerformanceScorer();

    // Get supply chain risk profile
    const riskProfile = await riskCalculator.calculateSupplyChainRisk(months);

    // Get top suppliers
    const topSuppliers = await performanceScorer.getSupplierRankings(undefined, 10);

    // Optional: Get alerts
    let alertSummary = null;
    if (includeAlerts) {
      alertSummary = await warningSystem.getAlertSummary();
    }

    // Optional: Get dependency analysis
    let dependencyAnalysis = null;
    if (includeDependencies) {
      dependencyAnalysis = await dependencyAnalyzer.analyzeDependencies(months);
    }

    return NextResponse.json({
      success: true,
      data: {
        riskProfile: {
          overallRiskScore: riskProfile.overallRiskScore,
          overallRiskLevel: riskProfile.overallRiskLevel,
          riskBreakdown: riskProfile.riskBreakdown,
          metrics: riskProfile.metrics,
          riskTrend: riskProfile.riskTrend,
          criticalSuppliers: riskProfile.criticalSuppliers.slice(0, 5),
          topRisks: riskProfile.topRisks.slice(0, 5),
        },
        topSuppliers: topSuppliers.slice(0, 10).map((s) => ({
          supplierId: s.supplierId,
          supplierName: s.supplierName,
          overallScore: s.overallScore,
          overallGrade: s.overallGrade,
          rank: s.rank,
          trend: s.trend,
        })),
        alertSummary: alertSummary
          ? {
              totalActiveAlerts: alertSummary.totalActiveAlerts,
              alertsBySeverity: alertSummary.alertsBySeverity,
              criticalSuppliers: alertSummary.criticalSuppliers.slice(0, 5),
            }
          : null,
        dependencySummary: dependencyAnalysis
          ? {
              singleSourcePartCount: dependencyAnalysis.summary.singleSourcePartCount,
              singleSourcePercent: dependencyAnalysis.summary.singleSourcePercent,
              criticalPartsAtRisk: dependencyAnalysis.summary.criticalPartsAtRisk,
              overallDependencyScore: dependencyAnalysis.summary.overallDependencyScore,
              concentrationRiskLevel: dependencyAnalysis.concentrationRisk.riskLevel,
              geographicRiskLevel: dependencyAnalysis.geographicRisk.riskLevel,
            }
          : null,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/supplier-risk' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch supply chain risk data',
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// POST - Run Risk Analysis
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
      action: z.enum(['batch_assess', 'scenarios', 'supply_chain']),
      supplierIds: z.array(z.string()).optional(),
      months: z.number().optional(),
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
    const { action, supplierIds, months = 12 } = body;

    const riskCalculator = getRiskCalculator();

    switch (action) {
      case 'batch_assess': {
        if (!supplierIds || !Array.isArray(supplierIds)) {
          return NextResponse.json(
            { success: false, error: 'supplierIds array is required' },
            { status: 400 }
          );
        }

        const assessments = await riskCalculator.batchAssessRisk(supplierIds, months);

        return NextResponse.json({
          success: true,
          data: {
            assessments: assessments.map((a) => ({
              supplierId: a.supplierId,
              supplierName: a.supplierName,
              overallRiskScore: a.overallRiskScore,
              riskLevel: a.riskLevel,
              trend: a.trend.direction,
              topRiskFactors: [
                ...a.riskFactors.performance.factors,
                ...a.riskFactors.dependency.factors,
              ]
                .sort((x, y) => y.score - x.score)
                .slice(0, 3)
                .map((f) => f.name),
            })),
            count: assessments.length,
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'scenarios': {
        const scenarios = await riskCalculator.analyzeRiskScenarios();

        return NextResponse.json({
          success: true,
          data: {
            scenarios: scenarios.map((s) => ({
              name: s.name,
              description: s.description,
              probability: s.probability,
              impact: s.impact,
              affectedParts: s.affectedParts,
              estimatedRecoveryDays: s.estimatedRecoveryDays,
              financialImpact: s.financialImpact,
              mitigations: s.mitigations,
            })),
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'supply_chain': {
        const riskProfile = await riskCalculator.calculateSupplyChainRisk(months);

        return NextResponse.json({
          success: true,
          data: riskProfile,
          generatedAt: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: batch_assess, scenarios, supply_chain' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/supplier-risk' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run risk analysis',
      },
      { status: 500 }
    );
  }
});
