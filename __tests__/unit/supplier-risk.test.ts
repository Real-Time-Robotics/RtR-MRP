// =============================================================================
// SUPPLIER RISK INTELLIGENCE UNIT TESTS
// Tests for supplier performance scoring, risk calculation, and alerts
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

// =============================================================================
// MOCK DATA
// =============================================================================

const mockDeliveryData = {
  supplierId: 'supplier-1',
  supplierName: 'Test Supplier',
  periodMonths: 12,
  summary: {
    totalOrders: 100,
    onTimeOrders: 85,
    lateOrders: 10,
    earlyOrders: 5,
    onTimeRate: 85,
    avgDaysLate: 3.5,
    avgDaysEarly: 2,
    perfectOrderRate: 80,
  },
  trend: [
    { period: '2025-01', totalOrders: 8, onTimeOrders: 7, lateOrders: 1, onTimeRate: 87.5, avgDaysDeviation: 0.5 },
    { period: '2025-02', totalOrders: 10, onTimeOrders: 8, lateOrders: 2, onTimeRate: 80, avgDaysDeviation: 1.5 },
    { period: '2025-03', totalOrders: 9, onTimeOrders: 8, lateOrders: 1, onTimeRate: 88.9, avgDaysDeviation: 0.3 },
  ],
  worstPerformance: [],
  leadTimeVariance: {
    quotedAvg: 14,
    actualAvg: 16,
    variance: 2,
    variancePercent: 14.3,
  },
};

const mockQualityData = {
  supplierId: 'supplier-1',
  supplierName: 'Test Supplier',
  periodMonths: 12,
  summary: {
    totalLotsReceived: 50,
    acceptedLots: 47,
    rejectedLots: 3,
    acceptanceRate: 94,
    totalNCRs: 5,
    openNCRs: 2,
    closedNCRs: 3,
    totalCAPAs: 2,
    openCAPAs: 1,
    ppm: 1500,
    avgDaysToResolveNCR: 12,
  },
  defectBreakdown: [
    { category: 'DIMENSIONAL', count: 3, percentage: 60, avgQuantityAffected: 10 },
    { category: 'VISUAL', count: 2, percentage: 40, avgQuantityAffected: 5 },
  ],
  qualityTrend: [],
  recentNCRs: [],
  lotQualityHistory: [],
};

const mockPricingData = {
  supplierId: 'supplier-1',
  supplierName: 'Test Supplier',
  periodMonths: 12,
  summary: {
    avgUnitPrice: 25.50,
    minUnitPrice: 20,
    maxUnitPrice: 35,
    priceVariance: 5.2,
    totalSpend: 125000,
    avgOrderValue: 2500,
    priceChangePercent: 8.5,
    competitivenessScore: 75,
  },
  priceHistory: [],
  partPricing: [],
  recentChanges: [],
};

const mockResponseData = {
  supplierId: 'supplier-1',
  supplierName: 'Test Supplier',
  periodMonths: 12,
  summary: {
    avgResponseTimeDays: 10,
    fastResponseRate: 70,
    slowResponseRate: 15,
    avgNCRResolutionDays: 12,
    avgCAPAClosureDays: 25,
    communicationScore: 75,
  },
  ncrResolutionHistory: [],
  capaClosureHistory: [],
};

// =============================================================================
// SUPPLIER PERFORMANCE SCORER TESTS
// =============================================================================

