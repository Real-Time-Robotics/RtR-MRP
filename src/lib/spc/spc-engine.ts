// =============================================================================
// SPC ENGINE - Statistical Process Control
// Phase 11: Quality Management
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

export type ChartType = 'XBAR_R' | 'XBAR_S' | 'I_MR' | 'P' | 'NP' | 'C' | 'U';
export type ViolationType = 'OUT_OF_CONTROL' | 'RULE_1' | 'RULE_2' | 'RULE_3' | 'RULE_4' | 'RULE_5' | 'RULE_6' | 'RULE_7' | 'RULE_8' | 'TREND' | 'SHIFT';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';

export interface Measurement {
  id: string;
  processId: string;
  characteristicId: string;
  sampleNumber: number;
  subgroupId: string;
  values: number[];
  mean: number;
  range: number;
  stdDev: number;
  timestamp: string;
  operatorId?: string;
  machineId?: string;
  batchId?: string;
  notes?: string;
}

export interface ProcessCharacteristic {
  id: string;
  processId: string;
  name: string;
  code: string;
  description?: string;
  unit: string;
  nominalValue: number;
  lsl: number; // Lower Specification Limit
  usl: number; // Upper Specification Limit
  targetValue?: number;
  subgroupSize: number;
  samplingFrequency: string; // e.g., "1h", "shift", "batch"
  chartType: ChartType;
  isActive: boolean;
  createdAt: string;
}

export interface ControlChart {
  id: string;
  characteristicId: string;
  characteristicName: string;
  chartType: ChartType;
  processName: string;
  subgroupSize: number;
  // Control limits for primary chart (X-bar or Individual)
  ucl: number;      // Upper Control Limit
  cl: number;       // Center Line (mean)
  lcl: number;      // Lower Control Limit
  // Control limits for secondary chart (R or MR or S)
  uclSecondary: number;
  clSecondary: number;
  lclSecondary: number;
  // Specification limits
  usl: number;
  lsl: number;
  targetValue?: number;
  // Data points
  dataPoints: ControlChartDataPoint[];
  // Status
  status: 'IN_CONTROL' | 'WARNING' | 'OUT_OF_CONTROL';
  lastUpdated: string;
}

export interface ControlChartDataPoint {
  id: string;
  subgroupId: string;
  sampleNumber: number;
  primaryValue: number;    // X-bar, X (individual), p, np, c, u
  secondaryValue: number;  // R, MR, S
  values: number[];        // Individual measurements in subgroup
  timestamp: string;
  violations: Violation[];
  isOutOfControl: boolean;
}

export interface Violation {
  type: ViolationType;
  rule: string;
  description: string;
  severity: AlertSeverity;
  pointIndex: number;
}

export interface ProcessCapability {
  characteristicId: string;
  characteristicName: string;
  processName: string;
  // Specification limits
  usl: number;
  lsl: number;
  targetValue?: number;
  // Statistics
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  sampleSize: number;
  // Capability indices
  cp: number;       // Process Capability
  cpk: number;      // Process Capability Index (centered)
  cpl: number;      // Lower capability
  cpu: number;      // Upper capability
  pp: number;       // Process Performance
  ppk: number;      // Process Performance Index
  ppl: number;      // Lower performance
  ppu: number;      // Upper performance
  // Additional metrics
  sigma: number;    // Process sigma level
  ppm: number;      // Parts per million defective
  yield: number;    // Process yield (%)
  // Status
  status: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR' | 'UNACCEPTABLE';
  recommendation: string;
}

export interface QualityAlert {
  id: string;
  characteristicId: string;
  characteristicName: string;
  processId: string;
  processName: string;
  type: 'OUT_OF_CONTROL' | 'CAPABILITY_LOW' | 'TREND' | 'SHIFT' | 'RULE_VIOLATION';
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  measurement?: Measurement;
  violation?: Violation;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
}

export interface SPCDashboard {
  summary: {
    totalCharacteristics: number;
    inControl: number;
    outOfControl: number;
    warning: number;
    avgCpk: number;
    activeAlerts: number;
    measurementsToday: number;
  };
  recentAlerts: QualityAlert[];
  criticalProcesses: {
    characteristicId: string;
    characteristicName: string;
    processName: string;
    cpk: number;
    status: string;
  }[];
  controlChartSummaries: {
    characteristicId: string;
    characteristicName: string;
    chartType: ChartType;
    status: 'IN_CONTROL' | 'WARNING' | 'OUT_OF_CONTROL';
    lastValue: number;
    lastUpdated: string;
  }[];
}

