import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIQualityAnalyzer, getAIQualityAnalyzer } from '../ai-quality-analyzer';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

// Mock AI provider
const mockChat = vi.fn().mockResolvedValue({ content: '' });
vi.mock('@/lib/ai/provider', () => ({
  getAIProvider: vi.fn(() => ({ chat: mockChat })),
  createSystemMessage: vi.fn((msg: string) => ({ role: 'system', content: msg })),
  createUserMessage: vi.fn((msg: string) => ({ role: 'user', content: msg })),
}));

// Mock dependencies
const mockExtractNCRHistory = vi.fn();
const mockExtractPartQualitySummary = vi.fn();
const mockExtractSupplierQualityData = vi.fn();

vi.mock('../quality-data-extractor', () => ({
  getQualityDataExtractor: vi.fn(() => ({
    extractNCRHistory: mockExtractNCRHistory,
    extractPartQualitySummary: mockExtractPartQualitySummary,
    extractSupplierQualityData: mockExtractSupplierQualityData,
  })),
}));

const mockCalculateSupplierQualityScore = vi.fn();
vi.mock('../quality-metrics-calculator', () => ({
  getQualityMetricsCalculator: vi.fn(() => ({
    calculateSupplierQualityScore: mockCalculateSupplierQualityScore,
  })),
}));

const mockDetectRecurringIssues = vi.fn();
const mockDetectQualityDrift = vi.fn();
vi.mock('../pattern-recognition', () => ({
  getQualityPatternRecognition: vi.fn(() => ({
    detectRecurringIssues: mockDetectRecurringIssues,
    detectQualityDrift: mockDetectQualityDrift,
  })),
}));

const mockDetectAnomalies = vi.fn();
vi.mock('../anomaly-detector', () => ({
  getQualityAnomalyDetector: vi.fn(() => ({
    detectAnomalies: mockDetectAnomalies,
  })),
}));

const mockCalculateRiskScore = vi.fn();
const mockGenerateForecast = vi.fn();
const mockPredictNCR = vi.fn();
vi.mock('../quality-prediction-engine', () => ({
  getQualityPredictionEngine: vi.fn(() => ({
    calculateRiskScore: mockCalculateRiskScore,
    generateForecast: mockGenerateForecast,
    predictNCR: mockPredictNCR,
  })),
}));

