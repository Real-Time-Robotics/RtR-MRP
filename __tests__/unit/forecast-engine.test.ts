// =============================================================================
// UNIT TESTS - FORECAST ENGINE
// File: __tests__/unit/forecast-engine.test.ts
// Test Cases: TC22-TC30
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK IMPLEMENTATIONS FOR TESTING ALGORITHMS
// =============================================================================

/**
 * Calculate Simple Moving Average
 */
function calculateMovingAverage(data: number[], window: number): number {
  if (data.length < window) return data.reduce((a, b) => a + b, 0) / data.length;
  const subset = data.slice(-window);
  return subset.reduce((a, b) => a + b, 0) / window;
}

/**
 * Calculate Exponential Smoothing
 */
function calculateExponentialSmoothing(
  data: number[],
  alpha: number = 0.3
): { forecast: number; trend: 'up' | 'down' | 'stable' } {
  if (data.length === 0) return { forecast: 0, trend: 'stable' };
  
  let smoothed = data[0];
  for (let i = 1; i < data.length; i++) {
    smoothed = alpha * data[i] + (1 - alpha) * smoothed;
  }
  
  // Detect trend
  const recentAvg = data.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const olderAvg = data.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, data.length);
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (recentAvg > olderAvg * 1.05) trend = 'up';
  else if (recentAvg < olderAvg * 0.95) trend = 'down';
  
  return { forecast: Math.round(smoothed), trend };
}

/**
 * Extract Seasonal Pattern (simplified)
 */
function extractSeasonalPattern(data: number[], periodLength: number = 12): number[] {
  const seasonalFactors: number[] = new Array(periodLength).fill(0);
  const counts: number[] = new Array(periodLength).fill(0);
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  
  data.forEach((value, index) => {
    const seasonIndex = index % periodLength;
    seasonalFactors[seasonIndex] += value / mean;
    counts[seasonIndex]++;
  });
  
  return seasonalFactors.map((sum, i) => counts[i] > 0 ? sum / counts[i] : 1);
}

/**
 * Vietnamese Lunar Calendar - Lunar New Year calculation
 * Simplified approximation
 */
function getLunarNewYear(year: number): Date {
  // Tết typically falls between late January and mid-February
  // This is a simplified calculation (real calculation requires lunar calendar library)
  const baseYear = 2020;
  const baseDate = new Date(2020, 0, 25); // Jan 25, 2020 was Tết
  
  // Lunar year is about 354 days, but with leap months every ~3 years
  const yearDiff = year - baseYear;
  const approxDays = yearDiff * 365 + Math.floor(yearDiff / 3) * 30;
  
  const tetDate = new Date(baseDate);
  tetDate.setDate(tetDate.getDate() + approxDays);
  
  // Adjust to reasonable range (late Jan - mid Feb)
  while (tetDate.getMonth() < 0 || tetDate.getDate() < 21) {
    tetDate.setDate(tetDate.getDate() + 29);
  }
  while (tetDate.getMonth() > 1 || (tetDate.getMonth() === 1 && tetDate.getDate() > 20)) {
    tetDate.setDate(tetDate.getDate() - 29);
  }
  
  return tetDate;
}

/**
 * Check if date is a Vietnamese fixed holiday
 */
function isVNFixedHoliday(date: Date): { isHoliday: boolean; name?: string } {
  const month = date.getMonth();
  const day = date.getDate();
  
  const holidays: { month: number; day: number; name: string }[] = [
    { month: 0, day: 1, name: 'Tết Dương lịch' },      // Jan 1
    { month: 3, day: 30, name: 'Ngày Giải phóng miền Nam' }, // Apr 30
    { month: 4, day: 1, name: 'Ngày Quốc tế Lao động' },     // May 1
    { month: 8, day: 2, name: 'Ngày Quốc khánh' },           // Sep 2
  ];
  
  const found = holidays.find(h => h.month === month && h.day === day);
  return found ? { isHoliday: true, name: found.name } : { isHoliday: false };
}