// =============================================================================
// CONSTANTS - Control Chart Factors
// =============================================================================

// A2 factors for X-bar chart (subgroup sizes 2-10)
const A2_FACTORS: Record<number, number> = {
  2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577,
  6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308
};

// A3 factors for X-bar S chart
const A3_FACTORS: Record<number, number> = {
  2: 2.659, 3: 1.954, 4: 1.628, 5: 1.427,
  6: 1.287, 7: 1.182, 8: 1.099, 9: 1.032, 10: 0.975
};

// D3 factors for R chart lower control limit
const D3_FACTORS: Record<number, number> = {
  2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0.076, 8: 0.136, 9: 0.184, 10: 0.223
};

// D4 factors for R chart upper control limit
const D4_FACTORS: Record<number, number> = {
  2: 3.267, 3: 2.574, 4: 2.282, 5: 2.114,
  6: 2.004, 7: 1.924, 8: 1.864, 9: 1.816, 10: 1.777
};

// B3 factors for S chart lower control limit
const B3_FACTORS: Record<number, number> = {
  2: 0, 3: 0, 4: 0, 5: 0, 6: 0.030, 7: 0.118, 8: 0.185, 9: 0.239, 10: 0.284
};

// B4 factors for S chart upper control limit
const B4_FACTORS: Record<number, number> = {
  2: 3.267, 3: 2.568, 4: 2.266, 5: 2.089,
  6: 1.970, 7: 1.882, 8: 1.815, 9: 1.761, 10: 1.716
};

// d2 factors for estimating sigma from R-bar
const D2_FACTORS: Record<number, number> = {
  2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326,
  6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078
};

// c4 factors for estimating sigma from S-bar
const C4_FACTORS: Record<number, number> = {
  2: 0.7979, 3: 0.8862, 4: 0.9213, 5: 0.9400,
  6: 0.9515, 7: 0.9594, 8: 0.9650, 9: 0.9693, 10: 0.9727
};

// =============================================================================
// SPC ENGINE CLASS
// =============================================================================

export class SPCEngine {
  
  // ===========================================================================
  // BASIC STATISTICS
  // ===========================================================================

  /**
   * Calculate mean of an array
   */
  static mean(data: number[]): number {
    if (data.length === 0) return 0;
    return data.reduce((a, b) => a + b, 0) / data.length;
  }

  /**
   * Calculate sample standard deviation
   */
  static stdDev(data: number[], isSample: boolean = true): number {
    if (data.length < 2) return 0;
    const avg = this.mean(data);
    const squaredDiffs = data.map(x => (x - avg) ** 2);
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (isSample ? data.length - 1 : data.length);
    return Math.sqrt(variance);
  }

  /**
   * Calculate range (max - min)
   */
  static range(data: number[]): number {
    if (data.length === 0) return 0;
    return Math.max(...data) - Math.min(...data);
  }

  /**
   * Calculate moving range
   */
  static movingRange(data: number[]): number[] {
    const mr: number[] = [];
    for (let i = 1; i < data.length; i++) {
      mr.push(Math.abs(data[i] - data[i - 1]));
    }
    return mr;
  }

  // ===========================================================================
  // CONTROL CHART CALCULATIONS
  // ===========================================================================

  /**
   * Calculate X-bar R chart control limits
   */
  static calculateXbarRLimits(subgroups: number[][], subgroupSize: number): {
    xbarUCL: number;
    xbarCL: number;
    xbarLCL: number;
    rUCL: number;
    rCL: number;
    rLCL: number;
    sigma: number;
  } {
    const xbars = subgroups.map(sg => this.mean(sg));
    const ranges = subgroups.map(sg => this.range(sg));
    
    const xbarBar = this.mean(xbars);
    const rBar = this.mean(ranges);
    
    const A2 = A2_FACTORS[subgroupSize] || A2_FACTORS[5];
    const D3 = D3_FACTORS[subgroupSize] || D3_FACTORS[5];
    const D4 = D4_FACTORS[subgroupSize] || D4_FACTORS[5];
    const d2 = D2_FACTORS[subgroupSize] || D2_FACTORS[5];
    
    const sigma = rBar / d2;
    
    return {
      xbarUCL: xbarBar + A2 * rBar,
      xbarCL: xbarBar,
      xbarLCL: xbarBar - A2 * rBar,
      rUCL: D4 * rBar,
      rCL: rBar,
      rLCL: D3 * rBar,
      sigma
    };
  }