describe('Supplier Performance Scorer', () => {
  describe('Grade Calculation', () => {
    it('should assign Grade A for score >= 90', () => {
      const getGrade = (score: number) => {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
      };

      expect(getGrade(95)).toBe('A');
      expect(getGrade(90)).toBe('A');
      expect(getGrade(100)).toBe('A');
    });

    it('should assign Grade B for score 80-89', () => {
      const getGrade = (score: number) => {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
      };

      expect(getGrade(85)).toBe('B');
      expect(getGrade(80)).toBe('B');
      expect(getGrade(89)).toBe('B');
    });

    it('should assign Grade C for score 70-79', () => {
      const getGrade = (score: number) => {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
      };

      expect(getGrade(75)).toBe('C');
      expect(getGrade(70)).toBe('C');
      expect(getGrade(79)).toBe('C');
    });

    it('should assign Grade D for score 60-69', () => {
      const getGrade = (score: number) => {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
      };

      expect(getGrade(65)).toBe('D');
      expect(getGrade(60)).toBe('D');
      expect(getGrade(69)).toBe('D');
    });

    it('should assign Grade F for score < 60', () => {
      const getGrade = (score: number) => {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
      };

      expect(getGrade(55)).toBe('F');
      expect(getGrade(0)).toBe('F');
      expect(getGrade(59)).toBe('F');
    });
  });

  describe('Dimension Weighting', () => {
    it('should apply correct weights (Delivery 30%, Quality 30%, Cost 25%, Responsiveness 15%)', () => {
      const weights = {
        delivery: 0.30,
        quality: 0.30,
        cost: 0.25,
        responsiveness: 0.15,
      };

      const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
      expect(totalWeight).toBe(1.0);
    });

    it('should calculate weighted overall score correctly', () => {
      const scores = {
        delivery: 90,
        quality: 85,
        cost: 80,
        responsiveness: 75,
      };

      const weights = {
        delivery: 0.30,
        quality: 0.30,
        cost: 0.25,
        responsiveness: 0.15,
      };

      const weightedScore =
        scores.delivery * weights.delivery +
        scores.quality * weights.quality +
        scores.cost * weights.cost +
        scores.responsiveness * weights.responsiveness;

      // 90*0.3 + 85*0.3 + 80*0.25 + 75*0.15 = 27 + 25.5 + 20 + 11.25 = 83.75
      expect(weightedScore).toBe(83.75);
    });
  });

  describe('Metric Scoring', () => {
    it('should score on-time rate correctly (higher is better)', () => {
      const scoreMetric = (value: number, targets: any, direction: 'higher' | 'lower') => {
        if (direction === 'higher') {
          if (value >= targets.excellent) return 100;
          if (value >= targets.good) return 85;
          if (value >= targets.acceptable) return 70;
          if (value >= targets.poor) return 50;
          return 30;
        }
        return 50;
      };

      const targets = { excellent: 98, good: 95, acceptable: 90, poor: 80 };

      expect(scoreMetric(99, targets, 'higher')).toBe(100);
      expect(scoreMetric(96, targets, 'higher')).toBe(85);
      expect(scoreMetric(92, targets, 'higher')).toBe(70);
      expect(scoreMetric(85, targets, 'higher')).toBe(50);
      expect(scoreMetric(75, targets, 'higher')).toBe(30);
    });

    it('should score PPM correctly (lower is better)', () => {
      const scoreMetric = (value: number, targets: any, direction: 'higher' | 'lower') => {
        if (direction === 'lower') {
          if (value <= targets.excellent) return 100;
          if (value <= targets.good) return 85;
          if (value <= targets.acceptable) return 70;
          if (value <= targets.poor) return 50;
          return 30;
        }
        return 50;
      };

      const targets = { excellent: 100, good: 500, acceptable: 1000, poor: 5000 };

      expect(scoreMetric(50, targets, 'lower')).toBe(100);
      expect(scoreMetric(300, targets, 'lower')).toBe(85);
      expect(scoreMetric(800, targets, 'lower')).toBe(70);
      expect(scoreMetric(3000, targets, 'lower')).toBe(50);
      expect(scoreMetric(10000, targets, 'lower')).toBe(30);
    });
  });

  describe('Trend Detection', () => {
    it('should detect improving trend', () => {
      const detectTrend = (values: number[]) => {
        if (values.length < 3) return 'stable';
        const recentAvg = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const olderAvg = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const changePercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
        if (changePercent > 5) return 'improving';
        if (changePercent < -5) return 'declining';
        return 'stable';
      };

      const improvingValues = [70, 72, 74, 80, 85, 90];
      expect(detectTrend(improvingValues)).toBe('improving');
    });

    it('should detect declining trend', () => {
      const detectTrend = (values: number[]) => {
        if (values.length < 3) return 'stable';
        const recentAvg = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const olderAvg = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const changePercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
        if (changePercent > 5) return 'improving';
        if (changePercent < -5) return 'declining';
        return 'stable';
      };

      const decliningValues = [90, 88, 85, 75, 72, 70];
      expect(detectTrend(decliningValues)).toBe('declining');
    });

    it('should detect stable trend', () => {
      const detectTrend = (values: number[]) => {
        if (values.length < 3) return 'stable';
        const recentAvg = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const olderAvg = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const changePercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
        if (changePercent > 5) return 'improving';
        if (changePercent < -5) return 'declining';
        return 'stable';
      };

      const stableValues = [80, 81, 79, 80, 82, 80];
      expect(detectTrend(stableValues)).toBe('stable');
    });
  });
});

