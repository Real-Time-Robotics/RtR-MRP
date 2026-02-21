// =============================================================================
// QUALITY MANAGEMENT API
// Phase 11: Quality Management - SPC
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

import {
  SPCEngine,
  ProcessCharacteristic,
  Measurement,
  ControlChart,
  ControlChartDataPoint,
  ProcessCapability,
  QualityAlert,
  SPCDashboard,
  ChartType,
  Violation
} from '@/lib/spc';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

// =============================================================================
// DATA ACCESS HELPERS
// =============================================================================

/**
 * Fetch inspection characteristics from DB and map to SPC ProcessCharacteristic.
 * Only returns characteristics that have SPC fields populated (subgroupSize, chartType).
 */
async function fetchCharacteristics(characteristicId?: string): Promise<ProcessCharacteristic[]> {
  const where: Record<string, unknown> = {
    subgroupSize: { not: null },
    chartType: { not: null },
  };
  if (characteristicId) {
    where.id = characteristicId;
  }

  const rows = await prisma.inspectionCharacteristic.findMany({
    where,
    include: {
      plan: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((row) => ({
    id: row.id,
    processId: row.planId,
    name: row.name,
    code: row.code ?? row.id,
    description: row.description ?? undefined,
    unit: row.unitOfMeasure ?? '',
    nominalValue: row.nominalValue ?? 0,
    lsl: row.lowerLimit ?? 0,
    usl: row.upperLimit ?? 0,
    targetValue: row.nominalValue ?? 0,
    subgroupSize: row.subgroupSize ?? 5,
    samplingFrequency: row.samplingFrequency ?? 'batch',
    chartType: (row.chartType ?? 'XBAR_R') as ChartType,
    isActive: true,
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * Fetch inspection results for a characteristic and map to SPC Measurement.
 */
async function fetchMeasurements(
  characteristicId: string,
  limit: number = 50
): Promise<Measurement[]> {
  const rows = await prisma.inspectionResult.findMany({
    where: { characteristicId },
    orderBy: { inspectedAt: 'asc' },
    take: limit,
    include: {
      inspection: { select: { id: true } },
    },
  });

  return rows.map((row, idx) => {
    // measuredValues is a Json field that should contain a number[]
    const values: number[] = Array.isArray(row.measuredValues)
      ? (row.measuredValues as number[])
      : row.measuredValue != null
        ? [row.measuredValue]
        : [];

    const mean = row.mean ?? (values.length > 0 ? SPCEngine.mean(values) : 0);
    const range = row.range ?? (values.length > 0 ? SPCEngine.range(values) : 0);
    const stdDev = row.stdDev ?? (values.length > 0 ? SPCEngine.stdDev(values) : 0);

    return {
      id: row.id,
      processId: row.inspectionId,
      characteristicId: row.characteristicId,
      sampleNumber: row.sampleNumber ?? idx + 1,
      subgroupId: row.subgroupId ?? `sg-${idx + 1}`,
      values,
      mean: Math.round(mean * 1000) / 1000,
      range: Math.round(range * 1000) / 1000,
      stdDev: Math.round(stdDev * 1000) / 1000,
      timestamp: row.inspectedAt.toISOString(),
      operatorId: row.inspectedBy,
      machineId: row.machineId ?? undefined,
      notes: row.findings ?? undefined,
    };
  });
}

/**
 * Fetch quality alerts from DB and map to SPC QualityAlert type.
 */
async function fetchAlerts(filters?: {
  status?: string;
  severity?: string;
  characteristicId?: string;
}): Promise<QualityAlert[]> {
  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.severity) where.severity = filters.severity;
  if (filters?.characteristicId) where.characteristicId = filters.characteristicId;

  const rows = await prisma.qualityAlert.findMany({
    where,
    include: {
      characteristic: {
        select: {
          id: true,
          name: true,
          planId: true,
          plan: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((row) => ({
    id: row.id,
    characteristicId: row.characteristicId,
    characteristicName: row.characteristic.name,
    processId: row.characteristic.planId,
    processName: row.characteristic.plan?.name ?? `Process ${row.characteristic.planId}`,
    type: row.type as QualityAlert['type'],
    severity: row.severity as QualityAlert['severity'],
    status: row.status as QualityAlert['status'],
    title: row.title,
    description: row.description ?? '',
    violation: row.violation as unknown as Violation | undefined,
    acknowledgedBy: row.acknowledgedBy ?? undefined,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? undefined,
    resolvedBy: row.resolvedBy ?? undefined,
    resolvedAt: row.resolvedAt?.toISOString() ?? undefined,
    resolution: row.resolution ?? undefined,
    createdAt: row.createdAt.toISOString(),
  }));
}

// =============================================================================
// SPC CALCULATION HELPERS (unchanged logic, real data input)
// =============================================================================

function generateControlChart(
  characteristic: ProcessCharacteristic,
  measurements: Measurement[]
): ControlChart {
  if (measurements.length === 0) {
    return createEmptyControlChart(characteristic);
  }

  const subgroups = measurements.map(m => m.values);
  const primaryValues = measurements.map(m => m.mean);
  const secondaryValues = characteristic.chartType === 'XBAR_S'
    ? measurements.map(m => m.stdDev)
    : measurements.map(m => m.range);

  let limits;
  if (characteristic.chartType === 'XBAR_R') {
    limits = SPCEngine.calculateXbarRLimits(subgroups, characteristic.subgroupSize);
  } else if (characteristic.chartType === 'XBAR_S') {
    const xbarSLimits = SPCEngine.calculateXbarSLimits(subgroups, characteristic.subgroupSize);
    limits = {
      xbarUCL: xbarSLimits.xbarUCL,
      xbarCL: xbarSLimits.xbarCL,
      xbarLCL: xbarSLimits.xbarLCL,
      rUCL: xbarSLimits.sUCL,
      rCL: xbarSLimits.sCL,
      rLCL: xbarSLimits.sLCL,
      sigma: xbarSLimits.sigma
    };
  } else if (characteristic.chartType === 'I_MR') {
    const allValues = measurements.flatMap(m => m.values);
    const imrLimits = SPCEngine.calculateIMRLimits(allValues);
    limits = {
      xbarUCL: imrLimits.iUCL,
      xbarCL: imrLimits.iCL,
      xbarLCL: imrLimits.iLCL,
      rUCL: imrLimits.mrUCL,
      rCL: imrLimits.mrCL,
      rLCL: imrLimits.mrLCL,
      sigma: imrLimits.sigma
    };
  } else {
    limits = SPCEngine.calculateXbarRLimits(subgroups, characteristic.subgroupSize);
  }

  const violations = SPCEngine.checkWesternElectricRules(
    primaryValues,
    limits.xbarUCL,
    limits.xbarCL,
    limits.xbarLCL
  );

  const dataPoints: ControlChartDataPoint[] = measurements.map((m, i) => {
    const pointViolations = violations.filter(v => v.pointIndex === i);
    return {
      id: m.id,
      subgroupId: m.subgroupId,
      sampleNumber: m.sampleNumber,
      primaryValue: m.mean,
      secondaryValue: characteristic.chartType === 'XBAR_S' ? m.stdDev : m.range,
      values: m.values,
      timestamp: m.timestamp,
      violations: pointViolations,
      isOutOfControl: pointViolations.some(v => v.severity === 'CRITICAL')
    };
  });

  const hasOOC = dataPoints.some(dp => dp.isOutOfControl);
  const hasWarning = violations.some(v => v.severity === 'WARNING');

  return {
    id: `chart-${characteristic.id}`,
    characteristicId: characteristic.id,
    characteristicName: characteristic.name,
    chartType: characteristic.chartType,
    processName: `Process ${characteristic.processId}`,
    subgroupSize: characteristic.subgroupSize,
    ucl: Math.round(limits.xbarUCL * 1000) / 1000,
    cl: Math.round(limits.xbarCL * 1000) / 1000,
    lcl: Math.round(limits.xbarLCL * 1000) / 1000,
    uclSecondary: Math.round(limits.rUCL * 1000) / 1000,
    clSecondary: Math.round(limits.rCL * 1000) / 1000,
    lclSecondary: Math.round(limits.rLCL * 1000) / 1000,
    usl: characteristic.usl,
    lsl: characteristic.lsl,
    targetValue: characteristic.targetValue,
    dataPoints,
    status: hasOOC ? 'OUT_OF_CONTROL' : (hasWarning ? 'WARNING' : 'IN_CONTROL'),
    lastUpdated: new Date().toISOString()
  };
}

function createEmptyControlChart(characteristic: ProcessCharacteristic): ControlChart {
  return {
    id: `chart-${characteristic.id}`,
    characteristicId: characteristic.id,
    characteristicName: characteristic.name,
    chartType: characteristic.chartType,
    processName: `Process ${characteristic.processId}`,
    subgroupSize: characteristic.subgroupSize,
    ucl: 0, cl: 0, lcl: 0,
    uclSecondary: 0, clSecondary: 0, lclSecondary: 0,
    usl: characteristic.usl,
    lsl: characteristic.lsl,
    targetValue: characteristic.targetValue,
    dataPoints: [],
    status: 'IN_CONTROL',
    lastUpdated: new Date().toISOString()
  };
}

function generateCapability(
  characteristic: ProcessCharacteristic,
  measurements: Measurement[]
): ProcessCapability {
  const allValues = measurements.flatMap(m => m.values);

  if (allValues.length === 0) {
    return {
      characteristicId: characteristic.id,
      characteristicName: characteristic.name,
      processName: `Process ${characteristic.processId}`,
      usl: characteristic.usl, lsl: characteristic.lsl, targetValue: characteristic.targetValue,
      mean: 0, stdDev: 0, min: 0, max: 0, sampleSize: 0,
      cp: 0, cpk: 0, cpl: 0, cpu: 0, pp: 0, ppk: 0, ppl: 0, ppu: 0,
      sigma: 0, ppm: 0, yield: 0,
      status: 'UNACCEPTABLE',
      recommendation: 'Không đủ dữ liệu để tính toán'
    };
  }

  const capability = SPCEngine.calculateCapability(
    allValues, characteristic.usl, characteristic.lsl, characteristic.targetValue
  );

  return {
    ...capability,
    characteristicId: characteristic.id,
    characteristicName: characteristic.name,
    processName: `Process ${characteristic.processId}`
  };
}

// =============================================================================
// GET HANDLER
// =============================================================================

export const GET = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'dashboard';
    const characteristicId = searchParams.get('characteristicId');

    switch (view) {
      case 'dashboard': {
        const characteristics = await fetchCharacteristics();

        const characteristicsData = await Promise.all(
          characteristics.map(async (char) => {
            const measurements = await fetchMeasurements(char.id, 25);
            const chart = generateControlChart(char, measurements);
            const capability = generateCapability(char, measurements);
            return { characteristic: char, chart, capability };
          })
        );

        const alerts = await fetchAlerts();
        const activeAlerts = alerts.filter(a => ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING'].includes(a.status));

        // Count measurements recorded today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const measurementsToday = await prisma.inspectionResult.count({
          where: { inspectedAt: { gte: todayStart } },
        });

        const cpkValues = characteristicsData.map(d => d.capability.cpk).filter(c => c > 0);
        const avgCpk = cpkValues.length > 0 ? SPCEngine.mean(cpkValues) : 0;

        const dashboard: SPCDashboard = {
          summary: {
            totalCharacteristics: characteristics.length,
            inControl: characteristicsData.filter(d => d.chart.status === 'IN_CONTROL').length,
            outOfControl: characteristicsData.filter(d => d.chart.status === 'OUT_OF_CONTROL').length,
            warning: characteristicsData.filter(d => d.chart.status === 'WARNING').length,
            avgCpk: Math.round(avgCpk * 100) / 100,
            activeAlerts: activeAlerts.length,
            measurementsToday
          },
          recentAlerts: activeAlerts.slice(0, 5),
          criticalProcesses: characteristicsData
            .filter(d => d.capability.cpk < 1.33)
            .map(d => ({
              characteristicId: d.characteristic.id,
              characteristicName: d.characteristic.name,
              processName: `Process ${d.characteristic.processId}`,
              cpk: d.capability.cpk,
              status: d.capability.status
            }))
            .sort((a, b) => a.cpk - b.cpk)
            .slice(0, 5),
          controlChartSummaries: characteristicsData.map(d => ({
            characteristicId: d.characteristic.id,
            characteristicName: d.characteristic.name,
            chartType: d.characteristic.chartType,
            status: d.chart.status,
            lastValue: d.chart.dataPoints[d.chart.dataPoints.length - 1]?.primaryValue || 0,
            lastUpdated: d.chart.lastUpdated
          }))
        };

        return NextResponse.json({ success: true, data: dashboard });
      }

      case 'characteristics': {
        const characteristics = await fetchCharacteristics();
        return NextResponse.json({ success: true, data: { characteristics } });
      }

      case 'chart': {
        if (!characteristicId) {
          return NextResponse.json({ success: false, error: 'characteristicId is required' }, { status: 400 });
        }
        const characteristics = await fetchCharacteristics(characteristicId);
        const characteristic = characteristics[0];
        if (!characteristic) {
          return NextResponse.json({ success: false, error: 'Characteristic not found' }, { status: 404 });
        }
        const measurements = await fetchMeasurements(characteristicId, 30);
        const chart = generateControlChart(characteristic, measurements);
        return NextResponse.json({ success: true, data: { chart, characteristic } });
      }

      case 'capability': {
        if (!characteristicId) {
          const characteristics = await fetchCharacteristics();
          const capabilities = await Promise.all(
            characteristics.map(async (char) => {
              const measurements = await fetchMeasurements(char.id, 50);
              return generateCapability(char, measurements);
            })
          );
          return NextResponse.json({ success: true, data: { capabilities } });
        }
        const characteristics = await fetchCharacteristics(characteristicId);
        const characteristic = characteristics[0];
        if (!characteristic) {
          return NextResponse.json({ success: false, error: 'Characteristic not found' }, { status: 404 });
        }
        const measurements = await fetchMeasurements(characteristicId, 50);
        const capability = generateCapability(characteristic, measurements);
        return NextResponse.json({ success: true, data: { capability, characteristic } });
      }

      case 'alerts': {
        const status = searchParams.get('status') ?? undefined;
        const severity = searchParams.get('severity') ?? undefined;
        const alerts = await fetchAlerts({ status, severity });
        const summary = {
          total: alerts.length,
          new: alerts.filter(a => a.status === 'NEW').length,
          acknowledged: alerts.filter(a => a.status === 'ACKNOWLEDGED').length,
          investigating: alerts.filter(a => a.status === 'INVESTIGATING').length,
          resolved: alerts.filter(a => a.status === 'RESOLVED').length,
          critical: alerts.filter(a => a.severity === 'CRITICAL').length,
          warning: alerts.filter(a => a.severity === 'WARNING').length
        };
        return NextResponse.json({ success: true, data: { alerts, summary } });
      }

      case 'measurements': {
        if (!characteristicId) {
          return NextResponse.json({ success: false, error: 'characteristicId is required' }, { status: 400 });
        }
        const characteristics = await fetchCharacteristics(characteristicId);
        const characteristic = characteristics[0];
        if (!characteristic) {
          return NextResponse.json({ success: false, error: 'Characteristic not found' }, { status: 404 });
        }
        const limit = parseInt(searchParams.get('limit') || '50');
        const measurements = await fetchMeasurements(characteristicId, limit);
        return NextResponse.json({ success: true, data: { measurements, characteristic } });
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid view' }, { status: 400 });
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/quality' });
    return NextResponse.json({ success: false, error: 'Đã xảy ra lỗi', code: 'QUALITY_ERROR' }, { status: 500 });
  }
});

// =============================================================================
// POST HANDLER
// =============================================================================

export const POST = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const bodySchema = z.object({
      action: z.enum(['add_measurement', 'acknowledge_alert', 'resolve_alert', 'dismiss_alert', 'recalculate_limits']),
      characteristicId: z.string().optional(),
      values: z.array(z.number()).optional(),
      operatorId: z.string().optional(),
      machineId: z.string().optional(),
      batchId: z.string().optional(),
      notes: z.string().optional(),
      alertId: z.string().optional(),
      acknowledgedBy: z.string().optional(),
      resolvedBy: z.string().optional(),
      resolution: z.string().optional(),
      inspectionId: z.string().optional(),
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
    const { action } = body;

    switch (action) {
      case 'add_measurement': {
        const { characteristicId, values, operatorId, machineId, batchId, notes, inspectionId } = body;
        if (!characteristicId || !values || !Array.isArray(values)) {
          return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const characteristics = await fetchCharacteristics(characteristicId);
        const characteristic = characteristics[0];
        if (!characteristic) {
          return NextResponse.json({ success: false, error: 'Characteristic not found' }, { status: 404 });
        }
        if (values.length !== characteristic.subgroupSize) {
          return NextResponse.json({
            success: false,
            error: `Expected ${characteristic.subgroupSize} values, got ${values.length}`
          }, { status: 400 });
        }

        const mean = SPCEngine.mean(values);
        const range = SPCEngine.range(values);
        const stdDev = SPCEngine.stdDev(values);

        // Determine the inspection to associate with.
        // If no inspectionId provided, try to find an active inspection for this characteristic.
        let resolvedInspectionId = inspectionId;
        if (!resolvedInspectionId) {
          const activeInspection = await prisma.inspection.findFirst({
            where: {
              status: { in: ['pending', 'in_progress'] },
              plan: { characteristics: { some: { id: characteristicId } } },
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          });
          resolvedInspectionId = activeInspection?.id;
        }

        if (!resolvedInspectionId) {
          return NextResponse.json({ success: false, error: 'No active inspection found for this characteristic. Provide inspectionId.' }, { status: 400 });
        }

        // Determine next sample number
        const lastResult = await prisma.inspectionResult.findFirst({
          where: { characteristicId },
          orderBy: { sampleNumber: 'desc' },
          select: { sampleNumber: true },
        });
        const nextSampleNumber = (lastResult?.sampleNumber ?? 0) + 1;

        const result = await prisma.inspectionResult.create({
          data: {
            inspectionId: resolvedInspectionId,
            characteristicId,
            result: 'PASS', // Will be updated by downstream logic if needed
            measuredValue: Math.round(mean * 1000) / 1000,
            measuredValues: values,
            findings: notes,
            sampleNumber: nextSampleNumber,
            subgroupId: `sg-${nextSampleNumber}`,
            machineId: machineId ?? null,
            mean: Math.round(mean * 1000) / 1000,
            range: Math.round(range * 1000) / 1000,
            stdDev: Math.round(stdDev * 1000) / 1000,
            inspectedBy: operatorId ?? session?.user?.id ?? 'system',
          },
        });

        const measurement: Measurement = {
          id: result.id,
          processId: resolvedInspectionId,
          characteristicId,
          sampleNumber: nextSampleNumber,
          subgroupId: `sg-${nextSampleNumber}`,
          values,
          mean: Math.round(mean * 1000) / 1000,
          range: Math.round(range * 1000) / 1000,
          stdDev: Math.round(stdDev * 1000) / 1000,
          timestamp: result.inspectedAt.toISOString(),
          operatorId, machineId, batchId, notes
        };

        // Check for SPC violations against existing measurements
        const recentMeasurements = await fetchMeasurements(characteristicId, 30);
        const chart = generateControlChart(characteristic, recentMeasurements);
        const lastPoint = chart.dataPoints[chart.dataPoints.length - 1];
        let alert: QualityAlert | null = null;

        if (lastPoint?.isOutOfControl && lastPoint.violations.length > 0) {
          const violation = lastPoint.violations[0];
          const createdAlert = await prisma.qualityAlert.create({
            data: {
              characteristicId,
              type: violation.type === 'RULE_1' ? 'OUT_OF_CONTROL' : 'RULE_VIOLATION',
              severity: violation.severity,
              status: 'open',
              title: violation.description,
              description: `Sample #${nextSampleNumber}: ${violation.rule} - ${violation.description}`,
              violation: JSON.parse(JSON.stringify(violation)),
            },
          });

          const charInfo = await prisma.inspectionCharacteristic.findUnique({
            where: { id: characteristicId },
            select: { name: true, planId: true, plan: { select: { name: true } } },
          });

          alert = {
            id: createdAlert.id,
            characteristicId,
            characteristicName: charInfo?.name ?? '',
            processId: charInfo?.planId ?? '',
            processName: charInfo?.plan?.name ?? `Process ${charInfo?.planId ?? ''}`,
            type: createdAlert.type as QualityAlert['type'],
            severity: createdAlert.severity as QualityAlert['severity'],
            status: createdAlert.status as QualityAlert['status'],
            title: createdAlert.title,
            description: createdAlert.description ?? '',
            violation,
            createdAt: createdAlert.createdAt.toISOString(),
          };
        }

        return NextResponse.json({
          success: true,
          data: { measurement, alert },
          message: 'Đã thêm dữ liệu đo lường'
        });
      }

      case 'acknowledge_alert': {
        const { alertId, acknowledgedBy } = body;
        if (!alertId || !acknowledgedBy) {
          return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const existingAlert = await prisma.qualityAlert.findUnique({ where: { id: alertId } });
        if (!existingAlert) {
          return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 });
        }

        const updated = await prisma.qualityAlert.update({
          where: { id: alertId },
          data: {
            status: 'acknowledged',
            acknowledgedBy,
            acknowledgedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            alertId: updated.id,
            status: 'ACKNOWLEDGED',
            acknowledgedBy: updated.acknowledgedBy,
            acknowledgedAt: updated.acknowledgedAt?.toISOString(),
          },
          message: 'Đã xác nhận cảnh báo'
        });
      }

      case 'resolve_alert': {
        const { alertId, resolvedBy, resolution } = body;
        if (!alertId || !resolvedBy || !resolution) {
          return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const existingAlert = await prisma.qualityAlert.findUnique({ where: { id: alertId } });
        if (!existingAlert) {
          return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 });
        }

        const updated = await prisma.qualityAlert.update({
          where: { id: alertId },
          data: {
            status: 'resolved',
            resolvedBy,
            resolvedAt: new Date(),
            resolution,
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            alertId: updated.id,
            status: 'RESOLVED',
            resolvedBy: updated.resolvedBy,
            resolvedAt: updated.resolvedAt?.toISOString(),
            resolution: updated.resolution,
          },
          message: 'Đã giải quyết cảnh báo'
        });
      }

      case 'dismiss_alert': {
        const { alertId } = body;
        if (!alertId) {
          return NextResponse.json({ success: false, error: 'Missing alertId' }, { status: 400 });
        }

        const existingAlert = await prisma.qualityAlert.findUnique({ where: { id: alertId } });
        if (!existingAlert) {
          return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 });
        }

        await prisma.qualityAlert.update({
          where: { id: alertId },
          data: { status: 'dismissed' },
        });

        return NextResponse.json({
          success: true,
          data: { alertId, status: 'DISMISSED' },
          message: 'Đã bỏ qua cảnh báo'
        });
      }

      case 'recalculate_limits': {
        const { characteristicId } = body;
        if (!characteristicId) {
          return NextResponse.json({ success: false, error: 'Missing characteristicId' }, { status: 400 });
        }

        const characteristics = await fetchCharacteristics(characteristicId);
        const characteristic = characteristics[0];
        if (!characteristic) {
          return NextResponse.json({ success: false, error: 'Characteristic not found' }, { status: 404 });
        }

        const measurements = await fetchMeasurements(characteristicId, 30);
        const chart = generateControlChart(characteristic, measurements);

        return NextResponse.json({
          success: true,
          data: {
            ucl: chart.ucl, cl: chart.cl, lcl: chart.lcl,
            uclSecondary: chart.uclSecondary, clSecondary: chart.clSecondary, lclSecondary: chart.lclSecondary
          },
          message: 'Đã tính lại giới hạn kiểm soát'
        });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/quality' });
    return NextResponse.json({ success: false, error: 'Đã xảy ra lỗi', code: 'QUALITY_ERROR' }, { status: 500 });
  }
});