  /**
   * Calculate X-bar S chart control limits
   */
  static calculateXbarSLimits(subgroups: number[][], subgroupSize: number): {
    xbarUCL: number;
    xbarCL: number;
    xbarLCL: number;
    sUCL: number;
    sCL: number;
    sLCL: number;
    sigma: number;
  } {
    const xbars = subgroups.map(sg => this.mean(sg));
    const stdDevs = subgroups.map(sg => this.stdDev(sg));
    
    const xbarBar = this.mean(xbars);
    const sBar = this.mean(stdDevs);
    
    const A3 = A3_FACTORS[subgroupSize] || A3_FACTORS[5];
    const B3 = B3_FACTORS[subgroupSize] || B3_FACTORS[5];
    const B4 = B4_FACTORS[subgroupSize] || B4_FACTORS[5];
    const c4 = C4_FACTORS[subgroupSize] || C4_FACTORS[5];
    
    const sigma = sBar / c4;
    
    return {
      xbarUCL: xbarBar + A3 * sBar,
      xbarCL: xbarBar,
      xbarLCL: xbarBar - A3 * sBar,
      sUCL: B4 * sBar,
      sCL: sBar,
      sLCL: B3 * sBar,
      sigma
    };
  }

  /**
   * Calculate Individual-Moving Range (I-MR) chart control limits
   */
  static calculateIMRLimits(values: number[]): {
    iUCL: number;
    iCL: number;
    iLCL: number;
    mrUCL: number;
    mrCL: number;
    mrLCL: number;
    sigma: number;
  } {
    const mr = this.movingRange(values);
    
    const xBar = this.mean(values);
    const mrBar = this.mean(mr);
    
    // E2 = 2.66 for individual charts (based on d2 = 1.128 for n=2)
    const E2 = 2.66;
    // D4 for n=2
    const D4 = 3.267;
    
    const sigma = mrBar / 1.128;
    
    return {
      iUCL: xBar + E2 * mrBar,
      iCL: xBar,
      iLCL: xBar - E2 * mrBar,
      mrUCL: D4 * mrBar,
      mrCL: mrBar,
      mrLCL: 0,
      sigma
    };
  }

  /**
   * Calculate p-chart control limits (proportion defective)
   */
  static calculatePChartLimits(defectives: number[], sampleSizes: number[]): {
    ucl: number[];
    cl: number;
    lcl: number[];
  } {
    const p = defectives.map((d, i) => d / sampleSizes[i]);
    const totalDefectives = defectives.reduce((a, b) => a + b, 0);
    const totalSamples = sampleSizes.reduce((a, b) => a + b, 0);
    const pBar = totalDefectives / totalSamples;
    
    const ucl = sampleSizes.map(n => 
      Math.min(1, pBar + 3 * Math.sqrt(pBar * (1 - pBar) / n))
    );
    const lcl = sampleSizes.map(n => 
      Math.max(0, pBar - 3 * Math.sqrt(pBar * (1 - pBar) / n))
    );
    
    return { ucl, cl: pBar, lcl };
  }

  /**
   * Calculate np-chart control limits (number defective)
   */
  static calculateNPChartLimits(defectives: number[], sampleSize: number): {
    ucl: number;
    cl: number;
    lcl: number;
  } {
    const npBar = this.mean(defectives);
    const pBar = npBar / sampleSize;
    
    const sigma = Math.sqrt(sampleSize * pBar * (1 - pBar));
    
    return {
      ucl: npBar + 3 * sigma,
      cl: npBar,
      lcl: Math.max(0, npBar - 3 * sigma)
    };
  }

  /**
   * Calculate c-chart control limits (defects per unit)
   */
  static calculateCChartLimits(defects: number[]): {
    ucl: number;
    cl: number;
    lcl: number;
  } {
    const cBar = this.mean(defects);
    
    return {
      ucl: cBar + 3 * Math.sqrt(cBar),
      cl: cBar,
      lcl: Math.max(0, cBar - 3 * Math.sqrt(cBar))
    };
  }

  /**
   * Calculate u-chart control limits (defects per unit, variable sample size)
   */
  static calculateUChartLimits(defects: number[], sampleSizes: number[]): {
    ucl: number[];
    cl: number;
    lcl: number[];
  } {
    const u = defects.map((d, i) => d / sampleSizes[i]);
    const totalDefects = defects.reduce((a, b) => a + b, 0);
    const totalUnits = sampleSizes.reduce((a, b) => a + b, 0);
    const uBar = totalDefects / totalUnits;
    
    const ucl = sampleSizes.map(n => uBar + 3 * Math.sqrt(uBar / n));
    const lcl = sampleSizes.map(n => Math.max(0, uBar - 3 * Math.sqrt(uBar / n)));
    
    return { ucl, cl: uBar, lcl };
  }