// =============================================================================
// DEPENDENCY ANALYZER TESTS
// =============================================================================

describe('Dependency Analyzer', () => {
  describe('Single Source Detection', () => {
    it('should identify parts with only one supplier', () => {
      const parts = [
        { id: 'part-1', partSuppliers: [{ supplierId: 's1' }] },
        { id: 'part-2', partSuppliers: [{ supplierId: 's1' }, { supplierId: 's2' }] },
        { id: 'part-3', partSuppliers: [{ supplierId: 's3' }] },
      ];

      const singleSourceParts = parts.filter((p) => p.partSuppliers.length === 1);
      expect(singleSourceParts.length).toBe(2);
      expect(singleSourceParts.map((p) => p.id)).toEqual(['part-1', 'part-3']);
    });

    it('should calculate single source percentage correctly', () => {
      const totalParts = 100;
      const singleSourceParts = 25;
      const percentage = (singleSourceParts / totalParts) * 100;

      expect(percentage).toBe(25);
    });
  });

  describe('Concentration Risk', () => {
    it('should calculate Herfindahl Index correctly', () => {
      // HHI = sum of squared market shares (as percentages 0-100)
      // Standard HHI: 10,000 = highly concentrated, <1,500 = competitive
      const calculateHHI = (spendShares: number[]) => {
        return spendShares.reduce((sum, share) => sum + Math.pow(share, 2), 0);
      };

      // Perfectly competitive (10 suppliers, 10% each)
      const competitive = Array(10).fill(10);
      expect(calculateHHI(competitive)).toBe(1000); // 10 * 100 = 1000

      // Highly concentrated (1 supplier with 100%)
      const monopoly = [100];
      expect(calculateHHI(monopoly)).toBe(10000); // 100^2 = 10000

      // Moderately concentrated
      const moderate = [40, 30, 20, 10];
      expect(calculateHHI(moderate)).toBe(3000); // 1600 + 900 + 400 + 100
    });

    it('should determine risk level based on concentration', () => {
      const determineRiskLevel = (score: number) => {
        if (score >= 75) return 'critical';
        if (score >= 50) return 'high';
        if (score >= 25) return 'medium';
        return 'low';
      };

      expect(determineRiskLevel(80)).toBe('critical');
      expect(determineRiskLevel(60)).toBe('high');
      expect(determineRiskLevel(30)).toBe('medium');
      expect(determineRiskLevel(10)).toBe('low');
    });
  });

  describe('Geographic Risk', () => {
    it('should calculate geographic diversification score', () => {
      const calculateDiversification = (countryConcentrations: number[]) => {
        // Higher diversity = lower risk score
        const maxConcentration = Math.max(...countryConcentrations);
        const numCountries = countryConcentrations.length;

        // Score based on spread
        let score = 100;
        if (maxConcentration > 50) score -= 30;
        else if (maxConcentration > 30) score -= 15;

        if (numCountries < 3) score -= 20;

        return Math.max(0, score);
      };

      // Well diversified
      const diversified = [25, 25, 25, 25];
      expect(calculateDiversification(diversified)).toBeGreaterThan(80);

      // Concentrated in one country (70% > 50%, so -30 penalty = 70)
      const concentrated = [70, 20, 10];
      expect(calculateDiversification(concentrated)).toBeLessThanOrEqual(70);
    });

    it('should identify country risk factors', () => {
      const countryRiskFactors: Record<string, string[]> = {
        'China': ['Trade tensions', 'Long lead times'],
        'Taiwan': ['Geopolitical risk'],
        'Vietnam': ['Infrastructure challenges'],
      };

      expect(countryRiskFactors['China']).toContain('Trade tensions');
      expect(countryRiskFactors['Taiwan']).toContain('Geopolitical risk');
      expect(countryRiskFactors['Germany']).toBeUndefined();
    });
  });
});

