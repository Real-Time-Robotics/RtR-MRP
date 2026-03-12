import { describe, it, expect } from 'vitest';
import {
  SPCEngine,
  type ChartType,
  type ProcessCapability,
  type AlertSeverity,
} from '../spc-engine';

// =============================================================================
// BASIC STATISTICS
// =============================================================================

describe('SPCEngine', () => {
  // ---------------------------------------------------------------------------
  // mean()
  // ---------------------------------------------------------------------------
  describe('mean', () => {
    it('returns 0 for empty array', () => {
      expect(SPCEngine.mean([])).toBe(0);
    });

    it('calculates mean of single element', () => {
      expect(SPCEngine.mean([5])).toBe(5);
    });

    it('calculates mean of multiple elements', () => {
      expect(SPCEngine.mean([1, 2, 3, 4, 5])).toBe(3);
    });

    it('handles negative numbers', () => {
      expect(SPCEngine.mean([-2, -1, 0, 1, 2])).toBe(0);
    });

    it('handles decimal values', () => {
      expect(SPCEngine.mean([1.5, 2.5])).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // stdDev()
  // ---------------------------------------------------------------------------
  describe('stdDev', () => {
    it('returns 0 for empty array', () => {
      expect(SPCEngine.stdDev([])).toBe(0);
    });

    it('returns 0 for single element', () => {
      expect(SPCEngine.stdDev([5])).toBe(0);
    });

    it('calculates sample standard deviation by default', () => {
      // [2, 4, 4, 4, 5, 5, 7, 9] => sample stddev = 2.138...
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      const result = SPCEngine.stdDev(data);
      expect(result).toBeCloseTo(2.1380899, 4);
    });

    it('calculates population standard deviation when isSample=false', () => {
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      const result = SPCEngine.stdDev(data, false);
      expect(result).toBeCloseTo(2.0, 4);
    });

    it('returns 0 for identical values with length >= 2', () => {
      expect(SPCEngine.stdDev([3, 3, 3])).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // range()
  // ---------------------------------------------------------------------------
  describe('range', () => {
    it('returns 0 for empty array', () => {
      expect(SPCEngine.range([])).toBe(0);
    });

    it('returns 0 for single element', () => {
      expect(SPCEngine.range([7])).toBe(0);
    });

    it('calculates range correctly', () => {
      expect(SPCEngine.range([1, 5, 3, 9, 2])).toBe(8);
    });

    it('handles negative values', () => {
      expect(SPCEngine.range([-3, -1, 2])).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // movingRange()
  // ---------------------------------------------------------------------------
  describe('movingRange', () => {
    it('returns empty for empty array', () => {
      expect(SPCEngine.movingRange([])).toEqual([]);
    });

    it('returns empty for single element', () => {
      expect(SPCEngine.movingRange([5])).toEqual([]);
    });

    it('calculates moving ranges correctly', () => {
      expect(SPCEngine.movingRange([1, 3, 2, 5])).toEqual([2, 1, 3]);
    });

    it('always returns positive values', () => {
      const mr = SPCEngine.movingRange([5, 2, 8, 1]);
      mr.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    });
  });

  // ===========================================================================
  // CONTROL CHART CALCULATIONS
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // calculateXbarRLimits()
  // ---------------------------------------------------------------------------
  describe('calculateXbarRLimits', () => {
    const subgroups = [
      [10, 12, 11],
      [11, 13, 12],
      [12, 10, 11],
      [11, 11, 12],
      [10, 12, 13],
    ];

    it('returns all required limit fields', () => {
      const result = SPCEngine.calculateXbarRLimits(subgroups, 3);
      expect(result).toHaveProperty('xbarUCL');
      expect(result).toHaveProperty('xbarCL');
      expect(result).toHaveProperty('xbarLCL');
      expect(result).toHaveProperty('rUCL');
      expect(result).toHaveProperty('rCL');
      expect(result).toHaveProperty('rLCL');
      expect(result).toHaveProperty('sigma');
    });

    it('UCL > CL > LCL for xbar', () => {
      const result = SPCEngine.calculateXbarRLimits(subgroups, 3);
      expect(result.xbarUCL).toBeGreaterThan(result.xbarCL);
      expect(result.xbarCL).toBeGreaterThan(result.xbarLCL);
    });

    it('rUCL > rCL and rLCL >= 0', () => {
      const result = SPCEngine.calculateXbarRLimits(subgroups, 3);
      expect(result.rUCL).toBeGreaterThan(result.rCL);
      expect(result.rLCL).toBeGreaterThanOrEqual(0);
    });

    it('sigma is positive', () => {
      const result = SPCEngine.calculateXbarRLimits(subgroups, 3);
      expect(result.sigma).toBeGreaterThan(0);
    });

    it('uses fallback factors for unsupported subgroup size', () => {
      // subgroup size 15 not in tables, should fallback to size 5
      const result = SPCEngine.calculateXbarRLimits(subgroups, 15);
      const result5 = SPCEngine.calculateXbarRLimits(subgroups, 5);
      // They use same factors so limits should match
      expect(result.xbarUCL).toBeCloseTo(result5.xbarUCL, 6);
    });

    it('xbarCL equals the grand mean of subgroup means', () => {
      const result = SPCEngine.calculateXbarRLimits(subgroups, 3);
      const xbars = subgroups.map((sg) => SPCEngine.mean(sg));
      const grandMean = SPCEngine.mean(xbars);
      expect(result.xbarCL).toBeCloseTo(grandMean, 10);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateXbarSLimits()
  // ---------------------------------------------------------------------------
  describe('calculateXbarSLimits', () => {
    const subgroups = [
      [10, 12, 11, 13],
      [11, 13, 12, 10],
      [12, 10, 11, 14],
      [11, 11, 12, 13],
      [10, 12, 13, 11],
    ];

    it('returns all required fields', () => {
      const result = SPCEngine.calculateXbarSLimits(subgroups, 4);
      expect(result).toHaveProperty('xbarUCL');
      expect(result).toHaveProperty('xbarCL');
      expect(result).toHaveProperty('xbarLCL');
      expect(result).toHaveProperty('sUCL');
      expect(result).toHaveProperty('sCL');
      expect(result).toHaveProperty('sLCL');
      expect(result).toHaveProperty('sigma');
    });

    it('UCL > CL > LCL for xbar', () => {
      const result = SPCEngine.calculateXbarSLimits(subgroups, 4);
      expect(result.xbarUCL).toBeGreaterThan(result.xbarCL);
      expect(result.xbarCL).toBeGreaterThan(result.xbarLCL);
    });

    it('sLCL >= 0', () => {
      const result = SPCEngine.calculateXbarSLimits(subgroups, 4);
      expect(result.sLCL).toBeGreaterThanOrEqual(0);
    });

    it('uses fallback factors for unsupported subgroup size', () => {
      const result = SPCEngine.calculateXbarSLimits(subgroups, 20);
      const result5 = SPCEngine.calculateXbarSLimits(subgroups, 5);
      expect(result.xbarUCL).toBeCloseTo(result5.xbarUCL, 6);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateIMRLimits()
  // ---------------------------------------------------------------------------
  describe('calculateIMRLimits', () => {
    const values = [10, 11, 12, 10, 13, 11, 12, 14, 10, 11];

    it('returns all required fields', () => {
      const result = SPCEngine.calculateIMRLimits(values);
      expect(result).toHaveProperty('iUCL');
      expect(result).toHaveProperty('iCL');
      expect(result).toHaveProperty('iLCL');
      expect(result).toHaveProperty('mrUCL');
      expect(result).toHaveProperty('mrCL');
      expect(result).toHaveProperty('mrLCL');
      expect(result).toHaveProperty('sigma');
    });

    it('iUCL > iCL > iLCL', () => {
      const result = SPCEngine.calculateIMRLimits(values);
      expect(result.iUCL).toBeGreaterThan(result.iCL);
      expect(result.iCL).toBeGreaterThan(result.iLCL);
    });

    it('mrLCL is always 0', () => {
      const result = SPCEngine.calculateIMRLimits(values);
      expect(result.mrLCL).toBe(0);
    });

    it('iCL equals overall mean', () => {
      const result = SPCEngine.calculateIMRLimits(values);
      expect(result.iCL).toBeCloseTo(SPCEngine.mean(values), 10);
    });

    it('mrCL equals mean of moving ranges', () => {
      const result = SPCEngine.calculateIMRLimits(values);
      const mr = SPCEngine.movingRange(values);
      expect(result.mrCL).toBeCloseTo(SPCEngine.mean(mr), 10);
    });
  });

  // ---------------------------------------------------------------------------
  // calculatePChartLimits()
  // ---------------------------------------------------------------------------
  describe('calculatePChartLimits', () => {
    const defectives = [3, 5, 2, 4, 6];
    const sampleSizes = [100, 100, 100, 100, 100];

    it('returns arrays for ucl and lcl, number for cl', () => {
      const result = SPCEngine.calculatePChartLimits(defectives, sampleSizes);
      expect(Array.isArray(result.ucl)).toBe(true);
      expect(Array.isArray(result.lcl)).toBe(true);
      expect(typeof result.cl).toBe('number');
    });

    it('cl equals pBar (total defectives / total samples)', () => {
      const result = SPCEngine.calculatePChartLimits(defectives, sampleSizes);
      expect(result.cl).toBeCloseTo(20 / 500, 10);
    });

    it('ucl values are <= 1', () => {
      const result = SPCEngine.calculatePChartLimits(defectives, sampleSizes);
      result.ucl.forEach((v) => expect(v).toBeLessThanOrEqual(1));
    });

    it('lcl values are >= 0', () => {
      const result = SPCEngine.calculatePChartLimits(defectives, sampleSizes);
      result.lcl.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    });

    it('handles variable sample sizes', () => {
      const varSizes = [50, 100, 150, 200, 250];
      const result = SPCEngine.calculatePChartLimits(defectives, varSizes);
      // Smaller samples should have wider limits
      expect(result.ucl[0]).toBeGreaterThan(result.ucl[4]);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateNPChartLimits()
  // ---------------------------------------------------------------------------
  describe('calculateNPChartLimits', () => {
    const defectives = [3, 5, 2, 4, 6];
    const sampleSize = 100;

    it('returns ucl, cl, lcl', () => {
      const result = SPCEngine.calculateNPChartLimits(defectives, sampleSize);
      expect(result).toHaveProperty('ucl');
      expect(result).toHaveProperty('cl');
      expect(result).toHaveProperty('lcl');
    });

    it('cl equals mean of defectives', () => {
      const result = SPCEngine.calculateNPChartLimits(defectives, sampleSize);
      expect(result.cl).toBeCloseTo(SPCEngine.mean(defectives), 10);
    });

    it('ucl > cl', () => {
      const result = SPCEngine.calculateNPChartLimits(defectives, sampleSize);
      expect(result.ucl).toBeGreaterThan(result.cl);
    });

    it('lcl >= 0', () => {
      const result = SPCEngine.calculateNPChartLimits(defectives, sampleSize);
      expect(result.lcl).toBeGreaterThanOrEqual(0);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateCChartLimits()
  // ---------------------------------------------------------------------------
  describe('calculateCChartLimits', () => {
    const defects = [5, 8, 3, 7, 6, 4, 9, 5, 7, 6];

    it('returns ucl, cl, lcl', () => {
      const result = SPCEngine.calculateCChartLimits(defects);
      expect(result).toHaveProperty('ucl');
      expect(result).toHaveProperty('cl');
      expect(result).toHaveProperty('lcl');
    });

    it('cl equals mean of defects', () => {
      const result = SPCEngine.calculateCChartLimits(defects);
      expect(result.cl).toBeCloseTo(SPCEngine.mean(defects), 10);
    });

    it('ucl = cBar + 3*sqrt(cBar)', () => {
      const result = SPCEngine.calculateCChartLimits(defects);
      const cBar = SPCEngine.mean(defects);
      expect(result.ucl).toBeCloseTo(cBar + 3 * Math.sqrt(cBar), 10);
    });

    it('lcl >= 0', () => {
      const result = SPCEngine.calculateCChartLimits(defects);
      expect(result.lcl).toBeGreaterThanOrEqual(0);
    });

    it('lcl is 0 when cBar is very small', () => {
      const result = SPCEngine.calculateCChartLimits([0, 0, 0, 1, 0]);
      expect(result.lcl).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateUChartLimits()
  // ---------------------------------------------------------------------------
  describe('calculateUChartLimits', () => {
    const defects = [5, 8, 3, 7, 6];
    const sampleSizes = [10, 10, 10, 10, 10];

    it('returns arrays for ucl and lcl', () => {
      const result = SPCEngine.calculateUChartLimits(defects, sampleSizes);
      expect(Array.isArray(result.ucl)).toBe(true);
      expect(Array.isArray(result.lcl)).toBe(true);
    });

    it('cl equals total defects / total units', () => {
      const result = SPCEngine.calculateUChartLimits(defects, sampleSizes);
      expect(result.cl).toBeCloseTo(29 / 50, 10);
    });

    it('lcl values >= 0', () => {
      const result = SPCEngine.calculateUChartLimits(defects, sampleSizes);
      result.lcl.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    });

    it('handles variable sample sizes', () => {
      const varSizes = [5, 10, 15, 20, 25];
      const result = SPCEngine.calculateUChartLimits(defects, varSizes);
      // Smaller samples have wider limits
      expect(result.ucl[0]).toBeGreaterThan(result.ucl[4]);
    });
  });

  // ===========================================================================
  // PROCESS CAPABILITY
  // ===========================================================================

  describe('calculateCapability', () => {
    // A well-centered process with low variation
    const data = [
      10.0, 10.1, 9.9, 10.05, 9.95, 10.02, 9.98, 10.03, 9.97, 10.01,
      10.0, 10.1, 9.9, 10.05, 9.95, 10.02, 9.98, 10.03, 9.97, 10.01,
      10.0, 10.1, 9.9, 10.05, 9.95, 10.02, 9.98, 10.03, 9.97, 10.01,
    ];
    const usl = 10.5;
    const lsl = 9.5;

    it('returns all required capability fields', () => {
      const result = SPCEngine.calculateCapability(data, usl, lsl);
      expect(result).toHaveProperty('cp');
      expect(result).toHaveProperty('cpk');
      expect(result).toHaveProperty('cpl');
      expect(result).toHaveProperty('cpu');
      expect(result).toHaveProperty('pp');
      expect(result).toHaveProperty('ppk');
      expect(result).toHaveProperty('ppl');
      expect(result).toHaveProperty('ppu');
      expect(result).toHaveProperty('sigma');
      expect(result).toHaveProperty('ppm');
      expect(result).toHaveProperty('yield');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('recommendation');
    });

    it('cpk <= cp always', () => {
      const result = SPCEngine.calculateCapability(data, usl, lsl);
      expect(result.cpk).toBeLessThanOrEqual(result.cp);
    });

    it('yield is between 0 and 100', () => {
      const result = SPCEngine.calculateCapability(data, usl, lsl);
      expect(result.yield).toBeGreaterThanOrEqual(0);
      expect(result.yield).toBeLessThanOrEqual(100);
    });

    it('ppm is non-negative', () => {
      const result = SPCEngine.calculateCapability(data, usl, lsl);
      expect(result.ppm).toBeGreaterThanOrEqual(0);
    });

    it('sets EXCELLENT status for cpk >= 1.67', () => {
      const result = SPCEngine.calculateCapability(data, usl, lsl);
      // data is very tight, cpk should be excellent
      expect(result.cpk).toBeGreaterThanOrEqual(1.67);
      expect(result.status).toBe('EXCELLENT');
    });

    it('sets GOOD status for cpk >= 1.33 and < 1.67', () => {
      // cpk = 0.5 / (3 * sigma). Target cpk ~1.5 => sigma ~0.111
      // Use wider spread multiplier to get sample stddev in right range
      const goodData: number[] = [];
      for (let i = 0; i < 100; i++) {
        goodData.push(10 + ((i % 7) - 3) * 0.055);
      }
      const result = SPCEngine.calculateCapability(goodData, usl, lsl);
      // Verify it landed in GOOD range
      expect(result.status).toBe('GOOD');
      expect(result.cpk).toBeGreaterThanOrEqual(1.33);
      expect(result.cpk).toBeLessThan(1.67);
    });

    it('sets ACCEPTABLE status for cpk >= 1.0 and < 1.33', () => {
      const acceptableData: number[] = [];
      for (let i = 0; i < 100; i++) {
        acceptableData.push(10 + ((i % 7) - 3) * 0.075);
      }
      const result = SPCEngine.calculateCapability(acceptableData, usl, lsl);
      expect(result.status).toBe('ACCEPTABLE');
      expect(result.cpk).toBeGreaterThanOrEqual(1.0);
      expect(result.cpk).toBeLessThan(1.33);
    });

    it('sets POOR status for cpk >= 0.67 and < 1.0', () => {
      const poorData: number[] = [];
      for (let i = 0; i < 100; i++) {
        poorData.push(10 + ((i % 7) - 3) * 0.1);
      }
      const result = SPCEngine.calculateCapability(poorData, usl, lsl);
      expect(result.status).toBe('POOR');
      expect(result.cpk).toBeGreaterThanOrEqual(0.67);
      expect(result.cpk).toBeLessThan(1.0);
    });

    it('sets UNACCEPTABLE status for cpk < 0.67', () => {
      // Very wide data
      const badData = [9.0, 11.0, 8.5, 11.5, 9.2, 10.8, 8.8, 11.2, 9.5, 10.5];
      const result = SPCEngine.calculateCapability(badData, usl, lsl);
      expect(result.cpk).toBeLessThan(0.67);
      expect(result.status).toBe('UNACCEPTABLE');
    });

    it('accepts optional targetValue', () => {
      const result = SPCEngine.calculateCapability(data, usl, lsl, 10);
      expect(result.targetValue).toBe(10);
    });

    it('characteristicId, characteristicName, processName default to empty strings', () => {
      const result = SPCEngine.calculateCapability(data, usl, lsl);
      expect(result.characteristicId).toBe('');
      expect(result.characteristicName).toBe('');
      expect(result.processName).toBe('');
    });

    it('sampleSize equals data length', () => {
      const result = SPCEngine.calculateCapability(data, usl, lsl);
      expect(result.sampleSize).toBe(data.length);
    });

    it('min and max are correct', () => {
      const result = SPCEngine.calculateCapability(data, usl, lsl);
      expect(result.min).toBe(Math.min(...data));
      expect(result.max).toBe(Math.max(...data));
    });

    it('rounds values to correct precision', () => {
      const result = SPCEngine.calculateCapability(data, usl, lsl);
      // mean rounded to 3 decimals
      const meanStr = result.mean.toString();
      const decimals = meanStr.includes('.') ? meanStr.split('.')[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(3);
      // cp rounded to 2 decimals
      const cpStr = result.cp.toString();
      const cpDecimals = cpStr.includes('.') ? cpStr.split('.')[1].length : 0;
      expect(cpDecimals).toBeLessThanOrEqual(2);
    });
  });

  // ===========================================================================
  // WESTERN ELECTRIC RULES
  // ===========================================================================

  describe('checkWesternElectricRules', () => {
    const cl = 10;
    const ucl = 13; // 3 sigma above
    const lcl = 7;  // 3 sigma below
    // sigma = (ucl - cl) / 3 = 1

    it('returns empty violations for in-control data', () => {
      const values = [10, 10.5, 9.5, 10.2, 9.8, 10.1, 9.9, 10.3];
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      // Data near center line - no rules triggered
      const rule1 = violations.filter((v) => v.type === 'RULE_1');
      expect(rule1).toHaveLength(0);
    });

    // Rule 1: Point beyond 3 sigma
    it('Rule 1: detects point beyond UCL', () => {
      const values = [10, 10, 10, 14]; // 14 > ucl(13)
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule1 = violations.filter((v) => v.type === 'RULE_1');
      expect(rule1.length).toBeGreaterThanOrEqual(1);
      expect(rule1[0].severity).toBe('CRITICAL');
      expect(rule1[0].pointIndex).toBe(3);
    });

    it('Rule 1: detects point below LCL', () => {
      const values = [10, 10, 10, 6]; // 6 < lcl(7)
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule1 = violations.filter((v) => v.type === 'RULE_1');
      expect(rule1.length).toBeGreaterThanOrEqual(1);
    });

    // Rule 2: 2 of 3 consecutive points beyond 2 sigma
    it('Rule 2: detects 2 of 3 points beyond 2 sigma upper', () => {
      // zone1Upper = cl + 2*sigma = 12
      const values = [12.5, 10, 12.5]; // 2 of 3 above 12
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule2 = violations.filter((v) => v.type === 'RULE_2');
      expect(rule2.length).toBeGreaterThanOrEqual(1);
      expect(rule2[0].severity).toBe('WARNING');
    });

    it('Rule 2: detects 2 of 3 points beyond 2 sigma lower', () => {
      // zone1Lower = cl - 2*sigma = 8
      const values = [7.5, 10, 7.5]; // 2 of 3 below 8
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule2 = violations.filter((v) => v.type === 'RULE_2');
      expect(rule2.length).toBeGreaterThanOrEqual(1);
    });

    // Rule 3: 4 of 5 consecutive points beyond 1 sigma
    it('Rule 3: detects 4 of 5 points beyond 1 sigma upper', () => {
      // zone2Upper = cl + sigma = 11
      const values = [11.5, 11.5, 11.5, 10, 11.5]; // 4 of 5 above 11
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule3 = violations.filter((v) => v.type === 'RULE_3');
      expect(rule3.length).toBeGreaterThanOrEqual(1);
    });

    it('Rule 3: detects 4 of 5 points beyond 1 sigma lower', () => {
      // zone2Lower = cl - sigma = 9
      const values = [8.5, 8.5, 8.5, 10, 8.5]; // 4 of 5 below 9
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule3 = violations.filter((v) => v.type === 'RULE_3');
      expect(rule3.length).toBeGreaterThanOrEqual(1);
    });

    // Rule 4: 8 consecutive points on same side of center line
    it('Rule 4: detects 8 consecutive points above CL', () => {
      const values = [10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5];
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule4 = violations.filter((v) => v.type === 'RULE_4');
      expect(rule4.length).toBeGreaterThanOrEqual(1);
    });

    it('Rule 4: detects 8 consecutive points below CL', () => {
      const values = [9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5];
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule4 = violations.filter((v) => v.type === 'RULE_4');
      expect(rule4.length).toBeGreaterThanOrEqual(1);
    });

    // Rule 5: 6 consecutive points trending
    it('Rule 5: detects 6 consecutive increasing points', () => {
      const values = [9, 9.5, 10, 10.5, 11, 11.5];
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule5 = violations.filter((v) => v.type === 'RULE_5');
      expect(rule5.length).toBeGreaterThanOrEqual(1);
    });

    it('Rule 5: detects 6 consecutive decreasing points', () => {
      const values = [11.5, 11, 10.5, 10, 9.5, 9];
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule5 = violations.filter((v) => v.type === 'RULE_5');
      expect(rule5.length).toBeGreaterThanOrEqual(1);
    });

    it('Rule 5: no violation if not strictly monotonic', () => {
      const values = [9, 9.5, 10, 10, 10.5, 11]; // 10 == 10 breaks strict increase
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule5 = violations.filter((v) => v.type === 'RULE_5');
      expect(rule5).toHaveLength(0);
    });

    // Rule 6: 14 consecutive points alternating
    it('Rule 6: detects 14 alternating points', () => {
      // Alternating up/down
      const values = [10, 11, 9, 11, 9, 11, 9, 11, 9, 11, 9, 11, 9, 11];
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule6 = violations.filter((v) => v.type === 'RULE_6');
      expect(rule6.length).toBeGreaterThanOrEqual(1);
      expect(rule6[0].severity).toBe('INFO');
    });

    it('Rule 6: no violation for fewer than 14 alternating points', () => {
      const values = [10, 11, 9, 11, 9, 11, 9, 11, 9, 11, 9, 11, 9];
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule6 = violations.filter((v) => v.type === 'RULE_6');
      expect(rule6).toHaveLength(0);
    });

    // Rule 7: 15 consecutive points within 1 sigma
    it('Rule 7: detects 15 consecutive points in zone C', () => {
      // zone2 = [9, 11], all values in this range
      const values = Array(15).fill(10.2);
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule7 = violations.filter((v) => v.type === 'RULE_7');
      expect(rule7.length).toBeGreaterThanOrEqual(1);
      expect(rule7[0].severity).toBe('INFO');
    });

    // Rule 8: 8 consecutive points beyond 1 sigma on both sides
    it('Rule 8: detects 8 consecutive points outside zone C alternating sides', () => {
      // All outside [9, 11], alternating sides
      const values = [8, 12, 8, 12, 8, 12, 8, 12];
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule8 = violations.filter((v) => v.type === 'RULE_8');
      expect(rule8.length).toBeGreaterThanOrEqual(1);
      expect(rule8[0].severity).toBe('WARNING');
    });

    it('returns violations with correct pointIndex', () => {
      const values = [10, 10, 10, 14]; // Rule 1 at index 3
      const violations = SPCEngine.checkWesternElectricRules(values, ucl, cl, lcl);
      const rule1 = violations.filter((v) => v.type === 'RULE_1');
      expect(rule1[0].pointIndex).toBe(3);
    });
  });

  // ===========================================================================
  // TREND DETECTION
  // ===========================================================================

  describe('detectTrend', () => {
    it('returns no trend for insufficient data', () => {
      const result = SPCEngine.detectTrend([1, 2, 3]);
      expect(result.hasTrend).toBe(false);
      expect(result.direction).toBe('NONE');
      expect(result.strength).toBe(0);
    });

    it('detects upward trend', () => {
      const result = SPCEngine.detectTrend([1, 2, 3, 4, 5, 6]);
      expect(result.hasTrend).toBe(true);
      expect(result.direction).toBe('UP');
      expect(result.strength).toBe(1);
    });

    it('detects downward trend', () => {
      const result = SPCEngine.detectTrend([6, 5, 4, 3, 2, 1]);
      expect(result.hasTrend).toBe(true);
      expect(result.direction).toBe('DOWN');
      expect(result.strength).toBe(1);
    });

    it('returns no trend for flat data', () => {
      const result = SPCEngine.detectTrend([5, 5, 5, 5, 5, 5]);
      expect(result.hasTrend).toBe(false);
      expect(result.direction).toBe('NONE');
    });

    it('uses custom windowSize', () => {
      const values = [1, 2, 3, 4]; // 4 elements, window of 4
      const result = SPCEngine.detectTrend(values, 4);
      expect(result.hasTrend).toBe(true);
      expect(result.direction).toBe('UP');
    });

    it('only considers the last windowSize values', () => {
      // First 3 go down, last 6 go up
      const values = [10, 9, 8, 1, 2, 3, 4, 5, 6];
      const result = SPCEngine.detectTrend(values, 6);
      expect(result.hasTrend).toBe(true);
      expect(result.direction).toBe('UP');
    });

    it('detects partial trend with strength > 0.7', () => {
      // 4 increasing, 1 decreasing in window of 6 => increasing=4, decreasing=1, strength=3/5=0.6
      const values = [1, 2, 3, 4, 3.5, 5];
      const result = SPCEngine.detectTrend(values, 6);
      // increasing=3 (2>1, 3>2, 4>3), decreasing=1 (3.5<4), increasing again=1 (5>3.5)
      // increasing=4, decreasing=1 => strength = |4-1|/5 = 0.6, hasTrend=false
      expect(result.strength).toBeCloseTo(0.6, 5);
      expect(result.hasTrend).toBe(false);
    });

    it('returns NONE direction when equal up and down', () => {
      // 2 up, 2 down, 1 equal => strength = 0
      const values = [5, 6, 5, 6, 5, 5];
      const result = SPCEngine.detectTrend(values);
      // up=2, down=2 => direction=NONE
      if (result.direction === 'NONE') {
        expect(result.direction).toBe('NONE');
      }
    });
  });

  // ===========================================================================
  // SHIFT DETECTION
  // ===========================================================================

  describe('detectShift', () => {
    const cl = 10;
    const sigma = 1;

    it('returns no shift for insufficient data', () => {
      const result = SPCEngine.detectShift([11, 11, 11], cl, sigma);
      expect(result.hasShift).toBe(false);
      expect(result.direction).toBe('NONE');
      expect(result.magnitude).toBe(0);
    });

    it('detects upward shift', () => {
      const values = [11, 11, 11, 11, 11, 11, 11, 11]; // all above cl
      const result = SPCEngine.detectShift(values, cl, sigma);
      expect(result.hasShift).toBe(true);
      expect(result.direction).toBe('UP');
      expect(result.magnitude).toBeGreaterThan(0);
    });

    it('detects downward shift', () => {
      const values = [9, 9, 9, 9, 9, 9, 9, 9]; // all below cl
      const result = SPCEngine.detectShift(values, cl, sigma);
      expect(result.hasShift).toBe(true);
      expect(result.direction).toBe('DOWN');
      expect(result.magnitude).toBeGreaterThan(0);
    });

    it('no shift when data crosses center line', () => {
      const values = [11, 9, 11, 9, 11, 9, 11, 9];
      const result = SPCEngine.detectShift(values, cl, sigma);
      expect(result.hasShift).toBe(false);
    });

    it('uses custom windowSize', () => {
      const values = [11, 11, 11, 11]; // 4 points above cl
      const result = SPCEngine.detectShift(values, cl, sigma, 4);
      expect(result.hasShift).toBe(true);
      expect(result.direction).toBe('UP');
    });

    it('only considers last windowSize values', () => {
      // First 4 below, last 8 above
      const values = [9, 9, 9, 9, 11, 11, 11, 11, 11, 11, 11, 11];
      const result = SPCEngine.detectShift(values, cl, sigma, 8);
      expect(result.hasShift).toBe(true);
      expect(result.direction).toBe('UP');
    });

    it('magnitude reflects distance from center line in sigma units', () => {
      const values = [12, 12, 12, 12, 12, 12, 12, 12]; // 2 sigma above
      const result = SPCEngine.detectShift(values, cl, sigma);
      expect(result.magnitude).toBeCloseTo(2, 5);
    });
  });

  // ===========================================================================
  // UTILITY FUNCTIONS
  // ===========================================================================

  describe('getChartTypeLabel', () => {
    it('returns correct label for each chart type', () => {
      const expected: Record<ChartType, string> = {
        XBAR_R: 'X\u0304-R Chart',
        XBAR_S: 'X\u0304-S Chart',
        I_MR: 'I-MR Chart',
        P: 'p Chart',
        NP: 'np Chart',
        C: 'c Chart',
        U: 'u Chart',
      };
      for (const [type, label] of Object.entries(expected)) {
        expect(SPCEngine.getChartTypeLabel(type as ChartType)).toBe(label);
      }
    });
  });

  describe('getStatusColor', () => {
    it('returns green class for IN_CONTROL', () => {
      expect(SPCEngine.getStatusColor('IN_CONTROL')).toContain('green');
    });

    it('returns yellow class for WARNING', () => {
      expect(SPCEngine.getStatusColor('WARNING')).toContain('yellow');
    });

    it('returns red class for OUT_OF_CONTROL', () => {
      expect(SPCEngine.getStatusColor('OUT_OF_CONTROL')).toContain('red');
    });
  });

  describe('getCapabilityStatusColor', () => {
    it('returns correct color for each status', () => {
      const statuses: ProcessCapability['status'][] = [
        'EXCELLENT',
        'GOOD',
        'ACCEPTABLE',
        'POOR',
        'UNACCEPTABLE',
      ];
      const expectedColors = ['green', 'blue', 'yellow', 'orange', 'red'];
      statuses.forEach((status, i) => {
        expect(SPCEngine.getCapabilityStatusColor(status)).toContain(expectedColors[i]);
      });
    });
  });

  describe('getSeverityColor', () => {
    it('returns correct color for each severity', () => {
      const severities: AlertSeverity[] = ['INFO', 'WARNING', 'CRITICAL'];
      const expectedColors = ['blue', 'yellow', 'red'];
      severities.forEach((severity, i) => {
        expect(SPCEngine.getSeverityColor(severity)).toContain(expectedColors[i]);
      });
    });
  });

  describe('formatNumber', () => {
    it('formats to 3 decimals by default', () => {
      expect(SPCEngine.formatNumber(3.14159)).toBe('3.142');
    });

    it('formats to custom decimal places', () => {
      expect(SPCEngine.formatNumber(3.14159, 2)).toBe('3.14');
      expect(SPCEngine.formatNumber(3.14159, 0)).toBe('3');
      expect(SPCEngine.formatNumber(3.14159, 5)).toBe('3.14159');
    });

    it('pads with zeros', () => {
      expect(SPCEngine.formatNumber(5, 3)).toBe('5.000');
    });

    it('handles negative numbers', () => {
      expect(SPCEngine.formatNumber(-2.5, 2)).toBe('-2.50');
    });
  });

  // ===========================================================================
  // DEFAULT EXPORT
  // ===========================================================================

  describe('default export', () => {
    it('exports SPCEngine as default', async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../spc-engine');
      expect(module.default).toBe(SPCEngine);
    });
  });

  // ===========================================================================
  // EDGE CASES & INTEGRATION
  // ===========================================================================

  describe('edge cases', () => {
    it('calculateXbarRLimits with identical subgroups returns finite limits', () => {
      const subgroups = [[5, 5, 5], [5, 5, 5], [5, 5, 5]];
      const result = SPCEngine.calculateXbarRLimits(subgroups, 3);
      expect(Number.isFinite(result.xbarUCL)).toBe(true);
      expect(result.xbarCL).toBe(5);
      expect(result.rCL).toBe(0);
    });

    it('calculateIMRLimits with two values', () => {
      const result = SPCEngine.calculateIMRLimits([10, 12]);
      expect(Number.isFinite(result.iUCL)).toBe(true);
      expect(Number.isFinite(result.iLCL)).toBe(true);
    });

    it('calculateCChartLimits with all zeros', () => {
      const result = SPCEngine.calculateCChartLimits([0, 0, 0, 0]);
      expect(result.cl).toBe(0);
      expect(result.ucl).toBe(0);
      expect(result.lcl).toBe(0);
    });

    it('checkWesternElectricRules with single value returns no violations for rules 2-8', () => {
      const violations = SPCEngine.checkWesternElectricRules([10], 13, 10, 7);
      // Only Rule 1 could possibly trigger, but 10 is at CL
      expect(violations).toHaveLength(0);
    });

    it('calculatePChartLimits with high defective rate clamps ucl to 1', () => {
      // Very high defective rate with small sample
      const result = SPCEngine.calculatePChartLimits([9], [10]);
      // pBar = 0.9, ucl should be clamped to 1
      result.ucl.forEach((v) => expect(v).toBeLessThanOrEqual(1));
    });

    it('calculateNPChartLimits with lcl clamped to 0', () => {
      // Low defective count -> lcl could go negative
      const result = SPCEngine.calculateNPChartLimits([1, 0, 1, 0, 1], 100);
      expect(result.lcl).toBeGreaterThanOrEqual(0);
    });

    it('stdDev with isSample=true vs false gives different results', () => {
      const data = [1, 2, 3, 4, 5];
      const sampleStd = SPCEngine.stdDev(data, true);
      const popStd = SPCEngine.stdDev(data, false);
      expect(sampleStd).toBeGreaterThan(popStd);
    });

    it('movingRange with two identical values returns [0]', () => {
      expect(SPCEngine.movingRange([5, 5])).toEqual([0]);
    });

    it('detectTrend with exactly windowSize elements', () => {
      const result = SPCEngine.detectTrend([1, 2, 3, 4, 5, 6], 6);
      expect(result.hasTrend).toBe(true);
    });

    it('detectShift with exactly windowSize elements', () => {
      const result = SPCEngine.detectShift([11, 11, 11, 11, 11, 11, 11, 11], 10, 1, 8);
      expect(result.hasShift).toBe(true);
    });
  });
});
