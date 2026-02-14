// =============================================================================
// AI QUALITY SPC ANALYSIS API ROUTE
// POST /api/ai/quality/spc - Perform SPC analysis
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getQualityAnomalyDetector } from '@/lib/ai/quality/anomaly-detector';
import { getQualityMetricsCalculator } from '@/lib/ai/quality/quality-metrics-calculator';

// =============================================================================
// POST - SPC Analysis
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { partId, characteristicId, months = 6 } = body;

    if (!partId || !characteristicId) {
      return NextResponse.json(
        { success: false, error: 'partId and characteristicId are required' },
        { status: 400 }
      );
    }

    const anomalyDetector = getQualityAnomalyDetector();
    const spcResult = await anomalyDetector.performSPCAnalysis(partId, characteristicId, months);

    return NextResponse.json({
      success: true,
      data: {
        partId: spcResult.partId,
        partSku: spcResult.partSku,
        characteristicName: spcResult.characteristicName,
        controlLimits: spcResult.controlLimits,
        processCapability: spcResult.processCapability,
        isInControl: spcResult.isInControl,
        measurements: spcResult.measurements.map((m) => ({
          date: m.date.toISOString(),
          value: m.value,
          isOutOfControl: m.isOutOfControl,
          isOutOfSpec: m.isOutOfSpec,
          violationRules: m.violationRules,
        })),
        violations: spcResult.violations.map((v) => ({
          rule: v.rule,
          ruleNumber: v.ruleNumber,
          description: v.description,
          severity: v.severity,
          pointCount: v.points.length,
          startDate: v.startDate.toISOString(),
          endDate: v.endDate.toISOString(),
          recommendation: v.recommendation,
        })),
        recommendations: spcResult.recommendations,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/quality/spc' });
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
// GET - Calculate Cpk for provided measurements
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const measurementsParam = searchParams.get('measurements');
    const usl = parseFloat(searchParams.get('usl') || '0');
    const lsl = parseFloat(searchParams.get('lsl') || '0');
    const name = searchParams.get('name') || 'Characteristic';

    if (!measurementsParam) {
      return NextResponse.json(
        { success: false, error: 'measurements parameter is required (comma-separated values)' },
        { status: 400 }
      );
    }

    const measurements = measurementsParam.split(',').map((v) => parseFloat(v.trim()));
    if (measurements.some(isNaN)) {
      return NextResponse.json(
        { success: false, error: 'Invalid measurement values' },
        { status: 400 }
      );
    }

    const metricsCalculator = getQualityMetricsCalculator();
    const cpkResult = metricsCalculator.calculateCpk(measurements, usl, lsl, name);

    return NextResponse.json({
      success: true,
      data: {
        characteristicName: cpkResult.characteristicName,
        sampleSize: cpkResult.measurements.length,
        statistics: {
          mean: cpkResult.mean,
          stdDev: cpkResult.stdDev,
        },
        specLimits: {
          usl: cpkResult.usl,
          lsl: cpkResult.lsl,
        },
        capability: {
          cp: cpkResult.cp,
          cpk: cpkResult.cpk,
          cpu: cpkResult.cpu,
          cpl: cpkResult.cpl,
        },
        status: cpkResult.status,
        interpretation: cpkResult.interpretation,
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/quality/spc' });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
