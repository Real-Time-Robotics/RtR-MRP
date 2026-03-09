import { describe, it, expect } from 'vitest';
import {
  getLunarNewYear,
  getHungKingsDay,
  isHolidayPeriod,
  getTetPhase,
  getSeasonalPattern,
  getHolidayFactor,
  getHolidayFactorsForRange,
  getWeeklyHolidayFactor,
  getMonthlyHolidayFactor,
  getWeekNumber,
  formatPeriod,
  parsePeriod,
  VN_HOLIDAYS,
  SEASONAL_PATTERNS,
} from '../vn-calendar';

// =============================================================================
// LUNAR CALENDAR
// =============================================================================

describe('getLunarNewYear', () => {
  it('returns correct date for known years', () => {
    const date2025 = getLunarNewYear(2025);
    expect(date2025).not.toBeNull();
    expect(date2025!.getFullYear()).toBe(2025);
    expect(date2025!.getMonth()).toBe(0); // January
    expect(date2025!.getDate()).toBe(29);
  });

  it('returns null for unsupported year', () => {
    expect(getLunarNewYear(2015)).toBeNull();
    expect(getLunarNewYear(2050)).toBeNull();
  });

  it('returns correct dates for all supported years', () => {
    for (let year = 2020; year <= 2030; year++) {
      const date = getLunarNewYear(year);
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(year);
      // Lunar New Year is always Jan or Feb
      expect(date!.getMonth()).toBeLessThanOrEqual(1);
    }
  });
});

describe('getHungKingsDay', () => {
  it('returns correct date for known year', () => {
    const date = getHungKingsDay(2025);
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2025);
    expect(date!.getMonth()).toBe(3); // April
    expect(date!.getDate()).toBe(7);
  });

  it('returns null for unsupported year', () => {
    expect(getHungKingsDay(2010)).toBeNull();
  });
});

// =============================================================================
// HOLIDAY DETECTION
// =============================================================================

describe('isHolidayPeriod', () => {
  it('detects fixed holiday - New Year', () => {
    const newYearHoliday = VN_HOLIDAYS.find(h => h.name === 'New Year')!;
    const newYearDay = new Date(2025, 0, 1); // Jan 1
    expect(isHolidayPeriod(newYearDay, newYearHoliday)).toBe(true);
  });

  it('does not detect fixed holiday on wrong date', () => {
    const newYearHoliday = VN_HOLIDAYS.find(h => h.name === 'New Year')!;
    const feb1 = new Date(2025, 1, 1);
    expect(isHolidayPeriod(feb1, newYearHoliday)).toBe(false);
  });

  it('detects Liberation Day on April 30', () => {
    const liberation = VN_HOLIDAYS.find(h => h.name === 'Liberation Day')!;
    const apr30 = new Date(2025, 3, 30);
    expect(isHolidayPeriod(apr30, liberation)).toBe(true);
  });

  it('detects National Day multi-day', () => {
    const nationalDay = VN_HOLIDAYS.find(h => h.name === 'National Day')!;
    const sep2 = new Date(2025, 8, 2);
    const sep3 = new Date(2025, 8, 3);
    expect(isHolidayPeriod(sep2, nationalDay)).toBe(true);
    expect(isHolidayPeriod(sep3, nationalDay)).toBe(true);
  });

  it('detects Tet holiday period', () => {
    const tetHoliday = VN_HOLIDAYS.find(h => h.name === 'Tet Holiday')!;
    // 2025 Tet: Jan 29. The period spans 14 days before to duration+7 after.
    const tetDay = new Date(2025, 0, 29);
    expect(isHolidayPeriod(tetDay, tetHoliday)).toBe(true);
  });

  it('does not detect Tet far outside the period', () => {
    const tetHoliday = VN_HOLIDAYS.find(h => h.name === 'Tet Holiday')!;
    const june = new Date(2025, 5, 15);
    expect(isHolidayPeriod(june, tetHoliday)).toBe(false);
  });

  it('detects Hung Kings Commemoration', () => {
    const hungKings = VN_HOLIDAYS.find(h => h.name === 'Hung Kings Commemoration')!;
    const date = new Date(2025, 3, 7); // Apr 7, 2025
    expect(isHolidayPeriod(date, hungKings)).toBe(true);
  });

  it('returns false for lunar holiday in unsupported year', () => {
    const tetHoliday = VN_HOLIDAYS.find(h => h.name === 'Tet Holiday')!;
    const farFuture = new Date(2050, 0, 15);
    expect(isHolidayPeriod(farFuture, tetHoliday)).toBe(false);
  });
});

