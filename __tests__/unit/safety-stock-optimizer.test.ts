// =============================================================================
// UNIT TESTS - SAFETY STOCK OPTIMIZER
// File: __tests__/unit/safety-stock-optimizer.test.ts
// Additional Tests for Safety Stock & MRP Integration
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK IMPLEMENTATIONS
// =============================================================================

/**
 * Z-score lookup for service levels
 */
const Z_SCORES: Record<number, number> = {
  0.80: 0.84,
  0.85: 1.04,
  0.90: 1.28,
  0.95: 1.65,
  0.97: 1.88,
  0.99: 2.33,
  0.999: 3.09,
};

/**
 * Get Z-score for a given service level
 */
function getZScore(serviceLevel: number): number {
  // Find closest service level
  const levels = Object.keys(Z_SCORES).map(Number);
  let closest = levels[0];
  let minDiff = Math.abs(serviceLevel - closest);
  
  for (const level of levels) {
    const diff = Math.abs(serviceLevel - level);
    if (diff < minDiff) {
      minDiff = diff;
      closest = level;
    }
  }
  
  return Z_SCORES[closest] || 1.65;
}

/**
 * Calculate demand statistics
 */
function calculateDemandStats(demandHistory: number[]): {
  mean: number;
  stdDev: number;
  cv: number; // Coefficient of Variation
} {
  if (demandHistory.length === 0) {
    return { mean: 0, stdDev: 0, cv: 0 };
  }
  
  const mean = demandHistory.reduce((a, b) => a + b, 0) / demandHistory.length;
  
  const squaredDiffs = demandHistory.map(x => Math.pow(x - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / demandHistory.length;
  const stdDev = Math.sqrt(variance);
  
  const cv = mean > 0 ? stdDev / mean : 0;
  
  return { mean, stdDev, cv };
}

/**
 * Calculate optimal safety stock with all factors
 */
function calculateOptimalSafetyStock(params: {
  demandHistory: number[];
  leadTimeDays: number;
  leadTimeVariability?: number;
  serviceLevel?: number;
  holidayBuffer?: number;
}): {
  safetyStock: number;
  reorderPoint: number;
  confidence: number;
  factors: {
    demandStdDev: number;
    leadTimeFactor: number;
    serviceLevelZ: number;
    holidayMultiplier: number;
  };
} {
  const {
    demandHistory,
    leadTimeDays,
    leadTimeVariability = 0.1,
    serviceLevel = 0.95,
    holidayBuffer = 0,
  } = params;
  
  const stats = calculateDemandStats(demandHistory);
  const z = getZScore(serviceLevel);
  
  // Calculate base safety stock
  // SS = Z * √(L * σd² + d² * σL²)
  // Where σL is lead time standard deviation (as fraction of lead time)
  const leadTimeStdDev = leadTimeDays * leadTimeVariability;
  const safetyStockBase = z * Math.sqrt(
    leadTimeDays * Math.pow(stats.stdDev, 2) +
    Math.pow(stats.mean, 2) * Math.pow(leadTimeStdDev, 2)
  );
  
  // Apply holiday buffer
  const holidayMultiplier = 1 + holidayBuffer;
  const safetyStock = Math.ceil(safetyStockBase * holidayMultiplier);
  
  // Calculate reorder point
  const avgDailyDemand = stats.mean;
  const reorderPoint = Math.ceil(avgDailyDemand * leadTimeDays + safetyStock);
  
  // Calculate confidence based on data quality
  const dataPoints = demandHistory.length;
  let confidence = 0.5;
  if (dataPoints >= 24) confidence = 0.9;
  else if (dataPoints >= 12) confidence = 0.8;
  else if (dataPoints >= 6) confidence = 0.7;
  else if (dataPoints >= 3) confidence = 0.6;
  
  return {
    safetyStock,
    reorderPoint,
    confidence,
    factors: {
      demandStdDev: stats.stdDev,
      leadTimeFactor: leadTimeDays * (1 + leadTimeVariability),
      serviceLevelZ: z,
      holidayMultiplier,
    },
  };
}

/**
 * Compare current vs recommended inventory parameters
 */
function compareInventoryParams(
  current: { safetyStock: number; reorderPoint: number },
  recommended: { safetyStock: number; reorderPoint: number }
): {
  delta: { safetyStock: number; reorderPoint: number };
  percentChange: { safetyStock: number; reorderPoint: number };
  significantChange: boolean;
} {
  const deltaSS = recommended.safetyStock - current.safetyStock;
  const deltaROP = recommended.reorderPoint - current.reorderPoint;
  
  const percentSS = current.safetyStock > 0 
    ? (deltaSS / current.safetyStock) * 100 
    : (recommended.safetyStock > 0 ? 100 : 0);
  const percentROP = current.reorderPoint > 0 
    ? (deltaROP / current.reorderPoint) * 100 
    : (recommended.reorderPoint > 0 ? 100 : 0);
  
  // Change is significant if > 20%
  const significantChange = Math.abs(percentSS) > 20 || Math.abs(percentROP) > 20;
  
  return {
    delta: { safetyStock: deltaSS, reorderPoint: deltaROP },
    percentChange: { safetyStock: percentSS, reorderPoint: percentROP },
    significantChange,
  };
}

/**
 * Calculate Economic Order Quantity (EOQ)
 */
function calculateEOQ(
  annualDemand: number,
  orderCost: number,
  holdingCostPercent: number,
  unitCost: number
): number {
  // EOQ = √((2 * D * S) / (H * C))
  // D = Annual demand
  // S = Order cost per order
  // H = Holding cost as percentage
  // C = Unit cost
  const holdingCost = holdingCostPercent * unitCost;
  const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCost);
  return Math.ceil(eoq);
}

// =============================================================================
// Z-SCORE TESTS
// =============================================================================

describe('Safety Stock Optimizer: Z-Score Lookup', () => {
  it('should return correct Z-score for 95% service level', () => {
    const z = getZScore(0.95);
    expect(z).toBeCloseTo(1.65, 2);
  });

  it('should return correct Z-score for 99% service level', () => {
    const z = getZScore(0.99);
    expect(z).toBeCloseTo(2.33, 2);
  });

  it('should return correct Z-score for 90% service level', () => {
    const z = getZScore(0.90);
    expect(z).toBeCloseTo(1.28, 2);
  });

  it('should find closest Z-score for intermediate values', () => {
    const z = getZScore(0.93);
    // Should return closest to either 0.90 (1.28) or 0.95 (1.65)
    expect(z).toBeGreaterThanOrEqual(1.28);
    expect(z).toBeLessThanOrEqual(1.65);
  });
});

// =============================================================================
// DEMAND STATISTICS TESTS
// =============================================================================

describe('Safety Stock Optimizer: Demand Statistics', () => {
  it('should calculate correct mean demand', () => {
    const demand = [100, 120, 90, 110, 130];
    const stats = calculateDemandStats(demand);
    
    expect(stats.mean).toBeCloseTo(110, 1);
  });

  it('should calculate correct standard deviation', () => {
    const demand = [100, 100, 100, 100, 100];
    const stats = calculateDemandStats(demand);
    
    expect(stats.stdDev).toBe(0);
    expect(stats.cv).toBe(0);
  });

  it('should calculate coefficient of variation', () => {
    const demand = [100, 110, 90, 120, 80];
    const stats = calculateDemandStats(demand);
    
    // CV = stdDev / mean
    expect(stats.cv).toBeGreaterThan(0);
    expect(stats.cv).toBeLessThan(1);
  });

  it('should handle empty demand history', () => {
    const stats = calculateDemandStats([]);
    
    expect(stats.mean).toBe(0);
    expect(stats.stdDev).toBe(0);
    expect(stats.cv).toBe(0);
  });
});

// =============================================================================
// OPTIMAL SAFETY STOCK CALCULATION TESTS
// =============================================================================

describe('Safety Stock Optimizer: Optimal Calculation', () => {
  it('should calculate safety stock with all factors', () => {
    const result = calculateOptimalSafetyStock({
      demandHistory: [100, 110, 95, 105, 120, 90, 115, 100, 110, 105, 95, 100],
      leadTimeDays: 7,
      leadTimeVariability: 0.1,
      serviceLevel: 0.95,
      holidayBuffer: 0,
    });

    expect(result.safetyStock).toBeGreaterThan(0);
    expect(result.reorderPoint).toBeGreaterThan(result.safetyStock);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8); // 12 data points
  });

  it('should increase safety stock with holiday buffer', () => {
    const baseParams = {
      demandHistory: [100, 110, 95, 105, 120, 90, 115, 100, 110, 105, 95, 100],
      leadTimeDays: 7,
      leadTimeVariability: 0.1,
      serviceLevel: 0.95,
    };

    const withoutBuffer = calculateOptimalSafetyStock({ ...baseParams, holidayBuffer: 0 });
    const withBuffer = calculateOptimalSafetyStock({ ...baseParams, holidayBuffer: 0.3 });

    expect(withBuffer.safetyStock).toBeGreaterThan(withoutBuffer.safetyStock);
    expect(withBuffer.factors.holidayMultiplier).toBe(1.3);
  });

  it('should increase safety stock with higher service level', () => {
    const baseParams = {
      demandHistory: [100, 110, 95, 105, 120, 90, 115, 100, 110, 105, 95, 100],
      leadTimeDays: 7,
      leadTimeVariability: 0.1,
      holidayBuffer: 0,
    };

    const sl90 = calculateOptimalSafetyStock({ ...baseParams, serviceLevel: 0.90 });
    const sl95 = calculateOptimalSafetyStock({ ...baseParams, serviceLevel: 0.95 });
    const sl99 = calculateOptimalSafetyStock({ ...baseParams, serviceLevel: 0.99 });

    expect(sl99.safetyStock).toBeGreaterThan(sl95.safetyStock);
    expect(sl95.safetyStock).toBeGreaterThan(sl90.safetyStock);
  });

  it('should handle high demand variability', () => {
    const highVariability = calculateOptimalSafetyStock({
      demandHistory: [50, 150, 30, 180, 70, 200, 40, 160],
      leadTimeDays: 7,
      serviceLevel: 0.95,
    });

    const lowVariability = calculateOptimalSafetyStock({
      demandHistory: [100, 102, 98, 101, 99, 100, 101, 99],
      leadTimeDays: 7,
      serviceLevel: 0.95,
    });

    expect(highVariability.safetyStock).toBeGreaterThan(lowVariability.safetyStock);
  });

  it('should adjust confidence based on data points', () => {
    const manyPoints = calculateOptimalSafetyStock({
      demandHistory: Array(24).fill(100).map((v, i) => v + (i % 5) * 5),
      leadTimeDays: 7,
      serviceLevel: 0.95,
    });

    const fewPoints = calculateOptimalSafetyStock({
      demandHistory: [100, 110, 95],
      leadTimeDays: 7,
      serviceLevel: 0.95,
    });

    expect(manyPoints.confidence).toBeGreaterThan(fewPoints.confidence);
    expect(manyPoints.confidence).toBeGreaterThanOrEqual(0.9);
    expect(fewPoints.confidence).toBeLessThanOrEqual(0.7);
  });
});

