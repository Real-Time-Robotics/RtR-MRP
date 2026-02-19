// =============================================================================
// QUALITY MANAGEMENT API
// Phase 11: Quality Management - SPC
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { z } from 'zod';

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
// MOCK DATA
// =============================================================================

const mockCharacteristics: ProcessCharacteristic[] = [
  {
    id: 'char-001',
    processId: 'proc-001',
    name: 'Đường kính trục',
    code: 'DIA-001',
    description: 'Đường kính trục chính sau gia công tiện',
    unit: 'mm',
    nominalValue: 25.0,
    lsl: 24.95,
    usl: 25.05,
    targetValue: 25.0,
    subgroupSize: 5,
    samplingFrequency: '1h',
    chartType: 'XBAR_R',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'char-002',
    processId: 'proc-001',
    name: 'Độ nhám bề mặt',
    code: 'RA-001',
    description: 'Độ nhám Ra sau mài',
    unit: 'μm',
    nominalValue: 0.8,
    lsl: 0.4,
    usl: 1.2,
    targetValue: 0.8,
    subgroupSize: 3,
    samplingFrequency: '2h',
    chartType: 'XBAR_R',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'char-003',
    processId: 'proc-002',
    name: 'Chiều dài cắt',
    code: 'LEN-001',
    description: 'Chiều dài sau cắt CNC',
    unit: 'mm',
    nominalValue: 100.0,
    lsl: 99.9,
    usl: 100.1,
    targetValue: 100.0,
    subgroupSize: 5,
    samplingFrequency: 'batch',
    chartType: 'XBAR_S',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'char-004',
    processId: 'proc-003',
    name: 'Tỷ lệ lỗi hàn',
    code: 'DEF-001',
    description: 'Tỷ lệ mối hàn lỗi',
    unit: '%',
    nominalValue: 0,
    lsl: 0,
    usl: 5,
    targetValue: 0,
    subgroupSize: 100,
    samplingFrequency: 'shift',
    chartType: 'P',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'char-005',
    processId: 'proc-004',
    name: 'Độ cứng vật liệu',
    code: 'HRC-001',
    description: 'Độ cứng HRC sau xử lý nhiệt',
    unit: 'HRC',
    nominalValue: 58,
    lsl: 56,
    usl: 60,
    targetValue: 58,
    subgroupSize: 1,
    samplingFrequency: 'batch',
    chartType: 'I_MR',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  }
];

// Generate mock measurements
function generateMockMeasurements(characteristic: ProcessCharacteristic, count: number = 25): Measurement[] {
  const measurements: Measurement[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const values: number[] = [];
    const baseValue = characteristic.nominalValue;
    const variance = (characteristic.usl - characteristic.lsl) / 6;
    
    for (let j = 0; j < characteristic.subgroupSize; j++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const value = baseValue + z * variance;
      values.push(Math.round(value * 1000) / 1000);
    }
    
    const mean = SPCEngine.mean(values);
    const range = SPCEngine.range(values);
    const stdDev = SPCEngine.stdDev(values);
    
    const timestamp = new Date(now);
    timestamp.setHours(timestamp.getHours() - (count - i));
    
    measurements.push({
      id: `meas-${characteristic.id}-${i + 1}`,
      processId: characteristic.processId,
      characteristicId: characteristic.id,
      sampleNumber: i + 1,
      subgroupId: `sg-${i + 1}`,
      values,
      mean: Math.round(mean * 1000) / 1000,
      range: Math.round(range * 1000) / 1000,
      stdDev: Math.round(stdDev * 1000) / 1000,
      timestamp: timestamp.toISOString(),
      operatorId: `op-${(i % 3) + 1}`,
      machineId: `mc-${(i % 2) + 1}`,
      batchId: `batch-${Math.floor(i / 5) + 1}`
    });
  }
  
  return measurements;
}

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

