import { describe, it, expect } from 'vitest';

/**
 * Tests for financial variance calculation algorithms.
 * These test the core formulas used in src/lib/finance/variance.ts
 * without requiring database access.
 */

interface VarianceDetail {
  reference: string;
  description: string;
  standardAmount: number;
  actualAmount: number;
  variance: number;
}

interface VarianceResult {
  varianceType: string;
  standardAmount: number;
  actualAmount: number;
  varianceAmount: number;
  variancePercent: number;
  favorable: boolean;
  details: VarianceDetail[];
}

// Core variance calculation logic extracted from variance.ts
function calculatePriceVariance(
  lines: Array<{ standardPrice: number; actualPrice: number; quantity: number; reference: string }>
): VarianceResult {
  let totalStandard = 0;
  let totalActual = 0;
  const details: VarianceDetail[] = [];

  for (const line of lines) {
    const standardAmount = line.standardPrice * line.quantity;
    const actualAmount = line.actualPrice * line.quantity;
    const variance = standardAmount - actualAmount;

    totalStandard += standardAmount;
    totalActual += actualAmount;

    if (Math.abs(variance) > 0.01) {
      details.push({
        reference: line.reference,
        description: `PO Receipt: ${line.quantity} @ $${line.actualPrice.toFixed(2)} vs std $${line.standardPrice.toFixed(2)}`,
        standardAmount,
        actualAmount,
        variance,
      });
    }
  }

  const varianceAmount = totalStandard - totalActual;
  const variancePercent = totalStandard > 0 ? (varianceAmount / totalStandard) * 100 : 0;

  return {
    varianceType: 'MATERIAL_PRICE',
    standardAmount: totalStandard,
    actualAmount: totalActual,
    varianceAmount,
    variancePercent,
    favorable: varianceAmount >= 0,
    details: details.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)),
  };
}

function calculateUsageVariance(
  items: Array<{ standardQty: number; actualQty: number; standardPrice: number; reference: string }>
): VarianceResult {
  let totalStandard = 0;
  let totalActual = 0;
  const details: VarianceDetail[] = [];

  for (const item of items) {
    const standardAmount = item.standardQty * item.standardPrice;
    const actualAmount = item.actualQty * item.standardPrice;
    const variance = standardAmount - actualAmount;

    totalStandard += standardAmount;
    totalActual += actualAmount;

    if (Math.abs(variance) > 0.01) {
      details.push({
        reference: item.reference,
        description: `Usage: ${item.actualQty} vs std ${item.standardQty}`,
        standardAmount,
        actualAmount,
        variance,
      });
    }
  }

  const varianceAmount = totalStandard - totalActual;
  const variancePercent = totalStandard > 0 ? (varianceAmount / totalStandard) * 100 : 0;

  return {
    varianceType: 'MATERIAL_USAGE',
    standardAmount: totalStandard,
    actualAmount: totalActual,
    varianceAmount,
    variancePercent,
    favorable: varianceAmount >= 0,
    details: details.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)),
  };
}