// =============================================================================
// TET PHASE
// =============================================================================

describe('getTetPhase', () => {
  it('returns pre-tet for dates 1-3 weeks before Tet', () => {
    // 2025 Tet: Jan 29. Pre-tet: Jan 8 to Jan 22
    const preTetDate = new Date(2025, 0, 15);
    expect(getTetPhase(preTetDate)).toBe('pre-tet');
  });

  it('returns tet for dates around Tet', () => {
    // Tet period: Jan 22 to Feb 7 (1 week before to 9 days after)
    const tetDate = new Date(2025, 0, 29);
    expect(getTetPhase(tetDate)).toBe('tet');
  });

  it('returns post-tet for dates 10-28 days after Tet', () => {
    // Post-tet: Feb 8 to Feb 26
    const postTet = new Date(2025, 1, 15);
    expect(getTetPhase(postTet)).toBe('post-tet');
  });

  it('returns null for dates far from Tet', () => {
    const june = new Date(2025, 5, 15);
    expect(getTetPhase(june)).toBeNull();
  });

  it('returns null for unsupported year', () => {
    const farDate = new Date(2050, 0, 15);
    expect(getTetPhase(farDate)).toBeNull();
  });
});

// =============================================================================
// SEASONAL PATTERNS
// =============================================================================

describe('getSeasonalPattern', () => {
  it('returns Q4 Peak Season for October', () => {
    const pattern = getSeasonalPattern(10);
    expect(pattern).not.toBeNull();
    expect(pattern!.name).toBe('Q4 Peak Season');
    expect(pattern!.impact).toBe(1.25);
  });

  it('returns Q1 Slow Season for February', () => {
    const pattern = getSeasonalPattern(2);
    expect(pattern).not.toBeNull();
    expect(pattern!.name).toBe('Q1 Slow Season');
    expect(pattern!.impact).toBe(0.75);
  });

  it('returns Mid-Year Stable for June', () => {
    const pattern = getSeasonalPattern(6);
    expect(pattern).not.toBeNull();
    expect(pattern!.name).toBe('Mid-Year Stable');
    expect(pattern!.impact).toBe(1.0);
  });

  it('returns Q3 Recovery for September', () => {
    const pattern = getSeasonalPattern(9);
    expect(pattern).not.toBeNull();
    expect(pattern!.name).toBe('Q3 Recovery');
  });

  it('returns null for month with no pattern', () => {
    // Month 3 (March) and 4 (April) are not in any pattern
    const pattern = getSeasonalPattern(3);
    expect(pattern).toBeNull();
  });
});

// =============================================================================
// HOLIDAY FACTOR
// =============================================================================

describe('getHolidayFactor', () => {
  it('returns factor 1.0 for normal date', () => {
    // A date in March 2025 with no holidays, no seasonal pattern
    const normalDate = new Date(2025, 2, 15); // March 15
    const result = getHolidayFactor(normalDate);
    expect(result.factor).toBe(1);
    expect(result.holidays).toHaveLength(0);
    expect(result.explanation).toBe('Bình thường');
  });

  it('returns reduced factor for New Year', () => {
    const newYear = new Date(2025, 0, 1);
    const result = getHolidayFactor(newYear);
    // New Year impact = 0.7, but Tet period may also overlap
    expect(result.factor).toBeLessThan(1);
    expect(result.holidays.length).toBeGreaterThan(0);
  });

  it('returns seasonal factor for Q4 date with no holidays', () => {
    // Nov 15 - Q4 peak, no holiday
    const date = new Date(2025, 10, 15);
    const result = getHolidayFactor(date);
    expect(result.factor).toBe(1.25);
    expect(result.seasonalFactors).toContain('Mùa cao điểm Q4');
  });

  it('includes explanation text', () => {
    const date = new Date(2025, 10, 15);
    const result = getHolidayFactor(date);
    expect(result.explanation).toContain('Mùa cao điểm Q4');
  });
});

describe('getHolidayFactorsForRange', () => {
  it('returns one factor per day in range', () => {
    const start = new Date(2025, 5, 1);
    const end = new Date(2025, 5, 7);
    const factors = getHolidayFactorsForRange(start, end);
    expect(factors).toHaveLength(7);
  });

  it('returns empty for reversed range', () => {
    const start = new Date(2025, 5, 7);
    const end = new Date(2025, 5, 1);
    const factors = getHolidayFactorsForRange(start, end);
    expect(factors).toHaveLength(0);
  });
});