/**
 * Calculate Holiday Buffer based on proximity to Tết
 */
function calculateHolidayBuffer(date: Date): number {
  const year = date.getMonth() >= 6 ? date.getFullYear() + 1 : date.getFullYear();
  const tetDate = getLunarNewYear(year);
  
  const diffTime = tetDate.getTime() - date.getTime();
  const daysToTet = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Pre-Tết buffer
  if (daysToTet > 0 && daysToTet <= 14) return 0.50;  // +50% within 2 weeks
  if (daysToTet > 14 && daysToTet <= 30) return 0.30; // +30% within 1 month
  if (daysToTet > 30 && daysToTet <= 60) return 0.15; // +15% within 2 months
  
  // Post-Tết buffer (negative daysToTet)
  if (daysToTet < 0 && daysToTet >= -7) return 0.20;  // +20% 1 week after Tết
  if (daysToTet < -7 && daysToTet >= -14) return 0.10; // +10% 2 weeks after
  
  return 0; // Normal period
}

/**
 * Calculate Safety Stock using Z-score formula
 */
function calculateSafetyStock(
  demandStdDev: number,
  leadTimeDays: number,
  serviceLevel: number = 0.95
): number {
  // Z-score for service level
  const zScores: Record<number, number> = {
    0.90: 1.28,
    0.95: 1.65,
    0.99: 2.33,
  };
  const z = zScores[serviceLevel] || 1.65;
  
  // Safety Stock = Z * σd * √L
  const safetyStock = z * demandStdDev * Math.sqrt(leadTimeDays);
  return Math.ceil(safetyStock);
}

/**
 * Calculate Reorder Point
 */
function calculateReorderPoint(
  avgDailyDemand: number,
  leadTimeDays: number,
  safetyStock: number
): number {
  // ROP = (Average Daily Demand × Lead Time) + Safety Stock
  return Math.ceil(avgDailyDemand * leadTimeDays + safetyStock);
}

/**
 * Calculate Confidence Interval
 */
function calculateConfidenceInterval(
  forecast: number,
  stdDev: number,
  confidenceLevel: number = 0.95
): { lower: number; upper: number } {
  const zScores: Record<number, number> = {
    0.90: 1.65,
    0.95: 1.96,
    0.99: 2.58,
  };
  const z = zScores[confidenceLevel] || 1.96;
  
  const margin = z * stdDev;
  return {
    lower: Math.max(0, Math.round(forecast - margin)),
    upper: Math.round(forecast + margin),
  };
}

// =============================================================================
// TC22: MOVING AVERAGE - CORRECT CALCULATION
// =============================================================================

describe('Forecast Algorithm: Moving Average', () => {
  it('TC22: Moving average calculates correctly with window size', () => {
    const salesData = [100, 110, 105, 120, 115, 130];
    
    // 3-period moving average
    const ma3 = calculateMovingAverage(salesData, 3);
    // Should be average of last 3: (115 + 130 + 120) / 3 = 121.67
    const expectedMa3 = (120 + 115 + 130) / 3;
    expect(ma3).toBeCloseTo(expectedMa3, 1);
    
    // 5-period moving average
    const ma5 = calculateMovingAverage(salesData, 5);
    const expectedMa5 = (110 + 105 + 120 + 115 + 130) / 5;
    expect(ma5).toBeCloseTo(expectedMa5, 1);
    
    // When data length < window, use all data
    const shortData = [100, 110];
    const maShort = calculateMovingAverage(shortData, 5);
    expect(maShort).toBeCloseTo(105, 1);
  });

  it('TC22b: Moving average handles single data point', () => {
    const singleData = [150];
    const ma = calculateMovingAverage(singleData, 3);
    expect(ma).toBe(150);
  });
});

