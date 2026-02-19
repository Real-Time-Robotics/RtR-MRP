// =============================================================================
// AI QUALITY SPC ANALYSIS API ROUTE
// POST /api/ai/quality/spc - Perform SPC analysis
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { getQualityAnomalyDetector } from '@/lib/ai/quality/anomaly-detector';
import { getQualityMetricsCalculator } from '@/lib/ai/quality/quality-metrics-calculator';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

const spcBodySchema = z.object({
  partId: z.string(),
  characteristicId: z.string(),
  months: z.number().optional(),
});
// =============================================================================
// POST - SPC Analysis
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
    const parseResult = spcBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { partId, characteristicId, months = 6 } = parseResult.data;

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
        error: 'Failed to perform SPC analysis',
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// GET - Calculate Cpk for provided measurements
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
        error: 'Failed to calculate quality metrics',
      },
      { status: 500 }
    );
  }
});