function generateMockAlerts(): QualityAlert[] {
  return [
    {
      id: 'alert-001',
      characteristicId: 'char-001',
      characteristicName: 'Đường kính trục',
      processId: 'proc-001',
      processName: 'Tiện CNC',
      type: 'OUT_OF_CONTROL',
      severity: 'CRITICAL',
      status: 'NEW',
      title: 'Điểm nằm ngoài giới hạn kiểm soát',
      description: 'Mẫu #23 có giá trị 25.08mm vượt UCL (25.06mm)',
      violation: {
        type: 'RULE_1',
        rule: 'Western Electric Rule 1',
        description: 'Điểm nằm ngoài giới hạn kiểm soát 3σ',
        severity: 'CRITICAL',
        pointIndex: 22
      },
      createdAt: new Date(Date.now() - 30 * 60000).toISOString()
    },
    {
      id: 'alert-002',
      characteristicId: 'char-002',
      characteristicName: 'Độ nhám bề mặt',
      processId: 'proc-001',
      processName: 'Mài tinh',
      type: 'TREND',
      severity: 'WARNING',
      status: 'ACKNOWLEDGED',
      title: 'Phát hiện xu hướng tăng',
      description: '6 điểm liên tiếp có xu hướng tăng dần',
      acknowledgedBy: 'Nguyễn Văn A',
      acknowledgedAt: new Date(Date.now() - 15 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      id: 'alert-003',
      characteristicId: 'char-003',
      characteristicName: 'Chiều dài cắt',
      processId: 'proc-002',
      processName: 'Cắt CNC',
      type: 'CAPABILITY_LOW',
      severity: 'WARNING',
      status: 'INVESTIGATING',
      title: 'Năng lực quy trình thấp',
      description: 'Cpk = 0.95 thấp hơn mức chấp nhận (1.0)',
      acknowledgedBy: 'Trần Văn B',
      acknowledgedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString()
    },
    {
      id: 'alert-004',
      characteristicId: 'char-004',
      characteristicName: 'Tỷ lệ lỗi hàn',
      processId: 'proc-003',
      processName: 'Hàn Robot',
      type: 'SHIFT',
      severity: 'WARNING',
      status: 'RESOLVED',
      title: 'Phát hiện dịch chuyển quy trình',
      description: '8 điểm liên tiếp nằm trên đường trung tâm',
      acknowledgedBy: 'Lê Văn C',
      acknowledgedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
      resolvedBy: 'Lê Văn C',
      resolvedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      resolution: 'Đã điều chỉnh thông số hàn và tái đào tạo operator',
      createdAt: new Date(Date.now() - 72 * 3600000).toISOString()
    }
  ];
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
        const characteristicsData = mockCharacteristics.map(char => {
          const measurements = generateMockMeasurements(char, 25);
          const chart = generateControlChart(char, measurements);
          const capability = generateCapability(char, measurements);
          return { characteristic: char, chart, capability };
        });
        
        const alerts = generateMockAlerts();
        const activeAlerts = alerts.filter(a => ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING'].includes(a.status));
        
        const avgCpk = SPCEngine.mean(
          characteristicsData.map(d => d.capability.cpk).filter(c => c > 0)
        );
        
        const dashboard: SPCDashboard = {
          summary: {
            totalCharacteristics: mockCharacteristics.length,
            inControl: characteristicsData.filter(d => d.chart.status === 'IN_CONTROL').length,
            outOfControl: characteristicsData.filter(d => d.chart.status === 'OUT_OF_CONTROL').length,
            warning: characteristicsData.filter(d => d.chart.status === 'WARNING').length,
            avgCpk: Math.round(avgCpk * 100) / 100,
            activeAlerts: activeAlerts.length,
            measurementsToday: 87
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
      
      case 'characteristics':
        return NextResponse.json({ success: true, data: { characteristics: mockCharacteristics } });
      
      case 'chart': {
        if (!characteristicId) {
          return NextResponse.json({ success: false, error: 'characteristicId is required' }, { status: 400 });
        }
        const characteristic = mockCharacteristics.find(c => c.id === characteristicId);
        if (!characteristic) {
          return NextResponse.json({ success: false, error: 'Characteristic not found' }, { status: 404 });
        }
        const measurements = generateMockMeasurements(characteristic, 30);
        const chart = generateControlChart(characteristic, measurements);
        return NextResponse.json({ success: true, data: { chart, characteristic } });
      }
      
      case 'capability': {
        if (!characteristicId) {
          const capabilities = mockCharacteristics.map(char => {
            const measurements = generateMockMeasurements(char, 50);
            return generateCapability(char, measurements);
          });
          return NextResponse.json({ success: true, data: { capabilities } });
        }
        const characteristic = mockCharacteristics.find(c => c.id === characteristicId);
        if (!characteristic) {
          return NextResponse.json({ success: false, error: 'Characteristic not found' }, { status: 404 });
        }
        const measurements = generateMockMeasurements(characteristic, 50);
        const capability = generateCapability(characteristic, measurements);
        return NextResponse.json({ success: true, data: { capability, characteristic } });
      }
      
      case 'alerts': {
        const status = searchParams.get('status');
        const severity = searchParams.get('severity');
        let alerts = generateMockAlerts();
        if (status) alerts = alerts.filter(a => a.status === status);
        if (severity) alerts = alerts.filter(a => a.severity === severity);
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
        const characteristic = mockCharacteristics.find(c => c.id === characteristicId);
        if (!characteristic) {
          return NextResponse.json({ success: false, error: 'Characteristic not found' }, { status: 404 });
        }
        const limit = parseInt(searchParams.get('limit') || '50');
        const measurements = generateMockMeasurements(characteristic, limit);
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
        const { characteristicId, values, operatorId, machineId, batchId, notes } = body;
        if (!characteristicId || !values || !Array.isArray(values)) {
          return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }
        const characteristic = mockCharacteristics.find(c => c.id === characteristicId);
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
        const measurement: Measurement = {
          id: `meas-${Date.now()}`,
          processId: characteristic.processId,
          characteristicId,
          sampleNumber: 1,
          subgroupId: `sg-${Date.now()}`,
          values,
          mean: Math.round(mean * 1000) / 1000,
          range: Math.round(range * 1000) / 1000,
          stdDev: Math.round(stdDev * 1000) / 1000,
          timestamp: new Date().toISOString(),
          operatorId, machineId, batchId, notes
        };
        return NextResponse.json({
          success: true,
          data: { measurement, alert: null },
          message: 'Đã thêm dữ liệu đo lường'
        });
      }
      
      case 'acknowledge_alert': {
        const { alertId, acknowledgedBy } = body;
        if (!alertId || !acknowledgedBy) {
          return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }
        return NextResponse.json({
          success: true,
          data: { alertId, status: 'ACKNOWLEDGED', acknowledgedBy, acknowledgedAt: new Date().toISOString() },
          message: 'Đã xác nhận cảnh báo'
        });
      }
      
      case 'resolve_alert': {
        const { alertId, resolvedBy, resolution } = body;
        if (!alertId || !resolvedBy || !resolution) {
          return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }
        return NextResponse.json({
          success: true,
          data: { alertId, status: 'RESOLVED', resolvedBy, resolvedAt: new Date().toISOString(), resolution },
          message: 'Đã giải quyết cảnh báo'
        });
      }
      
      case 'dismiss_alert': {
        const { alertId } = body;
        if (!alertId) {
          return NextResponse.json({ success: false, error: 'Missing alertId' }, { status: 400 });
        }
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
        const characteristic = mockCharacteristics.find(c => c.id === characteristicId);
        if (!characteristic) {
          return NextResponse.json({ success: false, error: 'Characteristic not found' }, { status: 404 });
        }
        const measurements = generateMockMeasurements(characteristic, 30);
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