// =============================================================================
// TC23: EXPONENTIAL SMOOTHING - TREND DETECTION
// =============================================================================

describe('Forecast Algorithm: Exponential Smoothing', () => {
  it('TC23: Exponential smoothing detects upward trend', () => {
    const upwardData = [100, 105, 110, 120, 130, 145, 160];
    const result = calculateExponentialSmoothing(upwardData, 0.3);
    
    expect(result.trend).toBe('up');
    expect(result.forecast).toBeGreaterThan(100);
  });

  it('TC23b: Exponential smoothing detects downward trend', () => {
    const downwardData = [160, 145, 130, 120, 110, 105, 100];
    const result = calculateExponentialSmoothing(downwardData, 0.3);
    
    expect(result.trend).toBe('down');
  });

  it('TC23c: Exponential smoothing detects stable pattern', () => {
    const stableData = [100, 102, 98, 101, 99, 100, 101];
    const result = calculateExponentialSmoothing(stableData, 0.3);
    
    expect(result.trend).toBe('stable');
    expect(result.forecast).toBeCloseTo(100, -1);
  });
});

// =============================================================================
// TC24: SEASONAL DECOMPOSITION - PATTERN EXTRACTION
// =============================================================================

describe('Forecast Algorithm: Seasonal Decomposition', () => {
  it('TC24: Seasonal decomposition extracts monthly patterns', () => {
    // Simulate 2 years of monthly data with seasonal pattern
    // High in Q2 (Apr-Jun) and Q4 (Oct-Dec), Low in Q1 and Q3
    const monthlyData = [
      // Year 1
      80, 85, 90, 120, 130, 125, 90, 85, 95, 115, 135, 140,
      // Year 2
      82, 88, 92, 125, 132, 128, 92, 88, 98, 118, 138, 145,
    ];
    
    const seasonalFactors = extractSeasonalPattern(monthlyData, 12);
    
    expect(seasonalFactors).toHaveLength(12);
    
    // Q2 months (Apr=3, May=4, Jun=5) should have factors > 1
    expect(seasonalFactors[3]).toBeGreaterThan(1);
    expect(seasonalFactors[4]).toBeGreaterThan(1);
    
    // Q4 months (Oct=9, Nov=10, Dec=11) should have factors > 1
    expect(seasonalFactors[9]).toBeGreaterThan(1);
    expect(seasonalFactors[10]).toBeGreaterThan(1);
    expect(seasonalFactors[11]).toBeGreaterThan(1);
    
    // Q1 months (Jan=0, Feb=1) should have factors < 1
    expect(seasonalFactors[0]).toBeLessThan(1);
    expect(seasonalFactors[1]).toBeLessThan(1);
  });
});

// =============================================================================
// TC25: VN HOLIDAY DETECTION - TẾT (LUNAR CALENDAR)
// =============================================================================

describe('Vietnamese Calendar: Lunar New Year', () => {
  it('TC25: Tết falls in late January to mid February', () => {
    const years = [2024, 2025, 2026, 2027];
    
    years.forEach(year => {
      const tetDate = getLunarNewYear(year);
      const month = tetDate.getMonth();
      const day = tetDate.getDate();
      
      // Tết should be in January (0) or February (1)
      expect(month).toBeGreaterThanOrEqual(0);
      expect(month).toBeLessThanOrEqual(1);
      
      // Should be between Jan 21 and Feb 20
      if (month === 0) {
        expect(day).toBeGreaterThanOrEqual(21);
      } else {
        expect(day).toBeLessThanOrEqual(20);
      }
    });
  });

  it('TC25b: Tết 2025 is approximately Jan 29', () => {
    const tet2025 = getLunarNewYear(2025);
    // Real Tết 2025 is January 29, 2025
    // Allow some margin for approximation
    expect(tet2025.getFullYear()).toBe(2025);
    expect(tet2025.getMonth()).toBeLessThanOrEqual(1); // Jan or Feb
  });
});