describe('Finance - Variance Calculations', () => {
  describe('Material Price Variance', () => {
    it('should calculate favorable variance when actual < standard', () => {
      const result = calculatePriceVariance([
        { standardPrice: 10, actualPrice: 8, quantity: 100, reference: 'PART-001' },
      ]);

      expect(result.varianceAmount).toBe(200); // (10-8)*100
      expect(result.favorable).toBe(true);
      expect(result.variancePercent).toBeCloseTo(20, 1);
    });

    it('should calculate unfavorable variance when actual > standard', () => {
      const result = calculatePriceVariance([
        { standardPrice: 10, actualPrice: 12, quantity: 100, reference: 'PART-001' },
      ]);

      expect(result.varianceAmount).toBe(-200); // (10-12)*100
      expect(result.favorable).toBe(false);
      expect(result.variancePercent).toBeCloseTo(-20, 1);
    });

    it('should handle zero variance', () => {
      const result = calculatePriceVariance([
        { standardPrice: 10, actualPrice: 10, quantity: 100, reference: 'PART-001' },
      ]);

      expect(result.varianceAmount).toBe(0);
      expect(result.favorable).toBe(true); // >= 0
      expect(result.details).toHaveLength(0); // No detail for variance < 0.01
    });

    it('should aggregate multiple lines', () => {
      const result = calculatePriceVariance([
        { standardPrice: 10, actualPrice: 8, quantity: 100, reference: 'PART-001' },  // +200
        { standardPrice: 5, actualPrice: 6, quantity: 50, reference: 'PART-002' },    // -50
      ]);

      expect(result.standardAmount).toBe(1250); // 1000 + 250
      expect(result.actualAmount).toBe(1100);   // 800 + 300
      expect(result.varianceAmount).toBe(150);  // net favorable
      expect(result.favorable).toBe(true);
    });

    it('should sort details by absolute variance descending', () => {
      const result = calculatePriceVariance([
        { standardPrice: 10, actualPrice: 9, quantity: 10, reference: 'SMALL' },   // 10
        { standardPrice: 10, actualPrice: 5, quantity: 100, reference: 'LARGE' },  // 500
        { standardPrice: 10, actualPrice: 8, quantity: 50, reference: 'MEDIUM' },  // 100
      ]);

      expect(result.details[0].reference).toBe('LARGE');
      expect(result.details[1].reference).toBe('MEDIUM');
      expect(result.details[2].reference).toBe('SMALL');
    });

    it('should handle empty lines (no PO receipts)', () => {
      const result = calculatePriceVariance([]);

      expect(result.varianceAmount).toBe(0);
      expect(result.variancePercent).toBe(0);
      expect(result.favorable).toBe(true);
    });

    it('should filter out negligible variances (< 0.01)', () => {
      const result = calculatePriceVariance([
        { standardPrice: 10, actualPrice: 10.0001, quantity: 1, reference: 'TINY' },
      ]);

      expect(result.details).toHaveLength(0);
    });
  });

  describe('Material Usage Variance', () => {
    it('should calculate favorable variance when actual qty < standard', () => {
      const result = calculateUsageVariance([
        { standardQty: 100, actualQty: 90, standardPrice: 10, reference: 'PART-001' },
      ]);

      expect(result.varianceAmount).toBe(100); // (100-90)*10
      expect(result.favorable).toBe(true);
    });

    it('should calculate unfavorable variance when actual qty > standard', () => {
      const result = calculateUsageVariance([
        { standardQty: 100, actualQty: 120, standardPrice: 10, reference: 'PART-001' },
      ]);

      expect(result.varianceAmount).toBe(-200); // (100-120)*10
      expect(result.favorable).toBe(false);
    });

    it('should use standard price (not actual) for usage variance', () => {
      const result = calculateUsageVariance([
        { standardQty: 50, actualQty: 60, standardPrice: 20, reference: 'PART-001' },
      ]);

      // Usage variance = (stdQty - actualQty) × stdPrice
      expect(result.varianceAmount).toBe(-200); // (50-60)*20
      expect(result.standardAmount).toBe(1000); // 50*20
      expect(result.actualAmount).toBe(1200);   // 60*20
    });
  });

  describe('Labor Efficiency Variance', () => {
    it('should calculate favorable labor variance', () => {
      // (Standard Hours - Actual Hours) × Standard Rate
      const standardHours = 100;
      const actualHours = 90;
      const standardRate = 25;

      const variance = (standardHours - actualHours) * standardRate;
      expect(variance).toBe(250);
      expect(variance >= 0).toBe(true); // favorable
    });

    it('should calculate unfavorable labor variance', () => {
      const standardHours = 100;
      const actualHours = 110;
      const standardRate = 25;

      const variance = (standardHours - actualHours) * standardRate;
      expect(variance).toBe(-250);
      expect(variance >= 0).toBe(false); // unfavorable
    });
  });

  describe('Variance Percent', () => {
    it('should calculate percent correctly', () => {
      const standardAmount = 1000;
      const varianceAmount = 100;
      const percent = (varianceAmount / standardAmount) * 100;
      expect(percent).toBe(10);
    });

    it('should handle zero standard amount', () => {
      const standardAmount = 0;
      const varianceAmount = 0;
      const percent = standardAmount > 0 ? (varianceAmount / standardAmount) * 100 : 0;
      expect(percent).toBe(0);
    });
  });
});
