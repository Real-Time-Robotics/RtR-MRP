import { describe, it, expect } from 'vitest';

/**
 * Tests for OEE (Overall Equipment Effectiveness) calculations.
 * OEE = Availability × Performance × Quality
 * Each factor is a percentage (0-100).
 */

interface OEEMetrics {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

interface OEELosses {
  availabilityLoss: number;
  performanceLoss: number;
  qualityLoss: number;
}

// Core OEE calculation logic from src/lib/production/oee-calculator.ts
function calculateOEEMetrics(
  plannedTime: number,    // minutes
  actualRunTime: number,  // minutes
  idealCycleTime: number, // minutes for total output at ideal speed
  totalCount: number,
  goodCount: number
): OEEMetrics {
  const availability = plannedTime > 0 ? (actualRunTime / plannedTime) * 100 : 0;
  const performance = actualRunTime > 0 ? (idealCycleTime / actualRunTime) * 100 : 0;
  const quality = totalCount > 0 ? (goodCount / totalCount) * 100 : 0;

  // OEE = A × P × Q (as percentages, divide by 10000 to get correct result)
  const oee = (Math.min(100, availability) / 100) * (Math.min(100, performance) / 100) * (quality / 100) * 100;

  return {
    availability: Math.round(availability * 100) / 100,
    performance: Math.min(100, Math.round(performance * 100) / 100),
    quality: Math.round(quality * 100) / 100,
    oee: Math.round(oee * 100) / 100,
  };
}

function calculateLosses(
  plannedTime: number,
  actualRunTime: number,
  idealCycleTime: number,
  totalCount: number,
  scrapCount: number
): OEELosses {
  return {
    availabilityLoss: plannedTime - actualRunTime,
    performanceLoss: actualRunTime - idealCycleTime,
    qualityLoss: totalCount > 0 ? idealCycleTime * (scrapCount / totalCount) : 0,
  };
}

function getUtilizationStatus(utilization: number): string {
  if (utilization > 100) return 'over';
  if (utilization > 85) return 'optimal';
  return 'under';
}

describe('OEE Calculator', () => {
  describe('availability calculation', () => {
    it('should calculate 100% when actual equals planned', () => {
      const result = calculateOEEMetrics(480, 480, 400, 100, 100);
      expect(result.availability).toBe(100);
    });

    it('should calculate partial availability', () => {
      const result = calculateOEEMetrics(480, 360, 300, 100, 100);
      expect(result.availability).toBe(75); // 360/480 = 75%
    });

    it('should handle zero planned time', () => {
      const result = calculateOEEMetrics(0, 0, 0, 0, 0);
      expect(result.availability).toBe(0);
    });

    it('should handle downtime scenarios', () => {
      // 8 hour shift, 2 hours downtime
      const result = calculateOEEMetrics(480, 360, 300, 50, 48);
      expect(result.availability).toBe(75);
    });
  });

  describe('performance calculation', () => {
    it('should calculate 100% when running at ideal speed', () => {
      const result = calculateOEEMetrics(480, 400, 400, 100, 100);
      expect(result.performance).toBe(100);
    });

    it('should calculate reduced performance when slower than ideal', () => {
      const result = calculateOEEMetrics(480, 400, 320, 100, 100);
      expect(result.performance).toBe(80); // 320/400 = 80%
    });

    it('should cap performance at 100%', () => {
      // If somehow faster than ideal (shouldn't happen normally)
      const result = calculateOEEMetrics(480, 400, 500, 100, 100);
      expect(result.performance).toBe(100); // capped
    });

    it('should handle zero actual run time', () => {
      const result = calculateOEEMetrics(480, 0, 0, 0, 0);
      expect(result.performance).toBe(0);
    });
  });

  describe('quality calculation', () => {
    it('should calculate 100% when all parts are good', () => {
      const result = calculateOEEMetrics(480, 400, 350, 100, 100);
      expect(result.quality).toBe(100);
    });

    it('should calculate quality with rejects', () => {
      const result = calculateOEEMetrics(480, 400, 350, 100, 95);
      expect(result.quality).toBe(95);
    });

    it('should handle zero total count', () => {
      const result = calculateOEEMetrics(480, 400, 350, 0, 0);
      expect(result.quality).toBe(0);
    });

    it('should handle high scrap rate', () => {
      const result = calculateOEEMetrics(480, 400, 350, 100, 50);
      expect(result.quality).toBe(50);
    });
  });

  describe('OEE composite calculation', () => {
    it('should calculate world-class OEE', () => {
      // 90% × 95% × 99.9% = ~85.4%
      const result = calculateOEEMetrics(480, 432, 410.4, 1000, 999);
      expect(result.oee).toBeGreaterThan(84);
      expect(result.oee).toBeLessThan(86);
    });

    it('should calculate typical OEE', () => {
      // 80% × 80% × 90% = 57.6%
      const result = calculateOEEMetrics(480, 384, 307.2, 100, 90);
      expect(result.oee).toBeCloseTo(57.6, 0);
    });

    it('should return 0 when any factor is 0', () => {
      // Zero availability
      expect(calculateOEEMetrics(480, 0, 0, 100, 100).oee).toBe(0);
      // Zero quality
      expect(calculateOEEMetrics(480, 400, 350, 100, 0).oee).toBe(0);
    });

    it('should handle perfect OEE', () => {
      const result = calculateOEEMetrics(480, 480, 480, 100, 100);
      expect(result.oee).toBe(100);
    });
  });

  describe('losses calculation', () => {
    it('should calculate availability loss', () => {
      const losses = calculateLosses(480, 360, 300, 100, 5);
      expect(losses.availabilityLoss).toBe(120); // 480 - 360
    });

    it('should calculate performance loss', () => {
      const losses = calculateLosses(480, 400, 320, 100, 5);
      expect(losses.performanceLoss).toBe(80); // 400 - 320
    });

    it('should calculate quality loss', () => {
      const losses = calculateLosses(480, 400, 320, 100, 10);
      expect(losses.qualityLoss).toBe(32); // 320 * (10/100)
    });

    it('should handle zero scrap', () => {
      const losses = calculateLosses(480, 400, 320, 100, 0);
      expect(losses.qualityLoss).toBe(0);
    });
  });

  describe('utilization status', () => {
    it('should classify over-utilized', () => {
      expect(getUtilizationStatus(105)).toBe('over');
      expect(getUtilizationStatus(101)).toBe('over');
    });

    it('should classify optimal utilization', () => {
      expect(getUtilizationStatus(90)).toBe('optimal');
      expect(getUtilizationStatus(86)).toBe('optimal');
    });

    it('should classify under-utilized', () => {
      expect(getUtilizationStatus(85)).toBe('under');
      expect(getUtilizationStatus(50)).toBe('under');
      expect(getUtilizationStatus(0)).toBe('under');
    });

    it('should classify boundary at 85% as under', () => {
      expect(getUtilizationStatus(85)).toBe('under');
    });

    it('should classify boundary at 100% as optimal', () => {
      expect(getUtilizationStatus(100)).toBe('optimal');
    });
  });
});