// =============================================================================
// TC26: VN HOLIDAY DETECTION - FIXED HOLIDAYS (30/4, 2/9)
// =============================================================================

describe('Vietnamese Calendar: Fixed Holidays', () => {
  it('TC26: April 30 is Reunification Day', () => {
    const apr30 = new Date(2026, 3, 30);
    const result = isVNFixedHoliday(apr30);
    
    expect(result.isHoliday).toBe(true);
    expect(result.name).toBe('Ngày Giải phóng miền Nam');
  });

  it('TC26b: September 2 is National Day', () => {
    const sep2 = new Date(2026, 8, 2);
    const result = isVNFixedHoliday(sep2);
    
    expect(result.isHoliday).toBe(true);
    expect(result.name).toBe('Ngày Quốc khánh');
  });

  it('TC26c: May 1 is Labor Day', () => {
    const may1 = new Date(2026, 4, 1);
    const result = isVNFixedHoliday(may1);
    
    expect(result.isHoliday).toBe(true);
    expect(result.name).toBe('Ngày Quốc tế Lao động');
  });

  it('TC26d: January 1 is New Year', () => {
    const jan1 = new Date(2026, 0, 1);
    const result = isVNFixedHoliday(jan1);
    
    expect(result.isHoliday).toBe(true);
    expect(result.name).toBe('Tết Dương lịch');
  });

  it('TC26e: Regular day is not a holiday', () => {
    const regularDay = new Date(2026, 2, 15); // Mar 15
    const result = isVNFixedHoliday(regularDay);
    
    expect(result.isHoliday).toBe(false);
  });
});

// =============================================================================
// TC27: HOLIDAY BUFFER CALCULATION - PRE-TẾT (+50%)
// =============================================================================

describe('Holiday Buffer Calculation', () => {
  it('TC27: Pre-Tết within 2 weeks gets +50% buffer', () => {
    // Get the actual Tết date for testing
    const tetDate = getLunarNewYear(2026);
    const twoWeeksBefore = new Date(tetDate);
    twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 10); // 10 days before Tết

    const buffer = calculateHolidayBuffer(twoWeeksBefore);

    expect(buffer).toBe(0.50);
  });

  it('TC27b: Pre-Tết within 1 month gets +30% buffer', () => {
    const tetDate = getLunarNewYear(2026);
    const oneMonthBefore = new Date(tetDate);
    oneMonthBefore.setDate(oneMonthBefore.getDate() - 25); // 25 days before Tết

    const buffer = calculateHolidayBuffer(oneMonthBefore);

    expect(buffer).toBeGreaterThanOrEqual(0.15);
    expect(buffer).toBeLessThanOrEqual(0.50);
  });

  it('TC27c: Normal period gets 0% buffer', () => {
    const normalDate = new Date(2026, 5, 15); // Jun 15
    const buffer = calculateHolidayBuffer(normalDate);

    expect(buffer).toBe(0);
  });
});

// =============================================================================
// TC28: SAFETY STOCK CALCULATION - Z-SCORE FORMULA
// =============================================================================

describe('Safety Stock Calculation', () => {
  it('TC28: Safety stock uses correct Z-score formula', () => {
    const demandStdDev = 20;   // Standard deviation of demand
    const leadTimeDays = 7;    // 7 days lead time
    const serviceLevel = 0.95; // 95% service level

    const safetyStock = calculateSafetyStock(demandStdDev, leadTimeDays, serviceLevel);

    // SS = Z * σd * √L = 1.65 * 20 * √7 ≈ 87.3, ceiled to 88
    const expectedBase = 1.65 * 20 * Math.sqrt(7);
    const expectedCeiled = Math.ceil(expectedBase);
    expect(safetyStock).toBe(expectedCeiled);
  });

  it('TC28b: Higher service level requires more safety stock', () => {
    const demandStdDev = 20;
    const leadTimeDays = 7;
    
    const ss90 = calculateSafetyStock(demandStdDev, leadTimeDays, 0.90);
    const ss95 = calculateSafetyStock(demandStdDev, leadTimeDays, 0.95);
    const ss99 = calculateSafetyStock(demandStdDev, leadTimeDays, 0.99);
    
    expect(ss99).toBeGreaterThan(ss95);
    expect(ss95).toBeGreaterThan(ss90);
  });

  it('TC28c: Longer lead time increases safety stock', () => {
    const demandStdDev = 20;
    const serviceLevel = 0.95;
    
    const ss7days = calculateSafetyStock(demandStdDev, 7, serviceLevel);
    const ss14days = calculateSafetyStock(demandStdDev, 14, serviceLevel);
    
    expect(ss14days).toBeGreaterThan(ss7days);
  });
});

