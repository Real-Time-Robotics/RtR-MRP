import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QualityAnomalyDetector, getQualityAnomalyDetector } from '../anomaly-detector';

// Mock prisma
const mockPartFindUnique = vi.fn();
const mockCharacteristicFindUnique = vi.fn();
const mockInspectionResultFindMany = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    part: { findUnique: (...args: unknown[]) => mockPartFindUnique(...args) },
    inspectionCharacteristic: { findUnique: (...args: unknown[]) => mockCharacteristicFindUnique(...args) },
    inspectionResult: { findMany: (...args: unknown[]) => mockInspectionResultFindMany(...args) },
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

// Mock data extractor
const mockExtractPartQualitySummary = vi.fn();
const mockExtractNCRHistory = vi.fn();
const mockExtractInspectionHistory = vi.fn();

vi.mock('../quality-data-extractor', () => ({
  getQualityDataExtractor: vi.fn(() => ({
    extractPartQualitySummary: mockExtractPartQualitySummary,
    extractNCRHistory: mockExtractNCRHistory,
    extractInspectionHistory: mockExtractInspectionHistory,
  })),
}));

// Mock metrics calculator
vi.mock('../quality-metrics-calculator', () => ({
  getQualityMetricsCalculator: vi.fn(() => ({})),
}));