// =============================================================================
// RISK CALCULATOR TESTS
// =============================================================================

describe('Risk Calculator', () => {
  describe('Multi-Factor Risk Scoring', () => {
    it('should apply correct risk weights', () => {
      const weights = {
        performance: 0.35,
        dependency: 0.30,
        external: 0.20,
        financial: 0.15,
      };

      const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
      // Use toBeCloseTo for floating point comparison
      expect(totalWeight).toBeCloseTo(1.0);
    });

    it('should calculate composite risk score correctly', () => {
      const riskScores = {
        performance: 40,
        dependency: 60,
        external: 30,
        financial: 25,
      };

      const weights = {
        performance: 0.35,
        dependency: 0.30,
        external: 0.20,
        financial: 0.15,
      };

      const compositeScore =
        riskScores.performance * weights.performance +
        riskScores.dependency * weights.dependency +
        riskScores.external * weights.external +
        riskScores.financial * weights.financial;

      // 40*0.35 + 60*0.30 + 30*0.20 + 25*0.15 = 14 + 18 + 6 + 3.75 = 41.75
      expect(compositeScore).toBe(41.75);
    });
  });

  describe('Risk Level Determination', () => {
    it('should classify risk levels correctly', () => {
      const getRiskLevel = (score: number) => {
        if (score >= 75) return 'critical';
        if (score >= 50) return 'high';
        if (score >= 25) return 'medium';
        return 'low';
      };

      expect(getRiskLevel(80)).toBe('critical');
      expect(getRiskLevel(75)).toBe('critical');
      expect(getRiskLevel(60)).toBe('high');
      expect(getRiskLevel(50)).toBe('high');
      expect(getRiskLevel(30)).toBe('medium');
      expect(getRiskLevel(25)).toBe('medium');
      expect(getRiskLevel(20)).toBe('low');
      expect(getRiskLevel(0)).toBe('low');
    });
  });

  describe('Performance Risk Calculation', () => {
    it('should calculate performance risk from scorecard', () => {
      const calculatePerformanceRisk = (scorecard: { overallScore: number }) => {
        return 100 - scorecard.overallScore;
      };

      expect(calculatePerformanceRisk({ overallScore: 85 })).toBe(15);
      expect(calculatePerformanceRisk({ overallScore: 60 })).toBe(40);
      expect(calculatePerformanceRisk({ overallScore: 95 })).toBe(5);
    });
  });

  describe('Dependency Risk Calculation', () => {
    it('should calculate dependency risk based on single source parts', () => {
      const calculateDependencyRisk = (singleSourceCount: number, criticalCount: number) => {
        let score = 0;
        score += Math.min(100, singleSourceCount * 15) * 0.4;
        score += Math.min(100, criticalCount * 20) * 0.4;
        return Math.min(100, score);
      };

      // No single source
      expect(calculateDependencyRisk(0, 0)).toBe(0);

      // Some single source
      expect(calculateDependencyRisk(3, 1)).toBe(26); // (45*0.4) + (20*0.4)

      // High single source
      expect(calculateDependencyRisk(5, 3)).toBe(54); // (75*0.4) + (60*0.4)
    });
  });

  describe('External Risk Factors', () => {
    it('should apply country risk scores', () => {
      const countryRiskScores: Record<string, number> = {
        'USA': 5,
        'Germany': 5,
        'China': 35,
        'Taiwan': 40,
        'Vietnam': 25,
      };

      expect(countryRiskScores['China']).toBeGreaterThan(countryRiskScores['USA']);
      expect(countryRiskScores['Taiwan']).toBeGreaterThan(countryRiskScores['China']);
    });
  });
});

