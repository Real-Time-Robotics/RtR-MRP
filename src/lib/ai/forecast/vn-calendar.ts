// =============================================================================
// VIETNAMESE CALENDAR & HOLIDAY SYSTEM
// Handles VN holidays, lunar calendar, and demand adjustment factors
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

export interface Holiday {
  name: string;
  nameVi: string;
  month: number;
  day: number;
  duration: number; // days
  impact: number; // demand multiplier (0.3 = -70%, 1.3 = +30%)
  type: 'fixed' | 'lunar' | 'seasonal';
  lunarMonth?: number;
  lunarDay?: number;
}

export interface SeasonalPattern {
  name: string;
  nameVi: string;
  months: number[];
  impact: number;
  description: string;
}

export interface HolidayFactor {
  date: Date;
  factor: number;
  holidays: string[];
  seasonalFactors: string[];
  explanation: string;
}

// =============================================================================
// VIETNAMESE HOLIDAYS
// =============================================================================

export const VN_HOLIDAYS: Holiday[] = [
  // Fixed Solar Holidays
  {
    name: 'New Year',
    nameVi: 'Tết Dương lịch',
    month: 1,
    day: 1,
    duration: 1,
    impact: 0.7,
    type: 'fixed',
  },
  {
    name: 'Liberation Day',
    nameVi: 'Ngày Giải phóng miền Nam',
    month: 4,
    day: 30,
    duration: 1,
    impact: 0.8,
    type: 'fixed',
  },
  {
    name: 'Labor Day',
    nameVi: 'Ngày Quốc tế Lao động',
    month: 5,
    day: 1,
    duration: 1,
    impact: 0.8,
    type: 'fixed',
  },
  {
    name: 'National Day',
    nameVi: 'Ngày Quốc khánh',
    month: 9,
    day: 2,
    duration: 2,
    impact: 0.8,
    type: 'fixed',
  },

  // Lunar Holidays (dates need calculation each year)
  {
    name: 'Tet Holiday',
    nameVi: 'Tết Nguyên Đán',
    month: 0, // Calculated from lunar
    day: 0,
    duration: 9, // Typically 7-9 days off
    impact: 0.3, // -70% demand
    type: 'lunar',
    lunarMonth: 1,
    lunarDay: 1,
  },
  {
    name: 'Hung Kings Commemoration',
    nameVi: 'Giỗ Tổ Hùng Vương',
    month: 0,
    day: 0,
    duration: 1,
    impact: 0.9,
    type: 'lunar',
    lunarMonth: 3,
    lunarDay: 10,
  },
];

// =============================================================================
// SEASONAL PATTERNS (Industry-specific for manufacturing)
// =============================================================================

export const SEASONAL_PATTERNS: SeasonalPattern[] = [
  {
    name: 'Q4 Peak Season',
    nameVi: 'Mùa cao điểm Q4',
    months: [10, 11, 12],
    impact: 1.25,
    description: 'Year-end orders, holiday preparation',
  },
  {
    name: 'Q1 Slow Season',
    nameVi: 'Mùa thấp điểm Q1',
    months: [1, 2],
    impact: 0.75,
    description: 'Post-Tet slowdown, budget planning',
  },
  {
    name: 'Pre-Tet Rush',
    nameVi: 'Cao điểm trước Tết',
    months: [1], // Late January typically
    impact: 1.4,
    description: 'Last-minute orders before Tet',
  },
  {
    name: 'Mid-Year Stable',
    nameVi: 'Ổn định giữa năm',
    months: [5, 6, 7, 8],
    impact: 1.0,
    description: 'Normal operations',
  },
  {
    name: 'Q3 Recovery',
    nameVi: 'Phục hồi Q3',
    months: [9],
    impact: 1.1,
    description: 'Post-summer recovery, Q4 preparation',
  },
];

// =============================================================================
// LUNAR CALENDAR CONVERSION
// Using Lunar-Solar conversion algorithm for Vietnamese calendar
// =============================================================================

