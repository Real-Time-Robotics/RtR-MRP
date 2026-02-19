// =============================================================================
// AI SUPPLIER RISK - AI ANALYSIS API ROUTE
// POST /api/ai/supplier-risk/analyze - AI-powered analysis and insights
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { getAISupplierAnalyzer } from '@/lib/ai/supplier-risk';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

const supplierRiskBodySchema = z.object({
  action: z.enum(['supply_chain', 'supplier_insight', 'compare', 'mitigation', 'report']),
  supplierId: z.string().optional(),
  supplierIds: z.array(z.string()).optional(),
  months: z.number().optional(),
  reportType: z.enum(['executive', 'detailed', 'quarterly']).optional(),
});
// =============================================================================
// POST - AI Analysis
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
const rawBody = await request.json();
    const parseResult = supplierRiskBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { action, supplierId, supplierIds, months = 12, reportType = 'detailed' } = parseResult.data;

    const aiAnalyzer = getAISupplierAnalyzer();

    switch (action) {
      case 'supply_chain': {
        const analysis = await aiAnalyzer.analyzeSupplyChain(months);

        return NextResponse.json({
          success: true,
          data: {
            overallAssessment: analysis.overallAssessment,
            riskSummary: analysis.riskSummary,
            topConcerns: analysis.topConcerns.map((c) => ({
              severity: c.severity,
              title: c.title,
              description: c.description,
              affectedSuppliers: c.affectedSuppliers,
              potentialImpact: c.potentialImpact,
              recommendedAction: c.recommendedAction,
            })),
            strategicInitiatives: analysis.strategicInitiatives.map((s) => ({
              priority: s.priority,
              title: s.title,
              description: s.description,
              objective: s.objective,
              timeline: s.timeline,
              expectedBenefit: s.expectedBenefit,
            })),
            optimizationOpportunities: analysis.optimizationOpportunities.map((o) => ({
              type: o.type,
              title: o.title,
              description: o.description,
              potentialSavings: o.potentialSavings,
              implementationComplexity: o.implementationComplexity,
              timeToValue: o.timeToValue,
            })),
            confidenceLevel: analysis.confidenceLevel,
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'supplier_insight': {
        if (!supplierId) {
          return NextResponse.json(
            { success: false, error: 'supplierId is required' },
            { status: 400 }
          );
        }

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
            supplierId: insight.supplierId,
            supplierName: insight.supplierName,
            executiveSummary: insight.executiveSummary,
            performanceAnalysis: insight.performanceAnalysis,
            riskAssessment: insight.riskAssessment,
            strategicRecommendations: insight.strategicRecommendations.map((r) => ({
              priority: r.priority,
              category: r.category,
              title: r.title,
              description: r.description,
              expectedOutcome: r.expectedOutcome,
              timeframe: r.timeframe,
              effortLevel: r.effortLevel,
              roiPotential: r.roiPotential,
            })),
            predictedPerformance: insight.predictedPerformance,
            developmentPlan: insight.developmentPlan,
            confidenceLevel: insight.confidenceLevel,
            dataQuality: insight.dataQuality,
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'compare': {
        if (!supplierIds || !Array.isArray(supplierIds) || supplierIds.length < 2) {
          return NextResponse.json(
            { success: false, error: 'At least 2 supplierIds required' },
            { status: 400 }
          );
        }

        const comparison = await aiAnalyzer.compareSuppliers(supplierIds, months);

        return NextResponse.json({
          success: true,
          data: {
            suppliers: comparison.suppliers,
            comparisonSummary: comparison.comparisonSummary,
            dimensionComparison: comparison.dimensionComparison,
            strengthsWeaknesses: comparison.strengthsWeaknesses,
            recommendation: comparison.recommendation,
            bestFor: comparison.bestFor,
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'mitigation': {
        if (!supplierId) {
          return NextResponse.json(
            { success: false, error: 'supplierId is required' },
            { status: 400 }
          );
        }

        const plan = await aiAnalyzer.getRiskMitigationPlan(supplierId);

        if (!plan) {
          return NextResponse.json(
            { success: false, error: 'Unable to generate mitigation plan' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            supplier: plan.supplier,
            currentRiskLevel: plan.currentRiskLevel,
            mitigationStrategies: plan.mitigationStrategies,
            contingencyPlan: plan.contingencyPlan,
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'report': {
        if (!supplierId) {
          return NextResponse.json(
            { success: false, error: 'supplierId is required' },
            { status: 400 }
          );
        }

        const validTypes = ['executive', 'detailed', 'quarterly'];
        if (!validTypes.includes(reportType)) {
          return NextResponse.json(
            { success: false, error: 'Invalid reportType. Use: executive, detailed, quarterly' },
            { status: 400 }
          );
        }

        const report = await aiAnalyzer.generateNarrativeReport(
          supplierId,
          reportType as 'executive' | 'detailed' | 'quarterly'
        );

        return NextResponse.json({
          success: true,
          data: {
            report,
            reportType,
            format: 'markdown',
          },
          generatedAt: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Use: supply_chain, supplier_insight, compare, mitigation, report',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/supplier-risk/analyze' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform AI analysis',
      },
      { status: 500 }
    );
  }
});