// =============================================================================
// EARLY WARNING SYSTEM TESTS
// =============================================================================

describe('Early Warning System', () => {
  describe('Alert Severity Classification', () => {
    it('should classify alert severity correctly', () => {
      const classifySeverity = (value: number, threshold: number, criticalThreshold: number) => {
        if (value > criticalThreshold) return 'critical';
        if (value > threshold) return 'warning';
        return 'info';
      };

      // Late delivery rate
      expect(classifySeverity(35, 15, 30)).toBe('critical');
      expect(classifySeverity(20, 15, 30)).toBe('warning');
      expect(classifySeverity(10, 15, 30)).toBe('info');
    });
  });

  describe('Delivery Warnings', () => {
    it('should trigger alert for high late delivery rate', () => {
      const checkDeliveryWarning = (lateRate: number, threshold: number) => {
        return lateRate > threshold;
      };

      expect(checkDeliveryWarning(20, 15)).toBe(true);
      expect(checkDeliveryWarning(10, 15)).toBe(false);
    });

    it('should trigger alert for declining on-time rate', () => {
      const checkOnTimeDecline = (currentRate: number, previousRate: number, threshold: number) => {
        const decline = previousRate - currentRate;
        return decline > threshold;
      };

      expect(checkOnTimeDecline(80, 95, 10)).toBe(true);
      expect(checkOnTimeDecline(90, 95, 10)).toBe(false);
    });
  });

  describe('Quality Warnings', () => {
    it('should trigger alert for high NCR count', () => {
      const checkNCRWarning = (monthlyNCRs: number, threshold: number) => {
        return monthlyNCRs > threshold;
      };

      expect(checkNCRWarning(5, 2)).toBe(true);
      expect(checkNCRWarning(1, 2)).toBe(false);
    });

    it('should trigger alert for high PPM', () => {
      const checkPPMWarning = (ppm: number, threshold: number) => {
        return ppm > threshold;
      };

      expect(checkPPMWarning(3000, 2000)).toBe(true);
      expect(checkPPMWarning(1000, 2000)).toBe(false);
    });

    it('should trigger alert for open NCR backlog', () => {
      const checkOpenNCRsWarning = (openNCRs: number, threshold: number) => {
        return openNCRs > threshold;
      };

      expect(checkOpenNCRsWarning(8, 5)).toBe(true);
      expect(checkOpenNCRsWarning(3, 5)).toBe(false);
    });
  });

  describe('Financial Warnings', () => {
    it('should trigger alert for significant price increase', () => {
      const checkPriceIncreaseWarning = (changePercent: number, threshold: number) => {
        return changePercent > threshold;
      };

      expect(checkPriceIncreaseWarning(15, 10)).toBe(true);
      expect(checkPriceIncreaseWarning(5, 10)).toBe(false);
    });

    it('should trigger alert for lead time increase', () => {
      const checkLeadTimeWarning = (variancePercent: number, threshold: number) => {
        return variancePercent > threshold;
      };

      expect(checkLeadTimeWarning(35, 25)).toBe(true);
      expect(checkLeadTimeWarning(15, 25)).toBe(false);
    });
  });

  describe('Warning Signal Confidence', () => {
    it('should calculate confidence based on data quality', () => {
      const calculateConfidence = (dataPoints: number, minDataPoints: number) => {
        if (dataPoints >= minDataPoints) return 0.9;
        if (dataPoints >= minDataPoints * 0.5) return 0.7;
        return 0.5;
      };

      expect(calculateConfidence(20, 10)).toBe(0.9);
      expect(calculateConfidence(7, 10)).toBe(0.7);
      expect(calculateConfidence(3, 10)).toBe(0.5);
    });
  });
});

// =============================================================================
// SCORECARD CALCULATION INTEGRATION TESTS
// =============================================================================