  // ===========================================================================
  // PROCESS CAPABILITY
  // ===========================================================================

  /**
   * Calculate process capability indices
   */
  static calculateCapability(
    data: number[],
    usl: number,
    lsl: number,
    targetValue?: number
  ): ProcessCapability {
    const n = data.length;
    const mean = this.mean(data);
    const sigma = this.stdDev(data);
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    // Specification width
    const specWidth = usl - lsl;
    
    // Process Capability (Cp) - potential capability
    const cp = specWidth / (6 * sigma);
    
    // Process Capability Index (Cpk) - actual capability
    const cpu = (usl - mean) / (3 * sigma);
    const cpl = (mean - lsl) / (3 * sigma);
    const cpk = Math.min(cpu, cpl);
    
    // Process Performance (Pp, Ppk) - using overall std dev
    const overallSigma = this.stdDev(data, false);
    const pp = specWidth / (6 * overallSigma);
    const ppu = (usl - mean) / (3 * overallSigma);
    const ppl = (mean - lsl) / (3 * overallSigma);
    const ppk = Math.min(ppu, ppl);
    
    // Sigma level
    const sigmaLevel = cpk * 3;
    
    // PPM calculation
    const zUpper = (usl - mean) / sigma;
    const zLower = (mean - lsl) / sigma;
    const ppmUpper = this.normalCDF(-zUpper) * 1000000;
    const ppmLower = this.normalCDF(-zLower) * 1000000;
    const ppm = ppmUpper + ppmLower;
    
    // Yield
    const yieldPercent = (1 - ppm / 1000000) * 100;
    
    // Status and recommendation
    let status: ProcessCapability['status'];
    let recommendation: string;
    
    if (cpk >= 1.67) {
      status = 'EXCELLENT';
      recommendation = 'Quy trình xuất sắc, duy trì kiểm soát hiện tại';
    } else if (cpk >= 1.33) {
      status = 'GOOD';
      recommendation = 'Quy trình tốt, có thể cải thiện thêm';
    } else if (cpk >= 1.0) {
      status = 'ACCEPTABLE';
      recommendation = 'Quy trình chấp nhận được, cần cải thiện để giảm biến thiên';
    } else if (cpk >= 0.67) {
      status = 'POOR';
      recommendation = 'Quy trình yếu, cần hành động cải thiện ngay';
    } else {
      status = 'UNACCEPTABLE';
      recommendation = 'Quy trình không đạt yêu cầu, cần dừng và điều tra nguyên nhân';
    }
    
    return {
      characteristicId: '',
      characteristicName: '',
      processName: '',
      usl,
      lsl,
      targetValue,
      mean: Math.round(mean * 1000) / 1000,
      stdDev: Math.round(sigma * 1000) / 1000,
      min,
      max,
      sampleSize: n,
      cp: Math.round(cp * 100) / 100,
      cpk: Math.round(cpk * 100) / 100,
      cpl: Math.round(cpl * 100) / 100,
      cpu: Math.round(cpu * 100) / 100,
      pp: Math.round(pp * 100) / 100,
      ppk: Math.round(ppk * 100) / 100,
      ppl: Math.round(ppl * 100) / 100,
      ppu: Math.round(ppu * 100) / 100,
      sigma: Math.round(sigmaLevel * 100) / 100,
      ppm: Math.round(ppm),
      yield: Math.round(yieldPercent * 100) / 100,
      status,
      recommendation
    };
  }

  /**
   * Standard normal CDF approximation
   */
  private static normalCDF(x: number): number {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return 0.5 * (1.0 + sign * y);
  }

  // ===========================================================================
  // WESTERN ELECTRIC RULES (Run Rules)
  // ===========================================================================

