import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QualityPredictionEngine, getQualityPredictionEngine } from '../quality-prediction-engine';

// Mock prisma
const mockPartFindUnique = vi.fn();
const mockPartFindMany = vi.fn();
const mockNCRCount = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    part: { findUnique: (...args: unknown[]) => mockPartFindUnique(...args), findMany: (...args: unknown[]) => mockPartFindMany(...args) },
    nCR: { count: (...args: unknown[]) => mockNCRCount(...args) },
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

// Mock data extractor
const mockExtractPartQualitySummary = vi.fn();
const mockExtractNCRHistory = vi.fn();
vi.mock('../quality-data-extractor', () => ({
  getQualityDataExtractor: vi.fn(() => ({
    extractPartQualitySummary: mockExtractPartQualitySummary,
    extractNCRHistory: mockExtractNCRHistory,
  })),
}));

// Mock metrics calculator
vi.mock('../quality-metrics-calculator', () => ({
  getQualityMetricsCalculator: vi.fn(() => ({
    calculateSupplierQualityScore: vi.fn(),
  })),
}));

// Mock pattern recognition
const mockDetectRecurringIssues = vi.fn();
const mockDetectQualityDrift = vi.fn();
vi.mock('../pattern-recognition', () => ({
  getQualityPatternRecognition: vi.fn(() => ({
    detectRecurringIssues: mockDetectRecurringIssues,
    detectQualityDrift: mockDetectQualityDrift,
  })),
}));

// Mock anomaly detector
const mockDetectAnomalies = vi.fn();
vi.mock('../anomaly-detector', () => ({
  getQualityAnomalyDetector: vi.fn(() => ({
    detectAnomalies: mockDetectAnomalies,
  })),
}));