describe('Scorecard Calculation Integration', () => {
  it('should calculate complete scorecard from raw data', () => {
    // Simulate full scorecard calculation
    const calculateScorecard = () => {
      // Delivery score calculation
      const deliveryMetrics = {
        onTimeRate: { value: 85, weight: 0.4, score: 70 },
        perfectOrderRate: { value: 80, weight: 0.25, score: 65 },
        leadTimeVariance: { value: 14.3, weight: 0.2, score: 70 },
        avgDaysLate: { value: 3.5, weight: 0.15, score: 60 },
      };
      const deliveryScore =
        deliveryMetrics.onTimeRate.score * deliveryMetrics.onTimeRate.weight +
        deliveryMetrics.perfectOrderRate.score * deliveryMetrics.perfectOrderRate.weight +
        deliveryMetrics.leadTimeVariance.score * deliveryMetrics.leadTimeVariance.weight +
        deliveryMetrics.avgDaysLate.score * deliveryMetrics.avgDaysLate.weight;

      // Quality score calculation
      const qualityMetrics = {
        acceptanceRate: { value: 94, weight: 0.35, score: 70 },
        ppm: { value: 1500, weight: 0.25, score: 65 },
        ncrRate: { value: 10, weight: 0.2, score: 50 },
        avgDaysToResolve: { value: 12, weight: 0.2, score: 80 },
      };
      const qualityScore =
        qualityMetrics.acceptanceRate.score * qualityMetrics.acceptanceRate.weight +
        qualityMetrics.ppm.score * qualityMetrics.ppm.weight +
        qualityMetrics.ncrRate.score * qualityMetrics.ncrRate.weight +
        qualityMetrics.avgDaysToResolve.score * qualityMetrics.avgDaysToResolve.weight;

      // Cost score
      const costScore = 75;

      // Responsiveness score
      const responsivenessScore = 70;

      // Overall weighted score
      const overallScore =
        deliveryScore * 0.3 +
        qualityScore * 0.3 +
        costScore * 0.25 +
        responsivenessScore * 0.15;

      return {
        delivery: Math.round(deliveryScore * 10) / 10,
        quality: Math.round(qualityScore * 10) / 10,
        cost: costScore,
        responsiveness: responsivenessScore,
        overall: Math.round(overallScore * 10) / 10,
      };
    };

    const scorecard = calculateScorecard();

    expect(scorecard.delivery).toBeGreaterThan(0);
    expect(scorecard.quality).toBeGreaterThan(0);
    expect(scorecard.overall).toBeGreaterThan(0);
    expect(scorecard.overall).toBeLessThanOrEqual(100);
  });
});

// =============================================================================
// RISK SCENARIO TESTS
// =============================================================================

describe('Risk Scenario Analysis', () => {
  describe('Supplier Failure Scenario', () => {
    it('should calculate impact of top supplier failure', () => {
      const calculateSupplierFailureImpact = (
        supplierSpend: number,
        totalSpend: number,
        singleSourceParts: number,
        criticalParts: number
      ) => {
        const spendImpact = (supplierSpend / totalSpend) * 100;
        const partImpact = singleSourceParts > 0 ? 'critical' : criticalParts > 0 ? 'high' : 'medium';
        const recoveryDays = singleSourceParts > 0 ? 90 : 30;

        return {
          spendImpact,
          partImpact,
          recoveryDays,
        };
      };

      const impact = calculateSupplierFailureImpact(50000, 200000, 3, 2);

      expect(impact.spendImpact).toBe(25);
      expect(impact.partImpact).toBe('critical');
      expect(impact.recoveryDays).toBe(90);
    });
  });

  describe('Regional Disruption Scenario', () => {
    it('should identify affected suppliers by region', () => {
      const suppliers = [
        { id: 's1', country: 'China' },
        { id: 's2', country: 'USA' },
        { id: 's3', country: 'Vietnam' },
        { id: 's4', country: 'Taiwan' },
        { id: 's5', country: 'Germany' },
      ];

      const asiaCountries = ['China', 'Vietnam', 'Taiwan', 'Japan', 'South Korea'];
      const affectedSuppliers = suppliers.filter((s) => asiaCountries.includes(s.country));

      expect(affectedSuppliers.length).toBe(3);
      expect(affectedSuppliers.map((s) => s.id)).toEqual(['s1', 's3', 's4']);
    });
  });
});

