// =============================================================================
// AI SUPPLIER RISK - SCORECARD API ROUTE
// GET /api/ai/supplier-risk/scorecard - Get supplier rankings
// POST /api/ai/supplier-risk/scorecard - Generate/compare scorecards
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  getSupplierPerformanceScorer,
  getAISupplierAnalyzer,
} from '@/lib/ai/supplier-risk';

// =============================================================================
// GET - Supplier Rankings and Benchmarks
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeBenchmarks = searchParams.get('includeBenchmarks') !== 'false';

    const performanceScorer = getSupplierPerformanceScorer();

    // Get supplier rankings
    const rankings = await performanceScorer.getSupplierRankings(category, limit);

    const response: any = {
      success: true,
      data: {
        rankings: rankings.map((r) => ({
          supplierId: r.supplierId,
          supplierName: r.supplierName,
          rank: r.rank,
          overallScore: r.overallScore,
          overallGrade: r.overallGrade,
          deliveryScore: r.deliveryScore,
          qualityScore: r.qualityScore,
          costScore: r.costScore,
          responsivenessScore: r.responsivenessScore,
          trend: r.trend,
        })),
        count: rankings.length,
        category: category || 'All',
      },
      generatedAt: new Date().toISOString(),
    };

    // Optional: Include category benchmarks
    if (includeBenchmarks) {
      const benchmarks = await performanceScorer.getCategoryBenchmarks();
      response.data.benchmarks = benchmarks.map((b) => ({
        category: b.category,
        avgOverallScore: b.avgOverallScore,
        avgDeliveryScore: b.avgDeliveryScore,
        avgQualityScore: b.avgQualityScore,
        avgCostScore: b.avgCostScore,
        avgResponsivenessScore: b.avgResponsivenessScore,
        supplierCount: b.supplierCount,
        topPerformer: b.topPerformer,
      }));
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/supplier-risk/scorecard' });
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
// POST - Generate Scorecard or Compare Suppliers
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, supplierId, supplierIds, months = 12 } = body;

    const performanceScorer = getSupplierPerformanceScorer();
    const aiAnalyzer = getAISupplierAnalyzer();

    switch (action) {
      case 'generate': {
        if (!supplierId) {
          return NextResponse.json(
            { success: false, error: 'supplierId is required' },
            { status: 400 }
          );
        }

        const scorecard = await performanceScorer.generateScorecard(supplierId, months);

        if (!scorecard) {
          return NextResponse.json(
            { success: false, error: 'Supplier not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            supplierId: scorecard.supplierId,
            supplierCode: scorecard.supplierCode,
            supplierName: scorecard.supplierName,
            country: scorecard.country,
            category: scorecard.category,
            periodMonths: scorecard.periodMonths,
            overallScore: scorecard.overallScore,
            overallGrade: scorecard.overallGrade,
            dimensions: scorecard.dimensions,
            trend: scorecard.trend,
            benchmarkComparison: scorecard.benchmarkComparison,
            strengths: scorecard.strengths,
            weaknesses: scorecard.weaknesses,
            recommendations: scorecard.recommendations,
          },
          generatedAt: new Date().toISOString(),
        });
      }

      case 'compare': {
        if (!supplierIds || !Array.isArray(supplierIds) || supplierIds.length < 2) {
          return NextResponse.json(
            { success: false, error: 'At least 2 supplierIds required for comparison' },
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

      case 'save': {
        if (!supplierId) {
          return NextResponse.json(
            { success: false, error: 'supplierId is required' },
            { status: 400 }
          );
        }

        const scorecard = await performanceScorer.generateScorecard(supplierId, months);

        if (!scorecard) {
          return NextResponse.json(
            { success: false, error: 'Supplier not found' },
            { status: 404 }
          );
        }

        await performanceScorer.saveScorecard(scorecard);

        return NextResponse.json({
          success: true,
          message: 'Scorecard saved successfully',
          data: {
            supplierId: scorecard.supplierId,
            overallScore: scorecard.overallScore,
            overallGrade: scorecard.overallGrade,
          },
          generatedAt: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: generate, compare, save' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/supplier-risk/scorecard' });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
