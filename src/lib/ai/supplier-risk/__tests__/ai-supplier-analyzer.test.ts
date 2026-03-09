import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AISupplierAnalyzer,
  getAISupplierAnalyzer,
} from '../ai-supplier-analyzer';

// ============================================================================
// MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    supplier: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

vi.mock('@/lib/ai/provider', () => ({
  getAIProvider: vi.fn(() => ({
    chat: vi.fn().mockResolvedValue({ content: '{"executiveSummary":"test"}' }),
  })),
  AIProviderService: vi.fn(),
  createSystemMessage: vi.fn((msg: string) => ({ role: 'system', content: msg })),
  createUserMessage: vi.fn((msg: string) => ({ role: 'user', content: msg })),
}));

vi.mock('../supplier-data-extractor', () => ({
  SupplierDataExtractor: vi.fn(),
  getSupplierDataExtractor: vi.fn(() => ({
    extractComprehensiveData: vi.fn().mockResolvedValue(null),
    extractDeliveryPerformance: vi.fn().mockResolvedValue(null),
    extractQualityHistory: vi.fn().mockResolvedValue(null),
    extractPricingTrends: vi.fn().mockResolvedValue(null),
    extractLeadTimeHistory: vi.fn().mockResolvedValue(null),
  })),
}));

vi.mock('../supplier-performance-scorer', () => ({
  SupplierPerformanceScorer: vi.fn(),
  getSupplierPerformanceScorer: vi.fn(() => ({
    generateScorecard: vi.fn().mockResolvedValue(null),
    getSupplierRankings: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('../risk-calculator', () => ({
  RiskCalculator: vi.fn(),
  getRiskCalculator: vi.fn(() => ({
    calculateSupplierRisk: vi.fn().mockResolvedValue(null),
    calculateSupplyChainRisk: vi.fn().mockResolvedValue({
      overallRiskScore: 40,
      overallRiskLevel: 'medium',
      metrics: { totalActiveSuppliers: 5, suppliersAtRisk: 1, singleSourcePartsPercent: 20, geographicDiversityScore: 70 },
      riskBreakdown: { supplierPerformance: 30, concentration: 40, geographic: 20, singleSource: 25 },
    }),
  })),
}));

vi.mock('../early-warning-system', () => ({
  EarlyWarningSystem: vi.fn(),
  getEarlyWarningSystem: vi.fn(() => ({
    getEarlyWarningSignals: vi.fn().mockResolvedValue([]),
    getAlertSummary: vi.fn().mockResolvedValue({
      totalActiveAlerts: 0,
      alertsBySeverity: { critical: 0, warning: 0, info: 0, emergency: 0 },
    }),
  })),
}));

// ============================================================================
// HELPERS
// ============================================================================

function createMockScorecard(overrides: Record<string, unknown> = {}) {
  return {
    supplierId: 'sup-1',
    supplierName: 'Test Supplier',
    overallScore: 75,
    overallGrade: 'B',
    dimensions: {
      delivery: { score: 80, grade: 'B', weight: 0.3, components: [] },
      quality: { score: 70, grade: 'C', weight: 0.3, components: [] },
      cost: { score: 75, grade: 'B', weight: 0.2, components: [] },
      responsiveness: { score: 72, grade: 'C', weight: 0.2, components: [] },
    },
    trend: { direction: 'stable' as const, changePercent: 0 },
    strengths: ['Good delivery'],
    weaknesses: ['Quality needs improvement'],
    recommendations: ['Improve quality processes'],
    ...overrides,
  };
}

function createMockRiskAssessment(overrides: Record<string, unknown> = {}) {
  return {
    supplierId: 'sup-1',
    riskLevel: 'medium',
    overallRiskScore: 45,
    riskFactors: {
      performance: { score: 40, level: 'medium', details: '' },
      dependency: { score: 55, level: 'medium', details: '' },
      external: { score: 35, level: 'low', details: '' },
      financial: { score: 30, level: 'low', details: '' },
    },
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('AISupplierAnalyzer', () => {
  let analyzer: AISupplierAnalyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new AISupplierAnalyzer();
  });

  describe('getAISupplierAnalyzer', () => {
    it('should return an AISupplierAnalyzer instance', () => {
      const inst = getAISupplierAnalyzer();
      expect(inst).toBeInstanceOf(AISupplierAnalyzer);
    });
  });

  describe('determineConfidenceLevel (via generateSupplierInsight)', () => {
    // We test the private method indirectly through generateSupplierInsight
    it('should return null when no data', async () => {
      const result = await analyzer.generateSupplierInsight('sup-1');
      expect(result).toBeNull();
    });
  });

  describe('compareSuppliers', () => {
    it('should throw when fewer than 2 suppliers', async () => {
      await expect(analyzer.compareSuppliers(['sup-1'])).rejects.toThrow(
        'At least 2 suppliers required for comparison'
      );
    });
  });

  describe('getRiskMitigationPlan', () => {
    it('should return null when risk assessment is null', async () => {
      const result = await analyzer.getRiskMitigationPlan('sup-1');
      expect(result).toBeNull();
    });
  });

  describe('generateNarrativeReport', () => {
    it('should return insufficient data message when no data', async () => {
      const result = await analyzer.generateNarrativeReport('sup-1', 'executive');
      expect(result).toContain('Unable to generate report');
    });
  });

  // Test internal parsing methods via class instance using any
  describe('parseRecommendations', () => {
    it('should handle non-array input', () => {
      const result = (analyzer as any).parseRecommendations(null);
      expect(result).toEqual([]);
    });

    it('should parse valid recommendations', () => {
      const raw = [
        { priority: 'high', category: 'risk_mitigation', title: 'Test', description: 'Desc', expectedOutcome: 'Better', timeframe: '30 days', effortLevel: 'low', roiPotential: 'high' },
      ];
      const result = (analyzer as any).parseRecommendations(raw);
      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe('high');
      expect(result[0].category).toBe('risk_mitigation');
      expect(result[0].effortLevel).toBe('low');
    });

    it('should default invalid categories', () => {
      const raw = [{ category: 'invalid_cat' }];
      const result = (analyzer as any).parseRecommendations(raw);
      expect(result[0].category).toBe('performance_improvement');
    });

    it('should limit to 5 recommendations', () => {
      const raw = Array.from({ length: 10 }, (_, i) => ({ title: `Rec ${i}` }));
      const result = (analyzer as any).parseRecommendations(raw);
      expect(result).toHaveLength(5);
    });
  });

  describe('parseDevelopmentPlan', () => {
    it('should return default plan for null input', () => {
      const result = (analyzer as any).parseDevelopmentPlan(null);
      expect(result.overallGoal).toContain('Improve');
      expect(result.milestones.length).toBeGreaterThan(0);
    });

    it('should parse valid development plan', () => {
      const raw = {
        overallGoal: 'Goal',
        currentState: 'Current',
        targetState: 'Target',
        timeline: '6 months',
        milestones: [{ name: 'M1', description: 'D1', targetDate: '2025-06', dependencies: [] }],
        successMetrics: ['Metric 1'],
        resources: ['Team A'],
      };
      const result = (analyzer as any).parseDevelopmentPlan(raw);
      expect(result.overallGoal).toBe('Goal');
      expect(result.milestones).toHaveLength(1);
      expect(result.milestones[0].status).toBe('not_started');
    });
  });

  describe('mapPriority', () => {
    it('should map string priorities', () => {
      expect((analyzer as any).mapPriority('critical')).toBe('critical');
      expect((analyzer as any).mapPriority('high')).toBe('high');
      expect((analyzer as any).mapPriority('low')).toBe('low');
      expect((analyzer as any).mapPriority('other')).toBe('medium');
    });

    it('should map numeric priorities', () => {
      expect((analyzer as any).mapPriority(0)).toBe('critical');
      expect((analyzer as any).mapPriority(1)).toBe('high');
      expect((analyzer as any).mapPriority(2)).toBe('medium');
      expect((analyzer as any).mapPriority(3)).toBe('low');
    });

    it('should default to medium for undefined', () => {
      expect((analyzer as any).mapPriority(undefined)).toBe('medium');
    });
  });

  describe('determineConfidenceLevel', () => {
    it('should return high for >= 80', () => {
      expect((analyzer as any).determineConfidenceLevel(80)).toBe('high');
      expect((analyzer as any).determineConfidenceLevel(95)).toBe('high');
    });

    it('should return medium for 50-79', () => {
      expect((analyzer as any).determineConfidenceLevel(50)).toBe('medium');
      expect((analyzer as any).determineConfidenceLevel(79)).toBe('medium');
    });

    it('should return low for < 50', () => {
      expect((analyzer as any).determineConfidenceLevel(49)).toBe('low');
      expect((analyzer as any).determineConfidenceLevel(0)).toBe('low');
    });
  });

  describe('predictPerformance', () => {
    it('should predict increase for improving trend', () => {
      const scorecard = createMockScorecard({ overallScore: 70, trend: { direction: 'improving' } });
      const result = (analyzer as any).predictPerformance(scorecard, null);
      expect(result.nextQuarterScore).toBe(73);
      expect(result.trend).toBe('improving');
      expect(result.confidencePercent).toBe(60);
    });

    it('should predict decrease for declining trend', () => {
      const scorecard = createMockScorecard({ overallScore: 70, trend: { direction: 'declining' } });
      const risk = createMockRiskAssessment();
      const result = (analyzer as any).predictPerformance(scorecard, risk);
      expect(result.nextQuarterScore).toBe(65);
      expect(result.confidencePercent).toBe(75);
    });

    it('should clamp score between 0 and 100', () => {
      const scorecard = createMockScorecard({ overallScore: 99, trend: { direction: 'improving' } });
      const result = (analyzer as any).predictPerformance(scorecard, null);
      expect(result.nextQuarterScore).toBeLessThanOrEqual(100);
    });
  });

  describe('generateMitigationStrategies', () => {
    it('should generate strategies for high dependency risk', () => {
      const risk = createMockRiskAssessment({
        riskFactors: {
          dependency: { score: 60 },
          performance: { score: 30 },
          external: { score: 20 },
          financial: { score: 20 },
        },
      });
      const result = (analyzer as any).generateMitigationStrategies(risk);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].strategy).toContain('Dual Sourcing');
    });

    it('should generate strategies for high performance risk', () => {
      const risk = createMockRiskAssessment({
        riskFactors: {
          dependency: { score: 30 },
          performance: { score: 60 },
          external: { score: 20 },
          financial: { score: 20 },
        },
      });
      const result = (analyzer as any).generateMitigationStrategies(risk);
      expect(result.some((s: any) => s.strategy.includes('Performance'))).toBe(true);
    });

    it('should generate strategies for high external risk', () => {
      const risk = createMockRiskAssessment({
        riskFactors: {
          dependency: { score: 30 },
          performance: { score: 30 },
          external: { score: 50 },
          financial: { score: 20 },
        },
      });
      const result = (analyzer as any).generateMitigationStrategies(risk);
      expect(result.some((s: any) => s.strategy.includes('Geographic'))).toBe(true);
    });

    it('should return empty when all risk scores low', () => {
      const risk = createMockRiskAssessment({
        riskFactors: {
          dependency: { score: 10 },
          performance: { score: 10 },
          external: { score: 10 },
          financial: { score: 10 },
        },
      });
      const result = (analyzer as any).generateMitigationStrategies(risk);
      expect(result).toHaveLength(0);
    });
  });

  describe('generateContingencyPlan', () => {
    it('should always return 3 plans', () => {
      const risk = createMockRiskAssessment();
      const result = (analyzer as any).generateContingencyPlan(risk);
      expect(result).toHaveLength(3);
      expect(result[0].scenario).toBe('Supplier production halt');
      expect(result[1].scenario).toBe('Quality failure');
      expect(result[2].scenario).toBe('Business continuity event');
    });
  });

  describe('parseTopConcerns', () => {
    it('should return empty array for non-array', () => {
      expect((analyzer as any).parseTopConcerns(null)).toEqual([]);
    });

    it('should parse valid concerns with defaults', () => {
      const raw = [{ severity: 'critical', title: 'Test' }];
      const result = (analyzer as any).parseTopConcerns(raw);
      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe('critical');
      expect(result[0].recommendedAction).toBe('Review required');
    });
  });

  describe('parseStrategicInitiatives', () => {
    it('should return empty array for non-array', () => {
      expect((analyzer as any).parseStrategicInitiatives(null)).toEqual([]);
    });

    it('should parse and assign priorities', () => {
      const raw = [{ title: 'Init 1' }, { title: 'Init 2' }];
      const result = (analyzer as any).parseStrategicInitiatives(raw);
      expect(result).toHaveLength(2);
      expect(result[0].priority).toBe(1);
      expect(result[1].priority).toBe(2);
    });
  });

  describe('parseOptimizations', () => {
    it('should return empty array for non-array', () => {
      expect((analyzer as any).parseOptimizations(null)).toEqual([]);
    });

    it('should parse valid optimizations with defaults', () => {
      const raw = [{ type: 'cost', title: 'Save money' }];
      const result = (analyzer as any).parseOptimizations(raw);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('cost');
      expect(result[0].implementationComplexity).toBe('medium');
    });
  });

  describe('parseSupplierAnalysis', () => {
    it('should parse JSON response', () => {
      const json = JSON.stringify({
        executiveSummary: 'Summary',
        performanceAnalysis: 'Analysis',
        riskAssessment: 'Risk',
        strategicRecommendations: [],
        developmentPlan: null,
      });
      const result = (analyzer as any).parseSupplierAnalysis(json);
      expect(result.executiveSummary).toBe('Summary');
    });

    it('should fallback for non-JSON text', () => {
      const result = (analyzer as any).parseSupplierAnalysis('Some plain text analysis');
      expect(result.executiveSummary).toBe('Some plain text analysis');
      expect(result.strategicRecommendations).toEqual([]);
    });
  });

  describe('createDimensionComparison', () => {
    it('should rank suppliers by score', () => {
      const scorecards = [
        { supplierId: 's1', scorecard: createMockScorecard({ supplierName: 'S1', dimensions: { ...createMockScorecard().dimensions, delivery: { score: 90, grade: 'A', weight: 0.3, components: [] } } }) },
        { supplierId: 's2', scorecard: createMockScorecard({ supplierName: 'S2', dimensions: { ...createMockScorecard().dimensions, delivery: { score: 70, grade: 'C', weight: 0.3, components: [] } } }) },
      ];
      const result = (analyzer as any).createDimensionComparison(
        'Delivery',
        scorecards,
        (s: any) => s.scorecard.dimensions.delivery.score
      );
      expect(result.dimension).toBe('Delivery');
      expect(result.rankings[0].supplierId).toBe('s1');
      expect(result.rankings[0].rank).toBe(1);
      expect(result.leader).toBe('S1');
    });
  });

  describe('determineBestFor', () => {
    it('should determine best supplier for each category', () => {
      const scorecards = [
        { supplierId: 's1', scorecard: createMockScorecard({ dimensions: { delivery: { score: 90 }, quality: { score: 70 }, cost: { score: 60 }, responsiveness: { score: 85 } } }) },
        { supplierId: 's2', scorecard: createMockScorecard({ dimensions: { delivery: { score: 70 }, quality: { score: 95 }, cost: { score: 80 }, responsiveness: { score: 60 } } }) },
      ];
      const result = (analyzer as any).determineBestFor(scorecards);
      expect(result).toHaveLength(4);
      const deliveryBest = result.find((r: any) => r.category === 'Delivery Performance');
      expect(deliveryBest.supplierId).toBe('s1');
      const qualityBest = result.find((r: any) => r.category === 'Quality Excellence');
      expect(qualityBest.supplierId).toBe('s2');
    });
  });

  describe('generateFallbackSupplyChainAnalysis', () => {
    it('should generate fallback with risk profile data', () => {
      const riskProfile = {
        overallRiskScore: 45,
        overallRiskLevel: 'medium',
        metrics: { totalActiveSuppliers: 10, suppliersAtRisk: 2, singleSourcePartsPercent: 25, geographicDiversityScore: 60 },
        riskBreakdown: { supplierPerformance: 30, concentration: 40, geographic: 25, singleSource: 35 },
      };
      const alertSummary = { totalActiveAlerts: 3 };
      const result = (analyzer as any).generateFallbackSupplyChainAnalysis(riskProfile, alertSummary);
      expect(result.overallAssessment).toContain('45');
      expect(result.confidenceLevel).toBe('medium');
      expect(result.topConcerns.length).toBeGreaterThan(0);
    });
  });
});