// Lunar New Year dates (first day of Lunar Year 1) for years 2020-2030
// These are pre-calculated as lunar calendar conversion is complex
const LUNAR_NEW_YEAR_DATES: Record<number, Date> = {
  2020: new Date(2020, 0, 25), // Jan 25, 2020
  2021: new Date(2021, 1, 12), // Feb 12, 2021
  2022: new Date(2022, 1, 1),  // Feb 1, 2022
  2023: new Date(2023, 0, 22), // Jan 22, 2023
  2024: new Date(2024, 1, 10), // Feb 10, 2024
  2025: new Date(2025, 0, 29), // Jan 29, 2025
  2026: new Date(2026, 1, 17), // Feb 17, 2026
  2027: new Date(2027, 1, 6),  // Feb 6, 2027
  2028: new Date(2028, 0, 26), // Jan 26, 2028
  2029: new Date(2029, 1, 13), // Feb 13, 2029
  2030: new Date(2030, 1, 3),  // Feb 3, 2030
};

// Hung Kings Day (Lunar 3/10) - approximate solar dates
const HUNG_KINGS_DATES: Record<number, Date> = {
  2020: new Date(2020, 3, 2),  // Apr 2, 2020
  2021: new Date(2021, 3, 21), // Apr 21, 2021
  2022: new Date(2022, 3, 10), // Apr 10, 2022
  2023: new Date(2023, 3, 29), // Apr 29, 2023
  2024: new Date(2024, 3, 18), // Apr 18, 2024
  2025: new Date(2025, 3, 7),  // Apr 7, 2025
  2026: new Date(2026, 3, 26), // Apr 26, 2026
  2027: new Date(2027, 3, 15), // Apr 15, 2027
  2028: new Date(2028, 3, 4),  // Apr 4, 2028
  2029: new Date(2029, 3, 23), // Apr 23, 2029
  2030: new Date(2030, 3, 12), // Apr 12, 2030
};

/**
 * Get Lunar New Year date for a given year
 */
export function getLunarNewYear(year: number): Date | null {
  return LUNAR_NEW_YEAR_DATES[year] || null;
}

/**
 * Get Hung Kings Day date for a given year
 */
export function getHungKingsDay(year: number): Date | null {
  return HUNG_KINGS_DATES[year] || null;
}

// =============================================================================
// HOLIDAY DETECTION & FACTOR CALCULATION
// =============================================================================

/**
 * Check if a date falls within a holiday period
 */
export function isHolidayPeriod(date: Date, holiday: Holiday): boolean {
  const year = date.getFullYear();

  if (holiday.type === 'fixed') {
    const holidayStart = new Date(year, holiday.month - 1, holiday.day);
    const holidayEnd = new Date(holidayStart);
    holidayEnd.setDate(holidayEnd.getDate() + holiday.duration - 1);

    return date >= holidayStart && date <= holidayEnd;
  }

  if (holiday.type === 'lunar') {
    if (holiday.name === 'Tet Holiday') {
      const tetStart = getLunarNewYear(year);
      if (!tetStart) return false;

      // Tet typically affects 2 weeks before to 1 week after
      const preTetStart = new Date(tetStart);
      preTetStart.setDate(preTetStart.getDate() - 14);
      const postTetEnd = new Date(tetStart);
      postTetEnd.setDate(postTetEnd.getDate() + holiday.duration + 7);

      return date >= preTetStart && date <= postTetEnd;
    }

    if (holiday.name === 'Hung Kings Commemoration') {
      const hungKings = getHungKingsDay(year);
      if (!hungKings) return false;

      const holidayEnd = new Date(hungKings);
      holidayEnd.setDate(holidayEnd.getDate() + holiday.duration - 1);

      return date >= hungKings && date <= holidayEnd;
    }
  }

  return false;
}

/**
 * Get the Tet phase for a date (pre-tet, tet, post-tet)
 */