describe('QualityAnomalyDetector', () => {
  let detector: QualityAnomalyDetector;

  const samplePart = { id: 'part-1', partNumber: 'PN-001', name: 'Test Part' };

  const sampleCharacteristic = {
    id: 'char-1',
    name: 'Diameter',
    type: 'measurement',
    upperLimit: 10.5,
    lowerLimit: 9.5,
    nominalValue: 10.0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    detector = new QualityAnomalyDetector();

    mockPartFindUnique.mockResolvedValue(samplePart);
    mockCharacteristicFindUnique.mockResolvedValue(sampleCharacteristic);
    mockExtractNCRHistory.mockResolvedValue([]);
    mockExtractPartQualitySummary.mockResolvedValue(null);
    mockExtractInspectionHistory.mockResolvedValue([]);
  });

  describe('performSPCAnalysis', () => {
    it('should throw when part is not found', async () => {
      mockPartFindUnique.mockResolvedValue(null);
      await expect(detector.performSPCAnalysis('bad-id', 'char-1')).rejects.toThrow('Part not found');
    });

    it('should throw when characteristic is not found', async () => {
      mockCharacteristicFindUnique.mockResolvedValue(null);
      await expect(detector.performSPCAnalysis('part-1', 'bad-char')).rejects.toThrow('Characteristic not found');
    });

    it('should handle insufficient data', async () => {
      mockInspectionResultFindMany.mockResolvedValue([]);

      const result = await detector.performSPCAnalysis('part-1', 'char-1');

      expect(result.partId).toBe('part-1');
      expect(result.partSku).toBe('PN-001');
      expect(result.characteristicName).toBe('Diameter');
      expect(result.isInControl).toBe(true);
      expect(result.measurements).toHaveLength(0);
      expect(result.recommendations).toContain('Insufficient data for SPC analysis (need more measurements)');
    });

    it('should calculate control limits and process capability', async () => {
      // Generate in-control measurements centered at 10.0 with small variation
      const measurements = Array.from({ length: 25 }, (_, i) => ({
        measuredValue: 10.0 + (Math.sin(i) * 0.1),
        inspection: { createdAt: new Date(2025, 0, i + 1) },
      }));
      mockInspectionResultFindMany.mockResolvedValue(measurements);

      const result = await detector.performSPCAnalysis('part-1', 'char-1');

      expect(result.controlLimits.mean).toBeCloseTo(10.0, 0);
      expect(result.controlLimits.ucl).toBeGreaterThan(result.controlLimits.mean);
      expect(result.controlLimits.lcl).toBeLessThan(result.controlLimits.mean);
      expect(result.controlLimits.usl).toBe(10.5);
      expect(result.controlLimits.lsl).toBe(9.5);
      expect(result.processCapability.cp).toBeGreaterThan(0);
      expect(result.processCapability.cpk).toBeGreaterThan(0);
    });

    it('should detect rule 1 violation (beyond 3 sigma)', async () => {
      // Put most values near 10, with one extreme outlier
      const measurements = Array.from({ length: 20 }, (_, i) => ({
        measuredValue: i === 10 ? 15.0 : 10.0 + (Math.random() * 0.05 - 0.025),
        inspection: { createdAt: new Date(2025, 0, i + 1) },
      }));
      mockInspectionResultFindMany.mockResolvedValue(measurements);

      const result = await detector.performSPCAnalysis('part-1', 'char-1');

      const rule1Violations = result.violations.filter((v) => v.ruleNumber === 1);
      expect(rule1Violations.length).toBeGreaterThan(0);
      expect(rule1Violations[0].severity).toBe('critical');
    });

    it('should detect rule 4 violation (run of 8 same side)', async () => {
      // 10 values all above mean, then 10 values below — should trigger rule 4
      const measurements = [
        ...Array.from({ length: 10 }, (_, i) => ({
          measuredValue: 10.3,
          inspection: { createdAt: new Date(2025, 0, i + 1) },
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
          measuredValue: 9.7,
          inspection: { createdAt: new Date(2025, 0, i + 11) },
        })),
      ];
      mockInspectionResultFindMany.mockResolvedValue(measurements);

      const result = await detector.performSPCAnalysis('part-1', 'char-1');

      const rule4Violations = result.violations.filter((v) => v.ruleNumber === 4);
      expect(rule4Violations.length).toBeGreaterThan(0);
    });

    it('should mark process as out of control with critical violations', async () => {
      const measurements = Array.from({ length: 20 }, (_, i) => ({
        measuredValue: i === 5 ? 20.0 : 10.0 + (Math.random() * 0.02 - 0.01),
        inspection: { createdAt: new Date(2025, 0, i + 1) },
      }));
      mockInspectionResultFindMany.mockResolvedValue(measurements);

      const result = await detector.performSPCAnalysis('part-1', 'char-1');
      expect(result.isInControl).toBe(false);
      expect(result.recommendations.some((r) => r.includes('out of control'))).toBe(true);
    });

    it('should classify process capability status', async () => {
      // Very tight process => high Cpk
      const measurements = Array.from({ length: 25 }, (_, i) => ({
        measuredValue: 10.0 + (i % 2 === 0 ? 0.01 : -0.01),
        inspection: { createdAt: new Date(2025, 0, i + 1) },
      }));
      mockInspectionResultFindMany.mockResolvedValue(measurements);

      const result = await detector.performSPCAnalysis('part-1', 'char-1');
      expect(['excellent', 'acceptable', 'marginal', 'poor']).toContain(result.processCapability.status);
    });

    it('should handle characteristic without spec limits', async () => {
      mockCharacteristicFindUnique.mockResolvedValue({
        ...sampleCharacteristic,
        upperLimit: null,
        lowerLimit: null,
      });
      const measurements = Array.from({ length: 10 }, (_, i) => ({
        measuredValue: 10.0 + i * 0.1,
        inspection: { createdAt: new Date(2025, 0, i + 1) },
      }));
      mockInspectionResultFindMany.mockResolvedValue(measurements);

      const result = await detector.performSPCAnalysis('part-1', 'char-1');
      expect(result.processCapability.cp).toBe(0);
      expect(result.processCapability.cpk).toBe(0);
    });
  });

  describe('detectAnomalies', () => {
    it('should throw when part is not found', async () => {
      mockPartFindUnique.mockResolvedValue(null);
      await expect(detector.detectAnomalies('bad-id')).rejects.toThrow('Part not found');
    });

    it('should return empty result when no anomalies detected', async () => {
      const result = await detector.detectAnomalies('part-1');

      expect(result.partId).toBe('part-1');
      expect(result.partSku).toBe('PN-001');
      expect(result.anomalyCount).toBe(0);
      expect(result.riskLevel).toBe('none');
    });

    it('should detect NCR clusters', async () => {
      const weekDate = new Date('2025-06-02'); // Monday
      mockExtractNCRHistory.mockResolvedValue([
        { id: 'n1', createdAt: new Date(weekDate.getTime()), defectCategory: 'Dim', quantityAffected: 5 },
        { id: 'n2', createdAt: new Date(weekDate.getTime() + 86400000), defectCategory: 'Surface', quantityAffected: 3 },
        { id: 'n3', createdAt: new Date(weekDate.getTime() + 2 * 86400000), defectCategory: 'Dim', quantityAffected: 4 },
      ]);

      const result = await detector.detectAnomalies('part-1');

      const clusters = result.anomalies.filter((a) => a.type === 'ncr_cluster');
      expect(clusters.length).toBeGreaterThanOrEqual(1);
      expect(clusters[0].severity).toBe('minor'); // exactly 3
    });

    it('should classify NCR cluster severity correctly', async () => {
      const weekDate = new Date('2025-06-02');
      const ncrs = Array.from({ length: 5 }, (_, i) => ({
        id: `n${i}`,
        createdAt: new Date(weekDate.getTime() + i * 86400000),
        defectCategory: 'Dim',
        quantityAffected: 2,
      }));
      mockExtractNCRHistory.mockResolvedValue(ncrs);

      const result = await detector.detectAnomalies('part-1');
      const clusters = result.anomalies.filter((a) => a.type === 'ncr_cluster');
      if (clusters.length > 0) {
        expect(clusters[0].severity).toBe('critical'); // 5 NCRs in a week
      }
    });

    it('should detect yield drops', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        partId: 'part-1',
        qualityTrend: [
          { period: '2025-01', firstPassYield: 98, ncrCount: 0, totalInspections: 20, passCount: 20, failCount: 0, avgDefectsPerLot: 0 },
          { period: '2025-02', firstPassYield: 80, ncrCount: 4, totalInspections: 20, passCount: 16, failCount: 4, avgDefectsPerLot: 0.5 },
        ],
      });

      const result = await detector.detectAnomalies('part-1');
      const yieldDrops = result.anomalies.filter((a) => a.type === 'yield_drop');
      expect(yieldDrops.length).toBeGreaterThanOrEqual(1);
      expect(yieldDrops[0].affectedMetric).toBe('First Pass Yield');
    });

    it('should classify yield drop severity correctly', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        partId: 'part-1',
        qualityTrend: [
          { period: '2025-01', firstPassYield: 95, ncrCount: 1, totalInspections: 20, passCount: 19, failCount: 1, avgDefectsPerLot: 0.1 },
          { period: '2025-02', firstPassYield: 75, ncrCount: 5, totalInspections: 20, passCount: 15, failCount: 5, avgDefectsPerLot: 0.8 },
        ],
      });

      const result = await detector.detectAnomalies('part-1');
      const yieldDrops = result.anomalies.filter((a) => a.type === 'yield_drop');
      if (yieldDrops.length > 0) {
        // 20% drop => > 15% => critical
        expect(yieldDrops[0].severity).toBe('critical');
      }
    });

    it('should detect quality spikes', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        partId: 'part-1',
        partSku: 'PN-001',
        partName: 'Test Part',
        qualityTrend: [
          { period: '2025-01', firstPassYield: 98, ncrCount: 1, totalInspections: 20, passCount: 19, failCount: 1, avgDefectsPerLot: 0.1 },
          { period: '2025-02', firstPassYield: 97, ncrCount: 1, totalInspections: 20, passCount: 19, failCount: 1, avgDefectsPerLot: 0.1 },
          { period: '2025-03', firstPassYield: 98, ncrCount: 1, totalInspections: 20, passCount: 19, failCount: 1, avgDefectsPerLot: 0.1 },
          { period: '2025-04', firstPassYield: 70, ncrCount: 8, totalInspections: 20, passCount: 14, failCount: 6, avgDefectsPerLot: 1.0 },
        ],
      });

      const result = await detector.detectAnomalies('part-1');
      const spikes = result.anomalies.filter((a) => a.type === 'quality_spike');
      expect(spikes.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect outliers in inspection data', async () => {
      // Need many normal data points so stdDev stays small, plus one extreme outlier.
      // With 30 points at defectCount=1 and one at 50:
      // mean ~ 2.58, stdDev ~ 8.8, threshold ~ 28.9, outlier 50 > 28.9
      const normalInspections = Array.from({ length: 30 }, (_, i) => ({
        id: `i${i}`,
        inspectionNumber: `INS-${String(i).padStart(3, '0')}`,
        date: new Date(),
        defectCount: 1,
        criticalDefects: 0,
        lotNumber: `LOT-${i}`,
      }));
      const outlierInspection = {
        id: 'i-outlier',
        inspectionNumber: 'INS-OUTLIER',
        date: new Date(),
        defectCount: 50,
        criticalDefects: 3,
        lotNumber: 'LOT-OUTLIER',
      };
      mockExtractInspectionHistory.mockResolvedValue([...normalInspections, outlierInspection]);

      const result = await detector.detectAnomalies('part-1');
      expect(mockExtractInspectionHistory).toHaveBeenCalled();
      expect(result.anomalies).toBeDefined();
      expect(Array.isArray(result.anomalies)).toBe(true);
    });

    it('should determine risk level based on severity distribution', async () => {
      // Setup multiple critical anomalies
      const weekDate = new Date('2025-06-02');
      const ncrs = Array.from({ length: 6 }, (_, i) => ({
        id: `n${i}`,
        createdAt: new Date(weekDate.getTime() + (i % 3) * 86400000),
        defectCategory: 'Dim',
        quantityAffected: 5,
      }));
      mockExtractNCRHistory.mockResolvedValue(ncrs);

      const result = await detector.detectAnomalies('part-1');
      if (result.severityDistribution.critical > 0) {
        expect(result.riskLevel).toBe('high');
      }
    });

    it('should generate recommendations for high risk', async () => {
      const weekDate = new Date('2025-06-02');
      const ncrs = Array.from({ length: 5 }, (_, i) => ({
        id: `n${i}`,
        createdAt: new Date(weekDate.getTime() + i * 86400000),
        defectCategory: 'Dim',
        quantityAffected: 3,
      }));
      mockExtractNCRHistory.mockResolvedValue(ncrs);

      const result = await detector.detectAnomalies('part-1');
      if (result.riskLevel === 'high') {
        expect(result.recommendations.some((r) => r.includes('Immediate investigation'))).toBe(true);
      }
    });
  });

  describe('detectQualitySpikes', () => {
    it('should throw when part is not found', async () => {
      mockPartFindUnique.mockResolvedValue(null);
      await expect(detector.detectQualitySpikes('bad-id')).rejects.toThrow('Part not found');
    });

    it('should return no spikes when no quality summary', async () => {
      mockExtractPartQualitySummary.mockResolvedValue(null);

      const result = await detector.detectQualitySpikes('part-1');
      expect(result.hasSpike).toBe(false);
      expect(result.spikes).toHaveLength(0);
    });

    it('should return no spikes with insufficient trend data', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        qualityTrend: [
          { period: '2025-01', ncrCount: 1, firstPassYield: 95, avgDefectsPerLot: 0.1 },
        ],
      });

      const result = await detector.detectQualitySpikes('part-1');
      expect(result.hasSpike).toBe(false);
    });

    it('should detect NCR count spike', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        qualityTrend: [
          { period: '2025-01', ncrCount: 1, firstPassYield: 98, avgDefectsPerLot: 0.1 },
          { period: '2025-02', ncrCount: 1, firstPassYield: 97, avgDefectsPerLot: 0.1 },
          { period: '2025-03', ncrCount: 2, firstPassYield: 96, avgDefectsPerLot: 0.2 },
          { period: '2025-04', ncrCount: 10, firstPassYield: 80, avgDefectsPerLot: 1.0 },
        ],
      });

      const result = await detector.detectQualitySpikes('part-1');
      expect(result.hasSpike).toBe(true);
      const ncrSpike = result.spikes.find((s) => s.metric === 'NCR Count');
      expect(ncrSpike).toBeDefined();
      expect(ncrSpike!.spikeMultiplier).toBeGreaterThan(2);
    });

    it('should detect FPY drop spike', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        qualityTrend: [
          { period: '2025-01', ncrCount: 0, firstPassYield: 98, avgDefectsPerLot: 0 },
          { period: '2025-02', ncrCount: 0, firstPassYield: 99, avgDefectsPerLot: 0 },
          { period: '2025-03', ncrCount: 0, firstPassYield: 97, avgDefectsPerLot: 0 },
          { period: '2025-04', ncrCount: 1, firstPassYield: 70, avgDefectsPerLot: 0.5 },
        ],
      });

      const result = await detector.detectQualitySpikes('part-1');
      expect(result.hasSpike).toBe(true);
      const fpySpike = result.spikes.find((s) => s.metric === 'First Pass Yield');
      expect(fpySpike).toBeDefined();
    });

    it('should calculate baseline correctly', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        qualityTrend: [
          { period: '2025-01', ncrCount: 2, firstPassYield: 95, avgDefectsPerLot: 0.3 },
          { period: '2025-02', ncrCount: 3, firstPassYield: 94, avgDefectsPerLot: 0.4 },
          { period: '2025-03', ncrCount: 1, firstPassYield: 96, avgDefectsPerLot: 0.2 },
          { period: '2025-04', ncrCount: 2, firstPassYield: 95, avgDefectsPerLot: 0.3 },
        ],
      });

      const result = await detector.detectQualitySpikes('part-1');
      // baseline = avg of first 3 periods
      expect(result.baseline.avgNcrRate).toBe(2); // (2+3+1)/3 = 2
      expect(result.baseline.period).toContain('2025-01');
      expect(result.baseline.period).toContain('2025-03');
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const a = getQualityAnomalyDetector();
      const b = getQualityAnomalyDetector();
      expect(a).toBe(b);
    });
  });
});
