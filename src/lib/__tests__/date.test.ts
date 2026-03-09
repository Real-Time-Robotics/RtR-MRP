import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateShort,
  formatDateTime,
  formatDateMedium,
  formatDateISO,
  formatRelativeTime,
  isValidDate,
  getDefaultLocale,
  DATE_FORMATS,
} from '../date';

describe('formatDate', () => {
  const testDate = new Date('2026-01-14T14:30:45Z');

  it('should format date with short format by default', () => {
    const result = formatDate(testDate);
    expect(result).toContain('14');
    expect(result).toContain('01');
    expect(result).toContain('2026');
  });

  it('should format date with ISO string input', () => {
    const result = formatDate('2026-01-14T14:30:45Z');
    expect(result).toContain('14');
  });

  it('should format date with timestamp input', () => {
    const result = formatDate(testDate.getTime());
    expect(result).toContain('14');
  });

  it('should return "-" for null', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('should return "-" for undefined', () => {
    expect(formatDate(undefined)).toBe('-');
  });

  it('should return "-" for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('-');
  });

  it('should format with medium format', () => {
    const result = formatDate(testDate, { format: 'medium' });
    expect(result).toBeDefined();
    expect(result).not.toBe('-');
  });

  it('should format with time', () => {
    const result = formatDate(testDate, { format: 'shortTime' });
    expect(result).toBeDefined();
    expect(result).not.toBe('-');
  });

  it('should format with en locale', () => {
    const result = formatDate(testDate, { locale: 'en' });
    expect(result).toBeDefined();
    expect(result).not.toBe('-');
  });

  it('should accept custom format string', () => {
    const result = formatDate(testDate, { format: 'yyyy' });
    expect(result).toBe('2026');
  });
});

describe('formatDateShort', () => {
  it('should format date in short format', () => {
    const result = formatDateShort('2026-01-14');
    expect(result).toContain('14');
  });

  it('should return "-" for null', () => {
    expect(formatDateShort(null)).toBe('-');
  });
});

describe('formatDateTime', () => {
  it('should format date with time', () => {
    const result = formatDateTime('2026-01-14T14:30:00Z');
    expect(result).toBeDefined();
    expect(result).not.toBe('-');
  });
});

describe('formatDateMedium', () => {
  it('should format in medium style', () => {
    const result = formatDateMedium('2026-01-14');
    expect(result).toBeDefined();
    expect(result).not.toBe('-');
  });
});

describe('formatDateISO', () => {
  it('should format as yyyy-MM-dd', () => {
    const result = formatDateISO('2026-01-14T14:30:00Z');
    expect(result).toBe('2026-01-14');
  });

  it('should return empty string for null', () => {
    expect(formatDateISO(null)).toBe('');
  });
});

describe('formatRelativeTime', () => {
  it('should format relative time', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const result = formatRelativeTime(past);
    expect(result).toBeDefined();
    expect(result).not.toBe('-');
  });

  it('should return "-" for null', () => {
    expect(formatRelativeTime(null)).toBe('-');
  });

  it('should work with en locale', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const result = formatRelativeTime(past, new Date(), 'en');
    expect(result).toBeDefined();
    expect(result).not.toBe('-');
  });
});

describe('isValidDate', () => {
  it('should return true for valid Date', () => {
    expect(isValidDate(new Date())).toBe(true);
  });

  it('should return true for valid ISO string', () => {
    expect(isValidDate('2026-01-14')).toBe(true);
  });

  it('should return true for timestamp', () => {
    expect(isValidDate(Date.now())).toBe(true);
  });

  it('should return false for null', () => {
    expect(isValidDate(null)).toBe(false);
  });

  it('should return false for invalid string', () => {
    expect(isValidDate('not-a-date')).toBe(false);
  });

  it('should return false for invalid Date object', () => {
    expect(isValidDate(new Date('invalid'))).toBe(false);
  });
});

describe('getDefaultLocale', () => {
  it('should return vi', () => {
    expect(getDefaultLocale()).toBe('vi');
  });
});

describe('DATE_FORMATS', () => {
  it('should have standard format keys', () => {
    expect(DATE_FORMATS.short).toBeDefined();
    expect(DATE_FORMATS.medium).toBeDefined();
    expect(DATE_FORMATS.long).toBeDefined();
    expect(DATE_FORMATS.iso).toBeDefined();
    expect(DATE_FORMATS.time).toBeDefined();
  });
});