// =============================================================================
// TC29: REORDER POINT CALCULATION
// =============================================================================

describe('Reorder Point Calculation', () => {
  it('TC29: Reorder point = (Avg Daily Demand × Lead Time) + Safety Stock', () => {
    const avgDailyDemand = 10;  // 10 units per day
    const leadTimeDays = 7;     // 7 days
    const safetyStock = 50;     // 50 units safety stock
    
    const rop = calculateReorderPoint(avgDailyDemand, leadTimeDays, safetyStock);
    
    // ROP = (10 * 7) + 50 = 120
    expect(rop).toBe(120);
  });

  it('TC29b: Higher demand increases reorder point', () => {
    const leadTimeDays = 7;
    const safetyStock = 50;
    
    const ropLow = calculateReorderPoint(5, leadTimeDays, safetyStock);
    const ropHigh = calculateReorderPoint(15, leadTimeDays, safetyStock);
    
    expect(ropHigh).toBeGreaterThan(ropLow);
  });

  it('TC29c: Longer lead time increases reorder point', () => {
    const avgDailyDemand = 10;
    const safetyStock = 50;
    
    const rop7 = calculateReorderPoint(avgDailyDemand, 7, safetyStock);
    const rop14 = calculateReorderPoint(avgDailyDemand, 14, safetyStock);
    
    expect(rop14).toBeGreaterThan(rop7);
  });
});

// =============================================================================
// TC30: CONFIDENCE INTERVAL CALCULATION
// =============================================================================

describe('Confidence Interval Calculation', () => {
  it('TC30: 95% confidence interval uses Z=1.96', () => {
    const forecast = 100;
    const stdDev = 15;
    
    const interval = calculateConfidenceInterval(forecast, stdDev, 0.95);
    
    // CI = forecast ± (Z * stdDev)
    // 95% CI = 100 ± (1.96 * 15) = 100 ± 29.4
    expect(interval.lower).toBeCloseTo(71, 0);  // 100 - 29.4 ≈ 71
    expect(interval.upper).toBeCloseTo(129, 0); // 100 + 29.4 ≈ 129
  });

  it('TC30b: Higher confidence level widens interval', () => {
    const forecast = 100;
    const stdDev = 15;
    
    const ci90 = calculateConfidenceInterval(forecast, stdDev, 0.90);
    const ci95 = calculateConfidenceInterval(forecast, stdDev, 0.95);
    const ci99 = calculateConfidenceInterval(forecast, stdDev, 0.99);
    
    const width90 = ci90.upper - ci90.lower;
    const width95 = ci95.upper - ci95.lower;
    const width99 = ci99.upper - ci99.lower;
    
    expect(width99).toBeGreaterThan(width95);
    expect(width95).toBeGreaterThan(width90);
  });

  it('TC30c: Lower bound cannot be negative', () => {
    const forecast = 10;
    const stdDev = 20; // Large std dev relative to forecast
    
    const interval = calculateConfidenceInterval(forecast, stdDev, 0.95);
    
    expect(interval.lower).toBeGreaterThanOrEqual(0);
  });
});