// =============================================================================
// COMPARISON TESTS
// =============================================================================

describe('Safety Stock Optimizer: Comparison', () => {
  it('should correctly calculate delta between current and recommended', () => {
    const current = { safetyStock: 50, reorderPoint: 100 };
    const recommended = { safetyStock: 65, reorderPoint: 120 };

    const comparison = compareInventoryParams(current, recommended);

    expect(comparison.delta.safetyStock).toBe(15);
    expect(comparison.delta.reorderPoint).toBe(20);
  });

  it('should calculate percent change correctly', () => {
    const current = { safetyStock: 100, reorderPoint: 200 };
    const recommended = { safetyStock: 120, reorderPoint: 250 };

    const comparison = compareInventoryParams(current, recommended);

    expect(comparison.percentChange.safetyStock).toBeCloseTo(20, 1);
    expect(comparison.percentChange.reorderPoint).toBeCloseTo(25, 1);
  });

  it('should flag significant changes (>20%)', () => {
    const smallChange = compareInventoryParams(
      { safetyStock: 100, reorderPoint: 200 },
      { safetyStock: 110, reorderPoint: 210 }
    );

    const largeChange = compareInventoryParams(
      { safetyStock: 100, reorderPoint: 200 },
      { safetyStock: 130, reorderPoint: 260 }
    );

    expect(smallChange.significantChange).toBe(false);
    expect(largeChange.significantChange).toBe(true);
  });

  it('should handle zero current values', () => {
    const comparison = compareInventoryParams(
      { safetyStock: 0, reorderPoint: 0 },
      { safetyStock: 50, reorderPoint: 100 }
    );

    expect(comparison.delta.safetyStock).toBe(50);
    expect(comparison.percentChange.safetyStock).toBe(100);
    expect(comparison.significantChange).toBe(true);
  });
});