  /**
   * Check all Western Electric rules for control chart violations
   */
  static checkWesternElectricRules(
    values: number[],
    ucl: number,
    cl: number,
    lcl: number
  ): Violation[] {
    const violations: Violation[] = [];
    const sigma = (ucl - cl) / 3;
    const zone1Upper = cl + 2 * sigma;
    const zone1Lower = cl - 2 * sigma;
    const zone2Upper = cl + sigma;
    const zone2Lower = cl - sigma;
    
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      
      // Rule 1: Point beyond 3 sigma
      if (v > ucl || v < lcl) {
        violations.push({
          type: 'RULE_1',
          rule: 'Western Electric Rule 1',
          description: 'Điểm nằm ngoài giới hạn kiểm soát 3σ',
          severity: 'CRITICAL',
          pointIndex: i
        });
      }
      
      // Rule 2: 2 of 3 consecutive points beyond 2 sigma
      if (i >= 2) {
        const recent3 = values.slice(i - 2, i + 1);
        const beyond2SigmaUpper = recent3.filter(x => x > zone1Upper).length;
        const beyond2SigmaLower = recent3.filter(x => x < zone1Lower).length;
        if (beyond2SigmaUpper >= 2 || beyond2SigmaLower >= 2) {
          violations.push({
            type: 'RULE_2',
            rule: 'Western Electric Rule 2',
            description: '2 trong 3 điểm liên tiếp nằm ngoài vùng 2σ',
            severity: 'WARNING',
            pointIndex: i
          });
        }
      }
      
      // Rule 3: 4 of 5 consecutive points beyond 1 sigma
      if (i >= 4) {
        const recent5 = values.slice(i - 4, i + 1);
        const beyond1SigmaUpper = recent5.filter(x => x > zone2Upper).length;
        const beyond1SigmaLower = recent5.filter(x => x < zone2Lower).length;
        if (beyond1SigmaUpper >= 4 || beyond1SigmaLower >= 4) {
          violations.push({
            type: 'RULE_3',
            rule: 'Western Electric Rule 3',
            description: '4 trong 5 điểm liên tiếp nằm ngoài vùng 1σ',
            severity: 'WARNING',
            pointIndex: i
          });
        }
      }
      
      // Rule 4: 8 consecutive points on same side of center line
      if (i >= 7) {
        const recent8 = values.slice(i - 7, i + 1);
        const allAbove = recent8.every(x => x > cl);
        const allBelow = recent8.every(x => x < cl);
        if (allAbove || allBelow) {
          violations.push({
            type: 'RULE_4',
            rule: 'Western Electric Rule 4',
            description: '8 điểm liên tiếp cùng phía so với đường trung tâm',
            severity: 'WARNING',
            pointIndex: i
          });
        }
      }
      
      // Rule 5: 6 consecutive points trending up or down
      if (i >= 5) {
        const recent6 = values.slice(i - 5, i + 1);
        let increasing = true;
        let decreasing = true;
        for (let j = 1; j < recent6.length; j++) {
          if (recent6[j] <= recent6[j - 1]) increasing = false;
          if (recent6[j] >= recent6[j - 1]) decreasing = false;
        }
        if (increasing || decreasing) {
          violations.push({
            type: 'RULE_5',
            rule: 'Western Electric Rule 5',
            description: '6 điểm liên tiếp tăng hoặc giảm dần (xu hướng)',
            severity: 'WARNING',
            pointIndex: i
          });
        }
      }
      
      // Rule 6: 14 consecutive points alternating up and down
      if (i >= 13) {
        const recent14 = values.slice(i - 13, i + 1);
        let alternating = true;
        for (let j = 2; j < recent14.length; j++) {
          const prevDiff = recent14[j - 1] - recent14[j - 2];
          const currDiff = recent14[j] - recent14[j - 1];
          if (prevDiff * currDiff >= 0) {
            alternating = false;
            break;
          }
        }
        if (alternating) {
          violations.push({
            type: 'RULE_6',
            rule: 'Western Electric Rule 6',
            description: '14 điểm liên tiếp dao động lên xuống xen kẽ',
            severity: 'INFO',
            pointIndex: i
          });
        }
      }
      
      // Rule 7: 15 consecutive points in zone C (within 1 sigma)
      if (i >= 14) {
        const recent15 = values.slice(i - 14, i + 1);
        const allInZoneC = recent15.every(x => x >= zone2Lower && x <= zone2Upper);
        if (allInZoneC) {
          violations.push({
            type: 'RULE_7',
            rule: 'Western Electric Rule 7',
            description: '15 điểm liên tiếp trong vùng 1σ (thiếu biến thiên)',
            severity: 'INFO',
            pointIndex: i
          });
        }
      }
      
      // Rule 8: 8 consecutive points beyond 1 sigma on both sides
      if (i >= 7) {
        const recent8 = values.slice(i - 7, i + 1);
        const allOutsideZoneC = recent8.every(x => x < zone2Lower || x > zone2Upper);
        if (allOutsideZoneC) {
          violations.push({
            type: 'RULE_8',
            rule: 'Western Electric Rule 8',
            description: '8 điểm liên tiếp nằm ngoài vùng 1σ (biến thiên lớn)',
            severity: 'WARNING',
            pointIndex: i
          });
        }
      }
    }
    