describe('AIQualityAnalyzer', () => {
  let analyzer: AIQualityAnalyzer;

  const sampleNCR = {
    id: 'ncr-1',
    ncrNumber: 'NCR-001',
    createdAt: new Date('2025-06-01'),
    status: 'open',
    priority: 'high',
    source: 'incoming',
    defectCategory: 'Dimensional',
    defectCode: 'DIM-001',
    quantityAffected: 10,
    partId: 'part-1',
    partSku: 'SKU-001',
    supplierId: 'sup-1',
    supplierName: 'Supplier A',
    disposition: 'rework',
    preliminaryCause: 'Tool wear',
    rootCause: null,
    daysOpen: 5,
  };

  const sampleQualitySummary = {
    partId: 'part-1',
    partSku: 'SKU-001',
    partName: 'Test Part',
    totalInspections: 100,
    passCount: 95,
    failCount: 5,
    firstPassYield: 95,
    totalNCRs: 5,
    openNCRs: 2,
    topDefects: [{ category: 'Dimensional', count: 3 }],
    supplierQuality: [{ supplierId: 'sup-1', supplierName: 'Supplier A', acceptanceRate: 96 }],
    qualityTrend: [],
  };

  const sampleSupplierData = {
    supplierId: 'sup-1',
    supplierName: 'Supplier A',
    totalLots: 50,
    acceptedLots: 48,
    rejectedLots: 2,
    acceptanceRate: 96,
    totalNCRs: 3,
    openNCRs: 1,
    avgDaysToResolve: 7,
    defectCategories: [{ category: 'Dimensional', count: 2 }],
    qualityTrend: [],
    lastInspectionDate: new Date(),
    qualityScore: 85,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new AIQualityAnalyzer();

    mockExtractNCRHistory.mockResolvedValue([sampleNCR]);
    mockExtractPartQualitySummary.mockResolvedValue(sampleQualitySummary);
    mockExtractSupplierQualityData.mockResolvedValue(sampleSupplierData);
    mockChat.mockResolvedValue({ content: '' });
  });

  describe('analyzeRootCause', () => {
    it('should throw when NCR is not found', async () => {
      mockExtractNCRHistory.mockResolvedValue([]);
      await expect(analyzer.analyzeRootCause('non-existent')).rejects.toThrow('NCR not found');
    });

    it('should return root cause analysis result', async () => {
      const result = await analyzer.analyzeRootCause('ncr-1');

      expect(result.ncrId).toBe('ncr-1');
      expect(result.ncrNumber).toBe('NCR-001');
      expect(result.defectDescription).toBe('Dimensional');
      expect(result.analysis).toBeDefined();
      expect(result.analysis.primaryCauses).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should find similar incidents by defect category and part', async () => {
      const ncr2 = { ...sampleNCR, id: 'ncr-2', ncrNumber: 'NCR-002' };
      mockExtractNCRHistory.mockResolvedValue([sampleNCR, ncr2]);

      const result = await analyzer.analyzeRootCause('ncr-1');
      expect(result.similarIncidents).toHaveLength(1);
      expect(result.similarIncidents[0].ncrNumber).toBe('NCR-002');
    });

    it('should handle NCR without part or supplier', async () => {
      const ncrNoRefs = { ...sampleNCR, partId: null, supplierId: null };
      mockExtractNCRHistory.mockResolvedValue([ncrNoRefs]);

      const result = await analyzer.analyzeRootCause('ncr-1');
      expect(result.ncrId).toBe('ncr-1');
    });

    it('should parse AI response for root causes', async () => {
      mockChat.mockResolvedValue({
        content: `PRIMARY_CAUSES:
- Tool wear causing dimensional drift
- Insufficient calibration
CONTRIBUTING_FACTORS:
- High production volume
EVIDENCE_BASIS:
- Historical NCR patterns
IMMEDIATE_ACTIONS:
- Stop production
SHORT_TERM_ACTIONS:
- Recalibrate tooling
LONG_TERM_ACTIONS:
- Implement SPC monitoring
PREVENTION_STRATEGIES:
- Regular tool maintenance
INSIGHTS:
This is a recurring tooling issue.
CONFIDENCE_LEVEL:
0.85`,
      });

      const result = await analyzer.analyzeRootCause('ncr-1');
      expect(result.analysis.primaryCauses).toContain('Tool wear causing dimensional drift');
      expect(result.analysis.primaryCauses).toContain('Insufficient calibration');
      expect(result.analysis.confidenceLevel).toBe(0.85);
      expect(result.recommendations.immediate).toContain('Stop production');
      expect(result.preventionStrategies).toContain('Regular tool maintenance');
    });

    it('should handle empty AI response gracefully', async () => {
      mockChat.mockResolvedValue({ content: '' });

      const result = await analyzer.analyzeRootCause('ncr-1');
      // parseRootCauseResponse returns empty arrays, but code uses `|| ['...']`
      // which doesn't trigger for empty arrays. So primaryCauses is [].
      expect(result.analysis.primaryCauses).toEqual([]);
      expect(result.analysis.confidenceLevel).toBe(0.6);
      // Fallback insight message is used
      expect(result.aiInsights).toBe('Analysis complete. Review recommendations for corrective actions.');
    });

    it('should handle AI error gracefully', async () => {
      mockChat.mockRejectedValue(new Error('AI service unavailable'));

      const result = await analyzer.analyzeRootCause('ncr-1');
      // callAI catches error and returns empty string, so parsed result has empty arrays
      expect(result.analysis.primaryCauses).toEqual([]);
      expect(result.aiInsights).toBe('Analysis complete. Review recommendations for corrective actions.');
    });
  });

  describe('generateInsightReport', () => {
    beforeEach(() => {
      mockCalculateRiskScore.mockResolvedValue({
        overallRiskScore: 45,
        riskLevel: 'medium',
        riskFactors: [{ name: 'Historical', score: 50, impact: 'medium', description: 'Low FPY' }],
        historicalPerformance: { avgFPY: 95, ncrFrequency: 1.2, trendDirection: 'stable' },
        recommendations: ['Improve FPY'],
      });
      mockDetectRecurringIssues.mockResolvedValue({
        hasRecurringIssues: false,
        issues: [],
        totalOccurrences: 0,
      });
      mockDetectQualityDrift.mockResolvedValue({
        driftDirection: 'stable',
        driftMagnitude: 1.5,
      });
      mockDetectAnomalies.mockResolvedValue({
        anomalyCount: 0,
        riskLevel: 'none',
        anomalies: [],
      });
      mockGenerateForecast.mockResolvedValue({
        overallTrend: 'stable',
        forecastPeriods: [{ predictedFPY: { expected: 95 } }],
      });
    });

    it('should throw when part is not found', async () => {
      mockExtractPartQualitySummary.mockResolvedValue(null);
      await expect(analyzer.generateInsightReport('non-existent')).rejects.toThrow('Part not found');
    });

    it('should return a complete insight report', async () => {
      const result = await analyzer.generateInsightReport('part-1', 6);

      expect(result.partId).toBe('part-1');
      expect(result.partSku).toBe('SKU-001');
      expect(result.reportPeriod.start).toBeInstanceOf(Date);
      expect(result.reportPeriod.end).toBeInstanceOf(Date);
      expect(result.riskAssessment.currentRiskLevel).toBe('medium');
      expect(result.performanceTrends.length).toBeGreaterThanOrEqual(2);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should add positive finding for excellent FPY', async () => {
      mockExtractPartQualitySummary.mockResolvedValue({
        ...sampleQualitySummary,
        firstPassYield: 99,
        totalInspections: 200,
      });

      const result = await analyzer.generateInsightReport('part-1');
      const positiveFinding = result.keyFindings.find((f) => f.type === 'positive');
      expect(positiveFinding).toBeDefined();
      expect(positiveFinding!.title).toBe('Excellent First Pass Yield');
    });

    it('should add negative finding for degrading drift', async () => {
      mockDetectQualityDrift.mockResolvedValue({
        driftDirection: 'degrading',
        driftMagnitude: -12,
      });

      const result = await analyzer.generateInsightReport('part-1');
      const negativeFinding = result.keyFindings.find(
        (f) => f.type === 'negative' && f.title === 'Quality Degradation Trend'
      );
      expect(negativeFinding).toBeDefined();
      expect(negativeFinding!.impact).toBe('high');
    });

    it('should add negative finding for recurring issues', async () => {
      mockDetectRecurringIssues.mockResolvedValue({
        hasRecurringIssues: true,
        issues: [
          { defectCategory: 'Dimensional', isResolved: false, occurrences: 5, frequency: 'high' },
        ],
        totalOccurrences: 5,
      });

      const result = await analyzer.generateInsightReport('part-1');
      const recurringFinding = result.keyFindings.find(
        (f) => f.title === 'Recurring Quality Issues'
      );
      expect(recurringFinding).toBeDefined();
    });

    it('should use fallback executive summary when AI returns empty', async () => {
      const result = await analyzer.generateInsightReport('part-1');
      // executiveSummary should be generated from fallback
      expect(result.executiveSummary).toContain('SKU-001');
    });
  });

  describe('analyzeSupplierQuality', () => {
    beforeEach(() => {
      mockCalculateSupplierQualityScore.mockResolvedValue({
        overallScore: 85,
        grade: 'B',
        trend: 'stable',
        components: {
          acceptanceRate: { score: 90, weight: 0.3 },
          ncrRate: { score: 80, weight: 0.3 },
          responseTime: { score: 85, weight: 0.2 },
          deliveryQuality: { score: 88, weight: 0.2 },
        },
        recommendations: ['Continue monitoring NCR trends', 'Improve quality score'],
      });
    });

    it('should throw when supplier is not found', async () => {
      mockExtractSupplierQualityData.mockResolvedValue(null);
      await expect(analyzer.analyzeSupplierQuality('non-existent')).rejects.toThrow(
        'Supplier not found'
      );
    });

    it('should return supplier quality insight', async () => {
      const result = await analyzer.analyzeSupplierQuality('sup-1');

      expect(result.supplierId).toBe('sup-1');
      expect(result.supplierName).toBe('Supplier A');
      expect(result.qualityScore).toBe(85);
      expect(result.riskProfile.level).toBe('low');
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should classify risk level based on grade', async () => {
      mockCalculateSupplierQualityScore.mockResolvedValue({
        overallScore: 40,
        grade: 'D',
        trend: 'worsening',
        components: {
          acceptanceRate: { score: 40, weight: 0.3 },
          ncrRate: { score: 30, weight: 0.3 },
          responseTime: { score: 50, weight: 0.2 },
          deliveryQuality: { score: 40, weight: 0.2 },
        },
        recommendations: ['NCR rates too high', 'Improve quality controls'],
      });

      const result = await analyzer.analyzeSupplierQuality('sup-1');
      expect(result.riskProfile.level).toBe('high');
    });

    it('should classify medium risk for grade C', async () => {
      mockCalculateSupplierQualityScore.mockResolvedValue({
        overallScore: 65,
        grade: 'C',
        trend: 'stable',
        components: {
          acceptanceRate: { score: 65, weight: 0.3 },
          ncrRate: { score: 60, weight: 0.3 },
          responseTime: { score: 70, weight: 0.2 },
          deliveryQuality: { score: 65, weight: 0.2 },
        },
        recommendations: ['Improve quality'],
      });

      const result = await analyzer.analyzeSupplierQuality('sup-1');
      expect(result.riskProfile.level).toBe('medium');
    });

    it('should parse AI strengths and weaknesses', async () => {
      mockChat.mockResolvedValue({
        content: `STRENGTHS:
- Consistent delivery quality
- Good acceptance rate
WEAKNESSES:
- Slow NCR resolution
COMPARATIVE_ANALYSIS:
Above average compared to industry.
RECOMMENDATION:
Continue partnership with improvement plan.`,
      });

      const result = await analyzer.analyzeSupplierQuality('sup-1');
      expect(result.strengthsAnalysis).toContain('Consistent delivery quality');
      expect(result.weaknessesAnalysis).toContain('Slow NCR resolution');
      expect(result.comparativeAnalysis).toContain('Above average');
      expect(result.aiRecommendation).toContain('Continue partnership');
    });
  });

  describe('predictDefects', () => {
    beforeEach(() => {
      mockPredictNCR.mockResolvedValue({
        partSku: 'SKU-001',
        probability: 0.6,
        expectedNCRCount: { min: 1, max: 3 },
        confidenceLevel: 0.75,
        riskFactors: ['Increasing trend'],
        historicalBasis: { historicalRate: 1.5, recentTrend: 'worsening' },
      });
      mockDetectRecurringIssues.mockResolvedValue({
        issues: [
          {
            defectCategory: 'Dimensional',
            isResolved: false,
            occurrences: 6,
            frequency: 'high',
            pattern: 'monthly',
          },
          {
            defectCategory: 'Surface',
            isResolved: true,
            occurrences: 2,
            frequency: 'low',
            pattern: 'sporadic',
          },
        ],
      });
      mockDetectAnomalies.mockResolvedValue({
        anomalies: [
          {
            type: 'quality_spike',
            severity: 'major',
            affectedMetric: 'NCR Count',
            description: 'NCR spike detected',
            suggestedAction: 'Investigate root cause',
          },
        ],
      });
    });

    it('should return defect prediction insight', async () => {
      const result = await analyzer.predictDefects('part-1', 1);

      expect(result.partId).toBe('part-1');
      expect(result.partSku).toBe('SKU-001');
      expect(result.predictionWindow).toBe('Next 1 month(s)');
      expect(result.confidenceLevel).toBe(0.75);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should build predicted defects from unresolved high-frequency patterns', async () => {
      const result = await analyzer.predictDefects('part-1');

      // Only unresolved + non-low frequency issues become predicted defects
      expect(result.predictedDefects.length).toBe(1);
      expect(result.predictedDefects[0].category).toBe('Dimensional');
      expect(result.predictedDefects[0].probability).toBe(0.7);
    });

    it('should build early warning signals from non-minor anomalies', async () => {
      const result = await analyzer.predictDefects('part-1');

      expect(result.earlyWarningSignals.length).toBe(1);
      expect(result.earlyWarningSignals[0].signal).toBe('NCR spike detected');
      expect(result.earlyWarningSignals[0].severity).toBe('major');
    });

    it('should use AI prevention suggestions when available', async () => {
      mockChat.mockResolvedValue({
        content: `ANALYSIS:
High risk of dimensional defects.
PREVENTIONS:
Dimensional: Implement tighter SPC controls
HIGH_RISK_AREAS:
- Dimensional defects`,
      });

      const result = await analyzer.predictDefects('part-1');
      // The parser extracts ANALYSIS section
      expect(result.aiAnalysis).toContain('High risk of dimensional defects');
    });
  });

  describe('singleton', () => {
    it('should return same instance from getAIQualityAnalyzer', () => {
      const a = getAIQualityAnalyzer();
      const b = getAIQualityAnalyzer();
      expect(a).toBe(b);
    });
  });
});