export function getTetPhase(date: Date): 'pre-tet' | 'tet' | 'post-tet' | null {
  const year = date.getFullYear();
  const tetStart = getLunarNewYear(year);
  if (!tetStart) return null;

  // Pre-Tet: 3-1 weeks before (rush period)
  const preTetStart = new Date(tetStart);
  preTetStart.setDate(preTetStart.getDate() - 21);
  const preTetEnd = new Date(tetStart);
  preTetEnd.setDate(preTetEnd.getDate() - 7);

  // Tet: 1 week before to 1 week after (holiday period)
  const tetPeriodStart = new Date(tetStart);
  tetPeriodStart.setDate(tetPeriodStart.getDate() - 7);
  const tetPeriodEnd = new Date(tetStart);
  tetPeriodEnd.setDate(tetPeriodEnd.getDate() + 9);

  // Post-Tet: 1-3 weeks after (slow recovery)
  const postTetStart = new Date(tetStart);
  postTetStart.setDate(postTetStart.getDate() + 10);
  const postTetEnd = new Date(tetStart);
  postTetEnd.setDate(postTetEnd.getDate() + 28);

  if (date >= preTetStart && date <= preTetEnd) return 'pre-tet';
  if (date >= tetPeriodStart && date <= tetPeriodEnd) return 'tet';
  if (date >= postTetStart && date <= postTetEnd) return 'post-tet';

  return null;
}

/**
 * Get seasonal pattern for a month
 */
export function getSeasonalPattern(month: number): SeasonalPattern | null {
  return SEASONAL_PATTERNS.find((p) => p.months.includes(month)) || null;
}

/**
 * Calculate the combined holiday factor for a specific date
 */
export function getHolidayFactor(date: Date): HolidayFactor {
  const month = date.getMonth() + 1;
  const holidayNames: string[] = [];
  const seasonalNames: string[] = [];
  let factor = 1.0;
  const explanations: string[] = [];

  // Check each holiday
  for (const holiday of VN_HOLIDAYS) {
    if (isHolidayPeriod(date, holiday)) {
      holidayNames.push(holiday.nameVi);

      // Special handling for Tet phases
      if (holiday.name === 'Tet Holiday') {
        const tetPhase = getTetPhase(date);
        if (tetPhase === 'pre-tet') {
          factor *= 1.4; // Rush period
          explanations.push('Cao điểm trước Tết (+40%)');
        } else if (tetPhase === 'tet') {
          factor *= holiday.impact;
          explanations.push(`${holiday.nameVi} (-${Math.round((1 - holiday.impact) * 100)}%)`);
        } else if (tetPhase === 'post-tet') {
          factor *= 0.6; // Slow recovery
          explanations.push('Phục hồi sau Tết (-40%)');
        }
      } else {
        factor *= holiday.impact;
        explanations.push(`${holiday.nameVi} (-${Math.round((1 - holiday.impact) * 100)}%)`);
      }
    }
  }

  // Apply seasonal patterns (only if no major holiday)
  if (holidayNames.length === 0) {
    const seasonal = getSeasonalPattern(month);
    if (seasonal && seasonal.impact !== 1.0) {
      seasonalNames.push(seasonal.nameVi);
      factor *= seasonal.impact;
      const change = Math.round((seasonal.impact - 1) * 100);
      const sign = change >= 0 ? '+' : '';
      explanations.push(`${seasonal.nameVi} (${sign}${change}%)`);
    }
  }

  return {
    date,
    factor: Math.round(factor * 100) / 100,
    holidays: holidayNames,
    seasonalFactors: seasonalNames,
    explanation: explanations.length > 0 ? explanations.join(', ') : 'Bình thường',
  };
}

/**
 * Get holiday factors for a date range
 */
export function getHolidayFactorsForRange(
  startDate: Date,
  endDate: Date
): HolidayFactor[] {
  const factors: HolidayFactor[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    factors.push(getHolidayFactor(new Date(current)));
    current.setDate(current.getDate() + 1);
  }

  return factors;
}

/**
 * Get average holiday factor for a week
 */
export function getWeeklyHolidayFactor(weekStart: Date): number {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const factors = getHolidayFactorsForRange(weekStart, weekEnd);
  const sum = factors.reduce((acc, f) => acc + f.factor, 0);

  return Math.round((sum / factors.length) * 100) / 100;
}

/**
 * Get average holiday factor for a month
 */