describe('getWeeklyHolidayFactor', () => {
  it('returns average factor for a normal week', () => {
    const weekStart = new Date(2025, 2, 10); // March 10 (no holidays)
    const factor = getWeeklyHolidayFactor(weekStart);
    expect(factor).toBe(1); // Normal week
  });
});

describe('getMonthlyHolidayFactor', () => {
  it('returns factor for a normal month', () => {
    // March has no holidays and no seasonal pattern
    const factor = getMonthlyHolidayFactor(2025, 3);
    expect(factor).toBe(1);
  });

  it('returns adjusted factor for November (Q4 peak)', () => {
    const factor = getMonthlyHolidayFactor(2025, 11);
    expect(factor).toBeGreaterThan(1);
  });
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

describe('getWeekNumber', () => {
  it('returns week 1 for early January', () => {
    const date = new Date(2025, 0, 2); // Jan 2, 2025
    const week = getWeekNumber(date);
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(53);
  });

  it('returns a valid week number for late December', () => {
    const date = new Date(2025, 11, 29);
    const week = getWeekNumber(date);
    // Dec 29, 2025 can be week 1 of 2026 per ISO 8601
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(53);
  });
});

describe('formatPeriod', () => {
  it('formats weekly period', () => {
    const date = new Date(2025, 0, 6); // Jan 6, 2025
    const result = formatPeriod(date, 'weekly');
    expect(result).toMatch(/^2025-W\d{2}$/);
  });

  it('formats monthly period', () => {
    const date = new Date(2025, 2, 15);
    expect(formatPeriod(date, 'monthly')).toBe('2025-03');
  });

  it('formats quarterly period', () => {
    const date = new Date(2025, 3, 15); // April -> Q2
    expect(formatPeriod(date, 'quarterly')).toBe('2025-Q2');
  });

  it('handles Q1', () => {
    const date = new Date(2025, 1, 15); // February -> Q1
    expect(formatPeriod(date, 'quarterly')).toBe('2025-Q1');
  });

  it('handles Q4', () => {
    const date = new Date(2025, 11, 15); // December -> Q4
    expect(formatPeriod(date, 'quarterly')).toBe('2025-Q4');
  });
});

describe('parsePeriod', () => {
  it('parses weekly period', () => {
    const result = parsePeriod('2025-W10');
    expect(result).not.toBeNull();
    expect(result!.start.getFullYear()).toBe(2025);
    expect(result!.end.getTime()).toBeGreaterThan(result!.start.getTime());
    // End should be 6 days after start (same week)
    const diffDays = (result!.end.getTime() - result!.start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(6);
  });

  it('parses monthly period', () => {
    const result = parsePeriod('2025-03');
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date(2025, 2, 1));
    expect(result!.end).toEqual(new Date(2025, 3, 0)); // March 31
  });

  it('parses quarterly period', () => {
    const result = parsePeriod('2025-Q2');
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date(2025, 3, 1)); // April 1
    expect(result!.end).toEqual(new Date(2025, 6, 0)); // June 30
  });

  it('returns null for invalid format', () => {
    expect(parsePeriod('invalid')).toBeNull();
    expect(parsePeriod('2025')).toBeNull();
    expect(parsePeriod('')).toBeNull();
  });
});

// =============================================================================
// DATA INTEGRITY
// =============================================================================

describe('VN_HOLIDAYS', () => {
  it('has expected number of holidays', () => {
    expect(VN_HOLIDAYS.length).toBeGreaterThanOrEqual(6);
  });

  it('all holidays have required fields', () => {
    for (const holiday of VN_HOLIDAYS) {
      expect(holiday.name).toBeTruthy();
      expect(holiday.nameVi).toBeTruthy();
      expect(holiday.duration).toBeGreaterThan(0);
      expect(holiday.impact).toBeGreaterThan(0);
      expect(holiday.impact).toBeLessThanOrEqual(1.5);
      expect(['fixed', 'lunar', 'seasonal']).toContain(holiday.type);
    }
  });
});

describe('SEASONAL_PATTERNS', () => {
  it('has at least 4 patterns', () => {
    expect(SEASONAL_PATTERNS.length).toBeGreaterThanOrEqual(4);
  });

  it('all patterns have required fields', () => {
    for (const pattern of SEASONAL_PATTERNS) {
      expect(pattern.name).toBeTruthy();
      expect(pattern.nameVi).toBeTruthy();
      expect(pattern.months.length).toBeGreaterThan(0);
      expect(pattern.impact).toBeGreaterThan(0);
    }
  });
});
