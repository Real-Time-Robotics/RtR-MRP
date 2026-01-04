// =============================================================================
// SPC ENGINE UNIT TESTS
// Phase 11: Quality Management
// =============================================================================

import { SPCEngine } from '@/lib/spc/spc-engine';

describe('SPCEngine', () => {
  // ===========================================================================
  // BASIC STATISTICS
  // ===========================================================================

  describe('Basic Statistics', () => {
    describe('mean', () => {
      it('should calculate mean correctly', () => {
        expect(SPCEngine.mean([1, 2, 3, 4, 5])).toBe(3);
        expect(SPCEngine.mean([10, 20, 30])).toBe(20);
      });

      it('should return 0 for empty array', () => {
        expect(SPCEngine.mean([])).toBe(0);
      });

      it('should handle single value', () => {
        expect(SPCEngine.mean([42])).toBe(42);
      });

      it('should handle decimal values', () => {
        expect(SPCEngine.mean([1.5, 2.5, 3.5])).toBeCloseTo(2.5);
      });
    });

    describe('stdDev', () => {
      it('should calculate sample standard deviation correctly', () => {
        const data = [2, 4, 4, 4, 5, 5, 7, 9];
        const result = SPCEngine.stdDev(data);
        expect(result).toBeCloseTo(2.138, 2);
      });

      it('should calculate population standard deviation correctly', () => {
        const data = [2, 4, 4, 4, 5, 5, 7, 9];
        const result = SPCEngine.stdDev(data, false);
        expect(result).toBeCloseTo(2.0, 1);
      });

      it('should return 0 for single value', () => {
        expect(SPCEngine.stdDev([5])).toBe(0);
      });

      it('should return 0 for identical values', () => {
        expect(SPCEngine.stdDev([5, 5, 5, 5])).toBe(0);
      });
    });

    describe('range', () => {
      it('should calculate range correctly', () => {
        expect(SPCEngine.range([1, 5, 3, 9, 2])).toBe(8);
        expect(SPCEngine.range([10, 20, 15])).toBe(10);
      });

      it('should return 0 for single value', () => {
        expect(SPCEngine.range([5])).toBe(0);
      });

      it('should return 0 for empty array', () => {
        expect(SPCEngine.range([])).toBe(0);
      });

      it('should return 0 for identical values', () => {
        expect(SPCEngine.range([5, 5, 5])).toBe(0);
      });
    });

    describe('movingRange', () => {
      it('should calculate moving ranges correctly', () => {
        const data = [10, 12, 8, 15, 11];
        const mr = SPCEngine.movingRange(data);
        expect(mr).toEqual([2, 4, 7, 4]);
      });

      it('should return empty array for single value', () => {
        expect(SPCEngine.movingRange([5])).toEqual([]);
      });

      it('should return empty array for empty input', () => {
        expect(SPCEngine.movingRange([])).toEqual([]);
      });
    });
  });

  // ===========================================================================
  // CONTROL CHART CALCULATIONS
  // ===========================================================================

  describe('Control Chart Calculations', () => {
    describe('calculateXbarRLimits', () => {
      it('should calculate X-bar R limits correctly', () => {
        const subgroups = [
          [25.0, 25.1, 24.9, 25.0, 25.0],
          [25.1, 25.0, 24.9, 25.1, 25.0],
          [24.9, 25.0, 25.1, 25.0, 24.9],
          [25.0, 25.0, 25.0, 25.1, 24.9],
          [25.0, 24.9, 25.1, 25.0, 25.0]
        ];
        
        const limits = SPCEngine.calculateXbarRLimits(subgroups, 5);
        
        expect(limits.xbarCL).toBeCloseTo(25.0, 1);
        expect(limits.xbarUCL).toBeGreaterThan(limits.xbarCL);
        expect(limits.xbarLCL).toBeLessThan(limits.xbarCL);
        expect(limits.rUCL).toBeGreaterThan(limits.rCL);
        expect(limits.rLCL).toBeGreaterThanOrEqual(0);
        expect(limits.sigma).toBeGreaterThan(0);
      });

      it('should handle different subgroup sizes', () => {
        const subgroups3 = [[10, 11, 12], [11, 10, 12], [10, 12, 11]];
        const subgroups5 = [[10, 11, 12, 10, 11], [11, 10, 12, 11, 10], [10, 12, 11, 10, 12]];
        
        const limits3 = SPCEngine.calculateXbarRLimits(subgroups3, 3);
        const limits5 = SPCEngine.calculateXbarRLimits(subgroups5, 5);
        
        expect(limits3.xbarCL).toBeCloseTo(limits5.xbarCL, 0);
        // UCL-LCL range should be different due to different A2 factors
        expect(limits3.xbarUCL - limits3.xbarLCL).not.toEqual(limits5.xbarUCL - limits5.xbarLCL);
      });
    });

    describe('calculateXbarSLimits', () => {
      it('should calculate X-bar S limits correctly', () => {
        const subgroups = [
          [25.0, 25.1, 24.9, 25.0, 25.0],
          [25.1, 25.0, 24.9, 25.1, 25.0],
          [24.9, 25.0, 25.1, 25.0, 24.9],
        ];
        
        const limits = SPCEngine.calculateXbarSLimits(subgroups, 5);
        
        expect(limits.xbarCL).toBeCloseTo(25.0, 1);
        expect(limits.sUCL).toBeGreaterThan(limits.sCL);
        expect(limits.sLCL).toBeGreaterThanOrEqual(0);
      });
    });

    describe('calculateIMRLimits', () => {
      it('should calculate I-MR limits correctly', () => {
        const values = [25.0, 25.1, 24.9, 25.0, 25.2, 24.8, 25.0, 25.1, 24.9, 25.0];
        
        const limits = SPCEngine.calculateIMRLimits(values);
        
        expect(limits.iCL).toBeCloseTo(25.0, 1);
        expect(limits.iUCL).toBeGreaterThan(limits.iCL);
        expect(limits.iLCL).toBeLessThan(limits.iCL);
        expect(limits.mrUCL).toBeGreaterThan(limits.mrCL);
        expect(limits.mrLCL).toBe(0);
      });
    });

    describe('calculatePChartLimits', () => {
      it('should calculate p-chart limits correctly', () => {
        const defectives = [5, 3, 8, 4, 6];
        const sampleSizes = [100, 100, 100, 100, 100];
        
        const limits = SPCEngine.calculatePChartLimits(defectives, sampleSizes);
        
        expect(limits.cl).toBeCloseTo(0.052, 2);
        expect(limits.ucl.length).toBe(5);
        expect(limits.lcl.length).toBe(5);
        expect(limits.ucl[0]).toBeGreaterThan(limits.cl);
        expect(limits.lcl[0]).toBeGreaterThanOrEqual(0);
      });

      it('should handle variable sample sizes', () => {
        const defectives = [5, 3, 8];
        const sampleSizes = [100, 50, 150];
        
        const limits = SPCEngine.calculatePChartLimits(defectives, sampleSizes);
        
        // UCL should be wider for smaller samples
        expect(limits.ucl[1]).toBeGreaterThan(limits.ucl[0]);
        expect(limits.ucl[1]).toBeGreaterThan(limits.ucl[2]);
      });
    });

    describe('calculateNPChartLimits', () => {
      it('should calculate np-chart limits correctly', () => {
        const defectives = [5, 3, 8, 4, 6];
        const sampleSize = 100;
        
        const limits = SPCEngine.calculateNPChartLimits(defectives, sampleSize);
        
        expect(limits.cl).toBe(5.2);
        expect(limits.ucl).toBeGreaterThan(limits.cl);
        expect(limits.lcl).toBeGreaterThanOrEqual(0);
      });
    });

    describe('calculateCChartLimits', () => {
      it('should calculate c-chart limits correctly', () => {
        const defects = [10, 12, 8, 15, 11, 9, 14, 10, 12, 11];
        
        const limits = SPCEngine.calculateCChartLimits(defects);
        
        expect(limits.cl).toBe(11.2);
        expect(limits.ucl).toBeGreaterThan(limits.cl);
        expect(limits.lcl).toBeGreaterThanOrEqual(0);
      });
    });

    describe('calculateUChartLimits', () => {
      it('should calculate u-chart limits correctly', () => {
        const defects = [10, 15, 8];
        const sampleSizes = [5, 5, 5];
        
        const limits = SPCEngine.calculateUChartLimits(defects, sampleSizes);
        
        expect(limits.cl).toBeCloseTo(2.2, 1);
        expect(limits.ucl.length).toBe(3);
        expect(limits.lcl.length).toBe(3);
      });
    });
  });

  // ===========================================================================
  // PROCESS CAPABILITY
  // ===========================================================================

  describe('Process Capability', () => {
    describe('calculateCapability', () => {
      it('should calculate capability indices correctly for capable process', () => {
        // Generate data centered on target with low variation
        const data: number[] = [];
        for (let i = 0; i < 100; i++) {
          data.push(25.0 + (Math.random() - 0.5) * 0.02);
        }
        
        const capability = SPCEngine.calculateCapability(data, 25.05, 24.95);
        
        expect(capability.cp).toBeGreaterThan(1);
        expect(capability.cpk).toBeGreaterThan(1);
        expect(capability.mean).toBeCloseTo(25, 1);
      });

      it('should calculate low capability for high variation process', () => {
        // Generate data with high variation
        const data: number[] = [];
        for (let i = 0; i < 100; i++) {
          data.push(25.0 + (Math.random() - 0.5) * 0.2);
        }
        
        const capability = SPCEngine.calculateCapability(data, 25.05, 24.95);
        
        expect(capability.cp).toBeLessThan(1);
        expect(capability.cpk).toBeLessThan(1);
      });

      it('should detect off-center process', () => {
        // Generate data centered off-target
        const data: number[] = [];
        for (let i = 0; i < 100; i++) {
          data.push(25.03 + (Math.random() - 0.5) * 0.02);
        }
        
        const capability = SPCEngine.calculateCapability(data, 25.05, 24.95);
        
        // Cp should be high (potential capability)
        // But Cpk should be lower (actual capability due to off-center)
        expect(capability.cpk).toBeLessThan(capability.cp);
      });

      it('should return correct status based on Cpk', () => {
        const excellentData = Array.from({ length: 100 }, () => 25 + (Math.random() - 0.5) * 0.01);
        const poorData = Array.from({ length: 100 }, () => 25 + (Math.random() - 0.5) * 0.1);
        
        const excellent = SPCEngine.calculateCapability(excellentData, 25.05, 24.95);
        const poor = SPCEngine.calculateCapability(poorData, 25.05, 24.95);
        
        expect(['EXCELLENT', 'GOOD']).toContain(excellent.status);
        expect(['POOR', 'UNACCEPTABLE']).toContain(poor.status);
      });

      it('should calculate PPM correctly', () => {
        const capability = SPCEngine.calculateCapability(
          Array.from({ length: 100 }, (_, i) => 25 + (i % 2 === 0 ? 0.01 : -0.01)),
          25.05,
          24.95
        );
        
        expect(capability.ppm).toBeGreaterThanOrEqual(0);
        expect(capability.ppm).toBeLessThanOrEqual(1000000);
      });

      it('should calculate yield correctly', () => {
        const capability = SPCEngine.calculateCapability(
          Array.from({ length: 100 }, () => 25),
          25.05,
          24.95
        );
        
        expect(capability.yield).toBeGreaterThanOrEqual(0);
        expect(capability.yield).toBeLessThanOrEqual(100);
      });
    });
  });

  // ===========================================================================
  // WESTERN ELECTRIC RULES
  // ===========================================================================

  describe('Western Electric Rules', () => {
    describe('checkWesternElectricRules', () => {
      it('should detect Rule 1: Point beyond 3 sigma', () => {
        const values = [50, 50, 50, 50, 70, 50, 50];
        const violations = SPCEngine.checkWesternElectricRules(values, 55, 50, 45);
        
        const rule1Violations = violations.filter(v => v.type === 'RULE_1');
        expect(rule1Violations.length).toBeGreaterThan(0);
        expect(rule1Violations[0].severity).toBe('CRITICAL');
      });

      it('should detect Rule 4: 8 consecutive points on same side', () => {
        const values = [51, 52, 51, 53, 52, 51, 52, 51]; // All above CL of 50
        const violations = SPCEngine.checkWesternElectricRules(values, 55, 50, 45);
        
        const rule4Violations = violations.filter(v => v.type === 'RULE_4');
        expect(rule4Violations.length).toBeGreaterThan(0);
      });

      it('should detect Rule 5: 6 consecutive points trending', () => {
        const values = [50, 51, 52, 53, 54, 55]; // Increasing trend
        const violations = SPCEngine.checkWesternElectricRules(values, 60, 50, 40);
        
        const rule5Violations = violations.filter(v => v.type === 'RULE_5');
        expect(rule5Violations.length).toBeGreaterThan(0);
      });

      it('should return empty for in-control process', () => {
        // Values randomly varying around center line
        const values = [50, 51, 49, 50, 52, 48, 50, 51, 49, 50];
        const violations = SPCEngine.checkWesternElectricRules(values, 55, 50, 45);
        
        // Should have no critical violations
        const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
        expect(criticalViolations.length).toBe(0);
      });
    });
  });

  // ===========================================================================
  // TREND AND SHIFT DETECTION
  // ===========================================================================

  describe('Trend and Shift Detection', () => {
    describe('detectTrend', () => {
      it('should detect upward trend', () => {
        const values = [10, 11, 12, 13, 14, 15];
        const result = SPCEngine.detectTrend(values);
        
        expect(result.hasTrend).toBe(true);
        expect(result.direction).toBe('UP');
        expect(result.strength).toBe(1);
      });

      it('should detect downward trend', () => {
        const values = [15, 14, 13, 12, 11, 10];
        const result = SPCEngine.detectTrend(values);
        
        expect(result.hasTrend).toBe(true);
        expect(result.direction).toBe('DOWN');
        expect(result.strength).toBe(1);
      });

      it('should return no trend for random data', () => {
        const values = [10, 12, 11, 13, 10, 12];
        const result = SPCEngine.detectTrend(values);
        
        expect(result.hasTrend).toBe(false);
      });

      it('should return no trend for insufficient data', () => {
        const values = [10, 11, 12];
        const result = SPCEngine.detectTrend(values);
        
        expect(result.hasTrend).toBe(false);
        expect(result.direction).toBe('NONE');
      });
    });

    describe('detectShift', () => {
      it('should detect upward shift', () => {
        const values = [52, 53, 51, 52, 53, 51, 52, 53]; // All above CL of 50
        const result = SPCEngine.detectShift(values, 50, 2);
        
        expect(result.hasShift).toBe(true);
        expect(result.direction).toBe('UP');
      });

      it('should detect downward shift', () => {
        const values = [48, 47, 49, 48, 47, 49, 48, 47]; // All below CL of 50
        const result = SPCEngine.detectShift(values, 50, 2);
        
        expect(result.hasShift).toBe(true);
        expect(result.direction).toBe('DOWN');
      });

      it('should return no shift for centered data', () => {
        const values = [49, 51, 48, 52, 49, 51, 48, 52];
        const result = SPCEngine.detectShift(values, 50, 2);
        
        expect(result.hasShift).toBe(false);
      });
    });
  });

  // ===========================================================================
  // UTILITY FUNCTIONS
  // ===========================================================================

  describe('Utility Functions', () => {
    describe('getChartTypeLabel', () => {
      it('should return correct labels for all chart types', () => {
        expect(SPCEngine.getChartTypeLabel('XBAR_R')).toBe('X̄-R Chart');
        expect(SPCEngine.getChartTypeLabel('XBAR_S')).toBe('X̄-S Chart');
        expect(SPCEngine.getChartTypeLabel('I_MR')).toBe('I-MR Chart');
        expect(SPCEngine.getChartTypeLabel('P')).toBe('p Chart');
        expect(SPCEngine.getChartTypeLabel('NP')).toBe('np Chart');
        expect(SPCEngine.getChartTypeLabel('C')).toBe('c Chart');
        expect(SPCEngine.getChartTypeLabel('U')).toBe('u Chart');
      });
    });

    describe('getStatusColor', () => {
      it('should return correct colors for all statuses', () => {
        expect(SPCEngine.getStatusColor('IN_CONTROL')).toContain('green');
        expect(SPCEngine.getStatusColor('WARNING')).toContain('yellow');
        expect(SPCEngine.getStatusColor('OUT_OF_CONTROL')).toContain('red');
      });
    });

    describe('getCapabilityStatusColor', () => {
      it('should return correct colors for capability statuses', () => {
        expect(SPCEngine.getCapabilityStatusColor('EXCELLENT')).toContain('green');
        expect(SPCEngine.getCapabilityStatusColor('GOOD')).toContain('blue');
        expect(SPCEngine.getCapabilityStatusColor('ACCEPTABLE')).toContain('yellow');
        expect(SPCEngine.getCapabilityStatusColor('POOR')).toContain('orange');
        expect(SPCEngine.getCapabilityStatusColor('UNACCEPTABLE')).toContain('red');
      });
    });

    describe('getSeverityColor', () => {
      it('should return correct colors for all severities', () => {
        expect(SPCEngine.getSeverityColor('INFO')).toContain('blue');
        expect(SPCEngine.getSeverityColor('WARNING')).toContain('yellow');
        expect(SPCEngine.getSeverityColor('CRITICAL')).toContain('red');
      });
    });

    describe('formatNumber', () => {
      it('should format numbers with specified decimals', () => {
        expect(SPCEngine.formatNumber(1.23456, 2)).toBe('1.23');
        expect(SPCEngine.formatNumber(1.23456, 4)).toBe('1.2346');
        expect(SPCEngine.formatNumber(1, 3)).toBe('1.000');
      });
    });
  });
});