    return violations;
  }

  /**
   * Detect trend in data
   */
  static detectTrend(values: number[], windowSize: number = 6): {
    hasTrend: boolean;
    direction: 'UP' | 'DOWN' | 'NONE';
    strength: number;
  } {
    if (values.length < windowSize) {
      return { hasTrend: false, direction: 'NONE', strength: 0 };
    }
    
    const recent = values.slice(-windowSize);
    let increasing = 0;
    let decreasing = 0;
    
    for (let i = 1; i < recent.length; i++) {
      if (recent[i] > recent[i - 1]) increasing++;
      else if (recent[i] < recent[i - 1]) decreasing++;
    }
    
    const n = windowSize - 1;
    if (increasing === n) {
      return { hasTrend: true, direction: 'UP', strength: 1 };
    }
    if (decreasing === n) {
      return { hasTrend: true, direction: 'DOWN', strength: 1 };
    }
    
    const strength = Math.abs(increasing - decreasing) / n;
    const direction = increasing > decreasing ? 'UP' : (decreasing > increasing ? 'DOWN' : 'NONE');
    
    return { hasTrend: strength > 0.7, direction, strength };
  }

  /**
   * Detect shift in process mean
   */
  static detectShift(values: number[], cl: number, sigma: number, windowSize: number = 8): {
    hasShift: boolean;
    direction: 'UP' | 'DOWN' | 'NONE';
    magnitude: number;
  } {
    if (values.length < windowSize) {
      return { hasShift: false, direction: 'NONE', magnitude: 0 };
    }
    
    const recent = values.slice(-windowSize);
    const aboveCL = recent.filter(x => x > cl).length;
    const belowCL = recent.filter(x => x < cl).length;
    
    if (aboveCL === windowSize) {
      const avgShift = this.mean(recent) - cl;
      return { hasShift: true, direction: 'UP', magnitude: avgShift / sigma };
    }
    if (belowCL === windowSize) {
      const avgShift = cl - this.mean(recent);
      return { hasShift: true, direction: 'DOWN', magnitude: avgShift / sigma };
    }
    
    return { hasShift: false, direction: 'NONE', magnitude: 0 };
  }

  // ===========================================================================
  // UTILITY FUNCTIONS
  // ===========================================================================

  /**
   * Get chart type label
   */
  static getChartTypeLabel(chartType: ChartType): string {
    const labels: Record<ChartType, string> = {
      'XBAR_R': 'X̄-R Chart',
      'XBAR_S': 'X̄-S Chart',
      'I_MR': 'I-MR Chart',
      'P': 'p Chart',
      'NP': 'np Chart',
      'C': 'c Chart',
      'U': 'u Chart'
    };
    return labels[chartType];
  }

  /**
   * Get status color
   */
  static getStatusColor(status: 'IN_CONTROL' | 'WARNING' | 'OUT_OF_CONTROL'): string {
    const colors = {
      'IN_CONTROL': 'bg-green-100 text-green-700',
      'WARNING': 'bg-yellow-100 text-yellow-700',
      'OUT_OF_CONTROL': 'bg-red-100 text-red-700'
    };
    return colors[status];
  }

  /**
   * Get capability status color
   */
  static getCapabilityStatusColor(status: ProcessCapability['status']): string {
    const colors: Record<ProcessCapability['status'], string> = {
      'EXCELLENT': 'bg-green-100 text-green-700',
      'GOOD': 'bg-blue-100 text-blue-700',
      'ACCEPTABLE': 'bg-yellow-100 text-yellow-700',
      'POOR': 'bg-orange-100 text-orange-700',
      'UNACCEPTABLE': 'bg-red-100 text-red-700'
    };
    return colors[status];
  }

  /**
   * Get severity color
   */
  static getSeverityColor(severity: AlertSeverity): string {
    const colors: Record<AlertSeverity, string> = {
      'INFO': 'bg-blue-100 text-blue-700',
      'WARNING': 'bg-yellow-100 text-yellow-700',
      'CRITICAL': 'bg-red-100 text-red-700'
    };
    return colors[severity];
  }

  /**
   * Format number for display
   */
  static formatNumber(value: number, decimals: number = 3): string {
    return value.toFixed(decimals);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default SPCEngine;