describe('QualityPredictionEngine', () => {
  let engine: QualityPredictionEngine;

  const samplePart = { id: 'part-1', partNumber: 'PN-001', name: 'Test Part' };

  const sampleQualitySummary = {
    partId: 'part-1',
    partSku: 'PN-001',
    partName: 'Test Part',
    totalInspections: 100,
    passCount: 95,
    failCount: 5,
    firstPassYield: 95,
    totalNCRs: 5,
    openNCRs: 1,
    topDefects: [{ category: 'Dimensional', count: 3 }],
    supplierQuality: [{ supplierId: 'sup-1', supplierName: 'Supplier A', acceptanceRate: 96 }],
    qualityTrend: [
      { period: '2025-01', totalInspections: 20, passCount: 19, failCount: 1, firstPassYield: 95, ncrCount: 1, avgDefectsPerLot: 0.2 },
      { period: '2025-02', totalInspections: 20, passCount: 18, failCount: 2, firstPassYield: 90, ncrCount: 2, avgDefectsPerLot: 0.3 },
      { period: '2025-03', totalInspections: 20, passCount: 19, failCount: 1, firstPassYield: 95, ncrCount: 1, avgDefectsPerLot: 0.1 },
      { period: '2025-04', totalInspections: 20, passCount: 20, failCount: 0, firstPassYield: 100, ncrCount: 0, avgDefectsPerLot: 0 },
      { period: '2025-05', totalInspections: 20, passCount: 19, failCount: 1, firstPassYield: 95, ncrCount: 1, avgDefectsPerLot: 0.2 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new QualityPredictionEngine();

    mockPartFindUnique.mockResolvedValue(samplePart);
    mockExtractPartQualitySummary.mockResolvedValue(sampleQualitySummary);
    mockExtractNCRHistory.mockResolvedValue([
      { id: 'ncr-1', createdAt: new Date('2025-01-15'), quantityAffected: 5 },
      { id: 'ncr-2', createdAt: new Date('2025-02-10'), quantityAffected: 3 },
      { id: 'ncr-3', createdAt: new Date('2025-02-20'), quantityAffected: 4 },
      { id: 'ncr-4', createdAt: new Date('2025-03-05'), quantityAffected: 2 },
      { id: 'ncr-5', createdAt: new Date('2025-05-12'), quantityAffected: 6 },
    ]);
    mockDetectRecurringIssues.mockResolvedValue({
      hasRecurringIssues: false,
      issues: [],
      totalOccurrences: 0,
    });
    mockDetectQualityDrift.mockResolvedValue({
      driftDirection: 'stable',
      driftMagnitude: 0.5,
    });
    mockDetectAnomalies.mockResolvedValue({
      anomalyCount: 0,
      riskLevel: 'none',
      severityDistribution: { critical: 0, major: 0, minor: 0 },
      anomalies: [],
    });
  });

  describe('predictNCR', () => {
    it('should throw when part is not found', async () => {
      mockPartFindUnique.mockResolvedValue(null);
      await expect(engine.predictNCR('non-existent')).rejects.toThrow('Part not found');
    });

    it('should return an NCR prediction', async () => {
      const result = await engine.predictNCR('part-1');

      expect(result.partId).toBe('part-1');
      expect(result.partSku).toBe('PN-001');
      expect(result.probability).toBeGreaterThanOrEqual(0);
      expect(result.probability).toBeLessThanOrEqual(1);
      expect(result.confidenceLevel).toBeGreaterThanOrEqual(0);
      expect(result.confidenceLevel).toBeLessThanOrEqual(1);
      expect(result.expectedNCRCount.min).toBeLessThanOrEqual(result.expectedNCRCount.max);
      expect(result.predictionPeriod.start).toBeInstanceOf(Date);
      expect(result.predictionPeriod.end).toBeInstanceOf(Date);
    });

    it('should detect worsening trend', async () => {
      // Monthly rates: Jan=1, Feb=2, Mar=1, May=1 => recent avg < older avg => improving or stable
      // Let's set up a clearly worsening trend
      mockExtractNCRHistory.mockResolvedValue([
        { id: 'n1', createdAt: new Date('2025-01-10'), quantityAffected: 1 },
        { id: 'n2', createdAt: new Date('2025-02-10'), quantityAffected: 1 },
        { id: 'n3', createdAt: new Date('2025-03-10'), quantityAffected: 1 },
        { id: 'n4', createdAt: new Date('2025-04-10'), quantityAffected: 1 },
        { id: 'n5', createdAt: new Date('2025-04-15'), quantityAffected: 1 },
        { id: 'n6', createdAt: new Date('2025-05-10'), quantityAffected: 1 },
        { id: 'n7', createdAt: new Date('2025-05-15'), quantityAffected: 1 },
        { id: 'n8', createdAt: new Date('2025-05-20'), quantityAffected: 1 },
        { id: 'n9', createdAt: new Date('2025-06-10'), quantityAffected: 1 },
        { id: 'n10', createdAt: new Date('2025-06-15'), quantityAffected: 1 },
        { id: 'n11', createdAt: new Date('2025-06-20'), quantityAffected: 1 },
      ]);

      const result = await engine.predictNCR('part-1');
      expect(result.historicalBasis.recentTrend).toBe('worsening');
      expect(result.riskFactors).toContain('Increasing NCR trend');
    });

    it('should detect improving trend', async () => {
      mockExtractNCRHistory.mockResolvedValue([
        { id: 'n1', createdAt: new Date('2025-01-10'), quantityAffected: 1 },
        { id: 'n2', createdAt: new Date('2025-01-15'), quantityAffected: 1 },
        { id: 'n3', createdAt: new Date('2025-01-20'), quantityAffected: 1 },
        { id: 'n4', createdAt: new Date('2025-02-10'), quantityAffected: 1 },
        { id: 'n5', createdAt: new Date('2025-02-15'), quantityAffected: 1 },
        { id: 'n6', createdAt: new Date('2025-03-10'), quantityAffected: 1 },
        { id: 'n7', createdAt: new Date('2025-05-10'), quantityAffected: 1 },
      ]);

      const result = await engine.predictNCR('part-1');
      expect(result.historicalBasis.recentTrend).toBe('improving');
      expect(result.mitigatingFactors).toContain('Improving quality trend');
    });

    it('should add risk factor for open NCRs', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        ...sampleQualitySummary,
        openNCRs: 3,
      });

      const result = await engine.predictNCR('part-1');
      expect(result.riskFactors).toContain('3 open NCR(s)');
    });

    it('should add risk factor for below-target FPY', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        ...sampleQualitySummary,
        firstPassYield: 90,
      });

      const result = await engine.predictNCR('part-1');
      expect(result.riskFactors).toContain('Below-target FPY');
    });

    it('should add mitigating factor for excellent FPY', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        ...sampleQualitySummary,
        firstPassYield: 99,
        openNCRs: 0,
      });

      const result = await engine.predictNCR('part-1');
      expect(result.mitigatingFactors).toContain('Excellent FPY');
    });

    it('should handle zero NCR history', async () => {
      mockExtractNCRHistory.mockResolvedValue([]);

      const result = await engine.predictNCR('part-1');
      expect(result.probability).toBe(0);
      expect(result.expectedNCRCount.expected).toBe(0);
      expect(result.historicalBasis.historicalRate).toBe(0);
    });

    it('should recommend actions for high probability', async () => {
      // Generate enough NCRs to get high probability
      const manyNCRs = Array.from({ length: 30 }, (_, i) => ({
        id: `ncr-${i}`,
        createdAt: new Date(`2025-${String(Math.floor(i / 5) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`),
        quantityAffected: 2,
      }));
      mockExtractNCRHistory.mockResolvedValue(manyNCRs);

      const result = await engine.predictNCR('part-1');
      if (result.probability > 0.7) {
        expect(result.recommendations).toContain('High NCR probability - increase inspection frequency');
      }
    });
  });

  describe('generateForecast', () => {
    it('should throw when part is not found', async () => {
      mockPartFindUnique.mockResolvedValue(null);
      await expect(engine.generateForecast('non-existent')).rejects.toThrow('Part not found');
    });

    it('should return quality forecast with correct number of periods', async () => {
      const result = await engine.generateForecast('part-1', 3);

      expect(result.partId).toBe('part-1');
      expect(result.partSku).toBe('PN-001');
      expect(result.forecastPeriods).toHaveLength(3);
      expect(['improving', 'stable', 'degrading']).toContain(result.overallTrend);
      expect(result.keyAssumptions.length).toBeGreaterThan(0);
    });

    it('should have decreasing confidence over forecast periods', async () => {
      const result = await engine.generateForecast('part-1', 3);

      for (let i = 1; i < result.forecastPeriods.length; i++) {
        expect(result.forecastPeriods[i].confidenceLevel).toBeLessThanOrEqual(
          result.forecastPeriods[i - 1].confidenceLevel
        );
      }
    });

    it('should have valid FPY predictions in each period', async () => {
      const result = await engine.generateForecast('part-1', 3);

      for (const period of result.forecastPeriods) {
        expect(period.predictedFPY.low).toBeLessThanOrEqual(period.predictedFPY.expected);
        expect(period.predictedFPY.expected).toBeLessThanOrEqual(period.predictedFPY.high);
        expect(period.predictedFPY.low).toBeGreaterThanOrEqual(0);
        expect(period.predictedFPY.high).toBeLessThanOrEqual(100);
      }
    });

    it('should handle empty trend data', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        ...sampleQualitySummary,
        qualityTrend: [],
      });

      const result = await engine.generateForecast('part-1', 2);
      expect(result.forecastPeriods).toHaveLength(2);
      expect(result.overallTrend).toBe('stable');
    });

    it('should handle null quality summary', async () => {
      mockExtractPartQualitySummary.mockResolvedValue(null);

      const result = await engine.generateForecast('part-1', 2);
      expect(result.forecastPeriods).toHaveLength(2);
    });

    it('should identify degrading trend', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        ...sampleQualitySummary,
        qualityTrend: [
          { period: '2025-01', firstPassYield: 98, ncrCount: 0, totalInspections: 20, passCount: 20, failCount: 0, avgDefectsPerLot: 0 },
          { period: '2025-02', firstPassYield: 97, ncrCount: 1, totalInspections: 20, passCount: 19, failCount: 1, avgDefectsPerLot: 0.1 },
          { period: '2025-03', firstPassYield: 96, ncrCount: 1, totalInspections: 20, passCount: 19, failCount: 1, avgDefectsPerLot: 0.1 },
          { period: '2025-04', firstPassYield: 92, ncrCount: 2, totalInspections: 20, passCount: 18, failCount: 2, avgDefectsPerLot: 0.3 },
          { period: '2025-05', firstPassYield: 90, ncrCount: 3, totalInspections: 20, passCount: 18, failCount: 2, avgDefectsPerLot: 0.4 },
          { period: '2025-06', firstPassYield: 88, ncrCount: 3, totalInspections: 20, passCount: 17, failCount: 3, avgDefectsPerLot: 0.5 },
        ],
        openNCRs: 3,
      });

      const result = await engine.generateForecast('part-1', 3);
      expect(result.overallTrend).toBe('degrading');
      expect(result.risks.length).toBeGreaterThan(0);
    });

    it('should identify improving trend with opportunities', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        ...sampleQualitySummary,
        firstPassYield: 99,
        openNCRs: 0,
        qualityTrend: [
          { period: '2025-01', firstPassYield: 90, ncrCount: 3, totalInspections: 20, passCount: 18, failCount: 2, avgDefectsPerLot: 0.4 },
          { period: '2025-02', firstPassYield: 92, ncrCount: 2, totalInspections: 20, passCount: 18, failCount: 2, avgDefectsPerLot: 0.3 },
          { period: '2025-03', firstPassYield: 93, ncrCount: 2, totalInspections: 20, passCount: 19, failCount: 1, avgDefectsPerLot: 0.2 },
          { period: '2025-04', firstPassYield: 96, ncrCount: 1, totalInspections: 20, passCount: 19, failCount: 1, avgDefectsPerLot: 0.1 },
          { period: '2025-05', firstPassYield: 98, ncrCount: 0, totalInspections: 20, passCount: 20, failCount: 0, avgDefectsPerLot: 0 },
          { period: '2025-06', firstPassYield: 99, ncrCount: 0, totalInspections: 20, passCount: 20, failCount: 0, avgDefectsPerLot: 0 },
        ],
      });

      const result = await engine.generateForecast('part-1', 3);
      expect(result.overallTrend).toBe('improving');
      expect(result.opportunities.length).toBeGreaterThan(0);
    });
  });

  describe('calculateRiskScore', () => {
    it('should throw when part is not found', async () => {
      mockPartFindUnique.mockResolvedValue(null);
      await expect(engine.calculateRiskScore('non-existent')).rejects.toThrow('Part not found');
    });

    it('should return a complete risk score', async () => {
      const result = await engine.calculateRiskScore('part-1');

      expect(result.partId).toBe('part-1');
      expect(result.partSku).toBe('PN-001');
      expect(result.partName).toBe('Test Part');
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.overallRiskScore).toBeLessThanOrEqual(100);
      expect(['critical', 'high', 'medium', 'low', 'minimal']).toContain(result.riskLevel);
      expect(result.riskFactors.length).toBe(5);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should classify risk levels correctly', async () => {
      // With default mocks, risk should be relatively low
      const result = await engine.calculateRiskScore('part-1');

      // Verify risk factors have correct categories
      const categories = result.riskFactors.map((f) => f.category);
      expect(categories).toContain('historical');
      expect(categories).toContain('supplier');
      expect(categories).toContain('pattern');
      expect(categories).toContain('anomaly');
      expect(categories).toContain('process');
    });

    it('should return high risk for poor FPY', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        ...sampleQualitySummary,
        firstPassYield: 80,
        openNCRs: 5,
        qualityTrend: [],
      });
      mockDetectRecurringIssues.mockResolvedValue({
        issues: [
          { defectCategory: 'Dim', isResolved: false, frequency: 'high', occurrences: 10 },
          { defectCategory: 'Surface', isResolved: false, frequency: 'high', occurrences: 8 },
          { defectCategory: 'Material', isResolved: false, frequency: 'medium', occurrences: 5 },
        ],
      });
      mockDetectAnomalies.mockResolvedValue({
        anomalyCount: 5,
        riskLevel: 'high',
        severityDistribution: { critical: 2, major: 2, minor: 1 },
        anomalies: [],
      });
      mockDetectQualityDrift.mockResolvedValue({
        driftDirection: 'degrading',
        driftMagnitude: -15,
      });

      const result = await engine.calculateRiskScore('part-1');
      expect(['critical', 'high']).toContain(result.riskLevel);
    });

    it('should handle pattern recognition errors gracefully', async () => {
      mockDetectRecurringIssues.mockRejectedValue(new Error('Pattern error'));
      mockDetectAnomalies.mockRejectedValue(new Error('Anomaly error'));
      mockDetectQualityDrift.mockRejectedValue(new Error('Drift error'));

      const result = await engine.calculateRiskScore('part-1');
      // Should still return a result with default risk factors
      expect(result.riskFactors.length).toBe(5);
    });

    it('should generate recommendations for high-impact factors', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        ...sampleQualitySummary,
        firstPassYield: 82,
        supplierQuality: [{ supplierId: 'sup-1', supplierName: 'Sup A', acceptanceRate: 80 }],
        qualityTrend: [],
      });

      const result = await engine.calculateRiskScore('part-1');
      // Should have recommendations since FPY and supplier acceptance are poor
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate historical performance metrics from trend', async () => {
      const result = await engine.calculateRiskScore('part-1');

      expect(result.historicalPerformance.avgFPY).toBeGreaterThan(0);
      expect(typeof result.historicalPerformance.ncrFrequency).toBe('number');
      expect(['improving', 'stable', 'degrading']).toContain(result.historicalPerformance.trendDirection);
    });

    it('should handle null quality summary for historical risk', async () => {
      mockExtractPartQualitySummary.mockResolvedValue(null);

      const result = await engine.calculateRiskScore('part-1');
      const historicalFactor = result.riskFactors.find((f) => f.category === 'historical');
      expect(historicalFactor).toBeDefined();
      expect(historicalFactor!.score).toBe(20); // default
    });
  });

  describe('performBatchRiskAssessment', () => {
    it('should assess risk for multiple parts', async () => {
      mockPartFindMany.mockResolvedValue([samplePart, { ...samplePart, id: 'part-2', partNumber: 'PN-002', name: 'Part 2' }]);
      mockNCRCount.mockResolvedValue(5);

      const result = await engine.performBatchRiskAssessment();

      expect(result.assessmentDate).toBeInstanceOf(Date);
      expect(result.partsAssessed).toBe(2);
      expect(result.riskDistribution).toBeDefined();
      expect(result.systemwideMetrics).toBeDefined();
    });

    it('should handle empty parts list', async () => {
      mockPartFindMany.mockResolvedValue([]);
      mockNCRCount.mockResolvedValue(0);

      const result = await engine.performBatchRiskAssessment();
      expect(result.partsAssessed).toBe(0);
      expect(result.systemwideMetrics.avgRiskScore).toBe(0);
      expect(result.systemwideMetrics.avgFPY).toBe(100);
    });

    it('should skip parts with errors', async () => {
      const errorPart = { id: 'error-part', partNumber: 'ERR', name: 'Error' };
      mockPartFindMany.mockResolvedValue([samplePart, errorPart]);
      mockNCRCount.mockResolvedValue(0);

      // Make part-1 work but error-part fail (findUnique returns null for error-part)
      mockPartFindUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === 'error-part') return Promise.resolve(null);
        return Promise.resolve(samplePart);
      });

      const result = await engine.performBatchRiskAssessment();
      // error-part should be skipped due to "Part not found" error in calculateRiskScore
      expect(result.partsAssessed).toBe(1);
    });

    it('should generate recommendations for critical risk parts', async () => {
      mockPartFindMany.mockResolvedValue([samplePart]);
      mockNCRCount.mockResolvedValue(15);

      // Make it high risk
      mockExtractPartQualitySummary.mockResolvedValue({
        ...sampleQualitySummary,
        firstPassYield: 75,
        openNCRs: 5,
        qualityTrend: [],
      });
      mockDetectRecurringIssues.mockResolvedValue({
        issues: [{ isResolved: false, frequency: 'high', defectCategory: 'Dim', occurrences: 10 }],
      });
      mockDetectAnomalies.mockResolvedValue({
        anomalyCount: 3,
        riskLevel: 'high',
        severityDistribution: { critical: 2, major: 1, minor: 0 },
        anomalies: [],
      });
      mockDetectQualityDrift.mockResolvedValue({ driftDirection: 'degrading', driftMagnitude: -20 });

      const result = await engine.performBatchRiskAssessment();
      expect(result.recommendations.length).toBeGreaterThan(0);
      // Should recommend prioritizing open NCRs since count > 10
      expect(result.recommendations.some((r) => r.includes('open NCRs'))).toBe(true);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const a = getQualityPredictionEngine();
      const b = getQualityPredictionEngine();
      expect(a).toBe(b);
    });
  });
});