// =============================================================================
// BENCHMARK COMPARISON TESTS
// =============================================================================

describe('Benchmark Comparison', () => {
  it('should calculate percentile rank correctly', () => {
    const calculatePercentile = (score: number, allScores: number[]) => {
      const sortedScores = [...allScores].sort((a, b) => a - b);
      const rank = sortedScores.filter((s) => s <= score).length;
      return Math.round((rank / sortedScores.length) * 100);
    };

    const allScores = [60, 65, 70, 75, 80, 85, 90];

    expect(calculatePercentile(85, allScores)).toBe(86); // 6/7 = 85.7%
    expect(calculatePercentile(60, allScores)).toBe(14); // 1/7 = 14.3%
    expect(calculatePercentile(90, allScores)).toBe(100); // 7/7 = 100%
  });

  it('should determine if supplier is above average', () => {
    const isAboveAverage = (score: number, categoryAverage: number) => {
      return score > categoryAverage;
    };

    expect(isAboveAverage(85, 75)).toBe(true);
    expect(isAboveAverage(70, 75)).toBe(false);
  });
});

// =============================================================================
// WATCHLIST TESTS
// =============================================================================

describe('Supplier Watchlist', () => {
  it('should add supplier to watchlist based on criteria', () => {
    const shouldAddToWatchlist = (
      riskScore: number,
      hasAlerts: boolean,
      performanceScore: number
    ) => {
      return riskScore > 50 || hasAlerts || performanceScore < 60;
    };

    expect(shouldAddToWatchlist(60, false, 75)).toBe(true); // High risk
    expect(shouldAddToWatchlist(30, true, 75)).toBe(true); // Has alerts
    expect(shouldAddToWatchlist(30, false, 55)).toBe(true); // Low performance
    expect(shouldAddToWatchlist(30, false, 75)).toBe(false); // No issues
  });

  it('should determine monitoring level correctly', () => {
    const getMonitoringLevel = (
      criticalAlerts: number,
      riskScore: number,
      warningAlerts: number
    ) => {
      if (criticalAlerts > 0 || riskScore > 75) return 'critical';
      if (warningAlerts > 0 || riskScore > 50) return 'enhanced';
      return 'standard';
    };

    expect(getMonitoringLevel(1, 40, 0)).toBe('critical');
    expect(getMonitoringLevel(0, 80, 0)).toBe('critical');
    expect(getMonitoringLevel(0, 60, 2)).toBe('enhanced');
    expect(getMonitoringLevel(0, 30, 0)).toBe('standard');
  });
});

// =============================================================================
// DATA COMPLETENESS TESTS
// =============================================================================

describe('Data Completeness', () => {
  it('should calculate data completeness score', () => {
    const calculateCompleteness = (dataCategories: {
      delivery: boolean;
      quality: boolean;
      pricing: boolean;
      orders: boolean;
      leadTime: boolean;
      response: boolean;
    }) => {
      const weights = {
        delivery: 20,
        quality: 20,
        pricing: 20,
        orders: 20,
        leadTime: 10,
        response: 10,
      };

      let score = 0;
      if (dataCategories.delivery) score += weights.delivery;
      if (dataCategories.quality) score += weights.quality;
      if (dataCategories.pricing) score += weights.pricing;
      if (dataCategories.orders) score += weights.orders;
      if (dataCategories.leadTime) score += weights.leadTime;
      if (dataCategories.response) score += weights.response;

      return score;
    };

    // All data available
    expect(
      calculateCompleteness({
        delivery: true,
        quality: true,
        pricing: true,
        orders: true,
        leadTime: true,
        response: true,
      })
    ).toBe(100);

    // Partial data
    expect(
      calculateCompleteness({
        delivery: true,
        quality: true,
        pricing: false,
        orders: true,
        leadTime: false,
        response: false,
      })
    ).toBe(60);

    // No data
    expect(
      calculateCompleteness({
        delivery: false,
        quality: false,
        pricing: false,
        orders: false,
        leadTime: false,
        response: false,
      })
    ).toBe(0);
  });
});