export function getMonthlyHolidayFactor(year: number, month: number): number {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month

  const factors = getHolidayFactorsForRange(startDate, endDate);
  const sum = factors.reduce((acc, f) => acc + f.factor, 0);

  return Math.round((sum / factors.length) * 100) / 100;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get upcoming holidays for the next N months
 */
export function getUpcomingHolidays(months: number = 6): Array<{
  name: string;
  nameVi: string;
  date: Date;
  impact: number;
}> {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + months);

  const upcoming: Array<{
    name: string;
    nameVi: string;
    date: Date;
    impact: number;
  }> = [];

  // Check each holiday for the period
  for (const holiday of VN_HOLIDAYS) {
    if (holiday.type === 'fixed') {
      // Check this year and next year
      for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
        const holidayDate = new Date(
          today.getFullYear() + yearOffset,
          holiday.month - 1,
          holiday.day
        );
        if (holidayDate >= today && holidayDate <= endDate) {
          upcoming.push({
            name: holiday.name,
            nameVi: holiday.nameVi,
            date: holidayDate,
            impact: holiday.impact,
          });
        }
      }
    } else if (holiday.type === 'lunar') {
      // Check this year and next year
      for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
        const year = today.getFullYear() + yearOffset;
        let holidayDate: Date | null = null;

        if (holiday.name === 'Tet Holiday') {
          holidayDate = getLunarNewYear(year);
        } else if (holiday.name === 'Hung Kings Commemoration') {
          holidayDate = getHungKingsDay(year);
        }

        if (holidayDate && holidayDate >= today && holidayDate <= endDate) {
          upcoming.push({
            name: holiday.name,
            nameVi: holiday.nameVi,
            date: holidayDate,
            impact: holiday.impact,
          });
        }
      }
    }
  }

  // Sort by date
  upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());

  return upcoming;
}

/**
 * Get week number of the year
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Format period string
 */
export function formatPeriod(
  date: Date,
  periodType: 'weekly' | 'monthly' | 'quarterly'
): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  switch (periodType) {
    case 'weekly':
      return `${year}-W${String(getWeekNumber(date)).padStart(2, '0')}`;
    case 'monthly':
      return `${year}-${String(month).padStart(2, '0')}`;
    case 'quarterly':
      const quarter = Math.ceil(month / 3);
      return `${year}-Q${quarter}`;
    default:
      return `${year}-${String(month).padStart(2, '0')}`;
  }
}

/**
 * Parse period string back to date range
 */
export function parsePeriod(period: string): { start: Date; end: Date } | null {
  // Weekly: 2024-W01
  const weekMatch = period.match(/^(\d{4})-W(\d{2})$/);
  if (weekMatch) {
    const year = parseInt(weekMatch[1]);
    const week = parseInt(weekMatch[2]);
    const jan1 = new Date(year, 0, 1);
    const days = (week - 1) * 7;
    const start = new Date(jan1);
    start.setDate(jan1.getDate() + days - jan1.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  // Monthly: 2024-01
  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = parseInt(monthMatch[1]);
    const month = parseInt(monthMatch[2]) - 1;
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 0),
    };
  }

  // Quarterly: 2024-Q1
  const quarterMatch = period.match(/^(\d{4})-Q(\d)$/);
  if (quarterMatch) {
    const year = parseInt(quarterMatch[1]);
    const quarter = parseInt(quarterMatch[2]);
    const startMonth = (quarter - 1) * 3;
    return {
      start: new Date(year, startMonth, 1),
      end: new Date(year, startMonth + 3, 0),
    };
  }

  return null;
}

// =============================================================================
// EXPORT DEFAULT SERVICE
// =============================================================================

export const VNCalendarService = {
  // Holiday data
  VN_HOLIDAYS,
  SEASONAL_PATTERNS,

  // Lunar calendar
  getLunarNewYear,
  getHungKingsDay,

  // Holiday detection
  isHolidayPeriod,
  getTetPhase,
  getSeasonalPattern,

  // Factor calculation
  getHolidayFactor,
  getHolidayFactorsForRange,
  getWeeklyHolidayFactor,
  getMonthlyHolidayFactor,

  // Utilities
  getUpcomingHolidays,
  getWeekNumber,
  formatPeriod,
  parsePeriod,
};

export default VNCalendarService;