// =============================================================================
// EOQ CALCULATION TESTS
// =============================================================================

describe('Safety Stock Optimizer: EOQ Calculation', () => {
  it('should calculate correct Economic Order Quantity', () => {
    const eoq = calculateEOQ(
      1200,  // Annual demand: 1200 units
      50,    // Order cost: $50 per order
      0.20,  // Holding cost: 20% per year
      10     // Unit cost: $10
    );

    // EOQ = √((2 * 1200 * 50) / (0.20 * 10))
    // EOQ = √(120000 / 2) = √60000 ≈ 245
    expect(eoq).toBeCloseTo(245, -1);
  });

  it('should increase EOQ with higher demand', () => {
    const lowDemand = calculateEOQ(600, 50, 0.20, 10);
    const highDemand = calculateEOQ(1200, 50, 0.20, 10);

    expect(highDemand).toBeGreaterThan(lowDemand);
  });

  it('should decrease EOQ with higher holding cost', () => {
    const lowHolding = calculateEOQ(1200, 50, 0.10, 10);
    const highHolding = calculateEOQ(1200, 50, 0.30, 10);

    expect(lowHolding).toBeGreaterThan(highHolding);
  });
});

// =============================================================================
// INTEGRATION SCENARIO TESTS
// =============================================================================

describe('Safety Stock Optimizer: Integration Scenarios', () => {
  it('should handle Tết peak season scenario', () => {
    // Simulate pre-Tết demand pattern (higher than normal)
    const preTetDemand = [120, 130, 140, 150, 160, 170];
    
    const result = calculateOptimalSafetyStock({
      demandHistory: preTetDemand,
      leadTimeDays: 14, // Longer lead time during holiday
      holidayBuffer: 0.50, // 50% Tết buffer
      serviceLevel: 0.95,
    });

    expect(result.safetyStock).toBeGreaterThan(100);
    expect(result.factors.holidayMultiplier).toBe(1.5);
  });

  it('should handle new product with limited history', () => {
    const newProductDemand = [100, 110];
    
    const result = calculateOptimalSafetyStock({
      demandHistory: newProductDemand,
      leadTimeDays: 7,
      serviceLevel: 0.95,
    });

    // Should have lower confidence but still calculate
    expect(result.confidence).toBeLessThanOrEqual(0.6);
    expect(result.safetyStock).toBeGreaterThan(0);
  });

  it('should handle seasonal product with varying demand', () => {
    // High demand in some months, low in others
    const seasonalDemand = [
      200, 180, 100, 80, 60, 50, 50, 60, 80, 120, 180, 220
    ];
    
    const result = calculateOptimalSafetyStock({
      demandHistory: seasonalDemand,
      leadTimeDays: 7,
      serviceLevel: 0.95,
    });

    // Should account for high variability
    expect(result.factors.demandStdDev).toBeGreaterThan(50);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });
});
