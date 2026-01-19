// =============================================================================
// AI QUALITY NCR ANALYSIS API ROUTE
// GET /api/ai/quality/ncr/[ncrId] - Get AI root cause analysis for NCR
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAIQualityAnalyzer } from '@/lib/ai/quality/ai-quality-analyzer';

interface RouteParams {
  params: Promise<{ ncrId: string }>;
}

// =============================================================================
// GET - NCR Root Cause Analysis
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { ncrId } = await params;

    const aiAnalyzer = getAIQualityAnalyzer();
    const analysis = await aiAnalyzer.analyzeRootCause(ncrId);

    return NextResponse.json({
      success: true,
      data: {
        ncrId: analysis.ncrId,
        ncrNumber: analysis.ncrNumber,
        defectDescription: analysis.defectDescription,
        analysis: {
          primaryCauses: analysis.analysis.primaryCauses,
          contributingFactors: analysis.analysis.contributingFactors,
          evidenceBasis: analysis.analysis.evidenceBasis,
          confidenceLevel: analysis.analysis.confidenceLevel,
        },
        recommendations: analysis.recommendations,
        similarIncidents: analysis.similarIncidents.map((i) => ({
          ncrNumber: i.ncrNumber,
          date: i.date.toISOString(),
          similarity: i.similarity,
          resolution: i.resolution,
        })),
        preventionStrategies: analysis.preventionStrategies,
        aiInsights: analysis.aiInsights,
        generatedAt: analysis.generatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Quality API] NCR Analysis Error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'NCR not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
