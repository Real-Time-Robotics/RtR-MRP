import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cn,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDate,
  formatRelativeTime,
  truncate,
  getInitials,
  debounce,
  percentage,
  clamp,
  isEmpty,
} from '../utils';

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('should resolve tailwind conflicts', () => {
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });
});

describe('formatNumber', () => {
  it('should format integer', () => {
    expect(formatNumber(1234)).toBe('1,234');
  });

  it('should format decimal with max 2 digits', () => {
    expect(formatNumber(1234.567)).toBe('1,234.57');
  });

  it('should format zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('should accept options', () => {
    const result = formatNumber(0.5, { style: 'percent' });
    expect(result).toContain('50');
  });
});

describe('formatCurrency (utils)', () => {
  it('should format VND by default', () => {
    const result = formatCurrency(1500000);
    expect(result).toBeDefined();
  });

  it('should format compact billion', () => {
    expect(formatCurrency(2500000000, true)).toBe('2.5B');
  });

  it('should format compact million', () => {
    expect(formatCurrency(1500000, true)).toBe('1.5M');
  });

  it('should format compact thousand', () => {
    expect(formatCurrency(2500, true)).toBe('2.5K');
  });

  it('should format compact small number', () => {
    const result = formatCurrency(500, true);
    expect(result).toBeDefined();
  });

  it('should format with specific currency', () => {
    const result = formatCurrency(1000, 'USD');
    expect(result).toBeDefined();
  });
});

describe('formatPercent', () => {
  it('should format percentage', () => {
    const result = formatPercent(75);
    expect(result).toContain('75');
  });

  it('should format 0%', () => {
    const result = formatPercent(0);
    expect(result).toContain('0');
  });

  it('should format 100%', () => {
    const result = formatPercent(100);
    expect(result).toContain('100');
  });
});

describe('formatDate (utils)', () => {
  const testDate = '2026-01-14T14:30:00Z';

  it('should format medium by default', () => {
    const result = formatDate(testDate);
    expect(result).toBeDefined();
  });

  it('should format short', () => {
    const result = formatDate(testDate, 'short');
    expect(result).toBeDefined();
  });

  it('should format long', () => {
    const result = formatDate(testDate, 'long');
    expect(result).toBeDefined();
  });

  it('should format with time', () => {
    const result = formatDate(testDate, true);
    expect(result).toBeDefined();
  });
});

describe('formatRelativeTime', () => {
  it('should return "just now" for recent time', () => {
    const result = formatRelativeTime(new Date());
    expect(result).toBe('just now');
  });

  it('should format minutes ago', () => {
    const past = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(past)).toBe('5m ago');
  });

  it('should format hours ago', () => {
    const past = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(past)).toBe('3h ago');
  });

  it('should format days ago', () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(past)).toBe('2d ago');
  });

  it('should format weeks ago', () => {
    const past = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(past)).toBe('2w ago');
  });

  it('should format months ago', () => {
    const past = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(past)).toBe('2mo ago');
  });

  it('should format years ago', () => {
    const past = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(past)).toBe('1y ago');
  });
});

describe('truncate', () => {
  it('should not truncate short text', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('should truncate long text with ellipsis', () => {
    expect(truncate('hello world foo bar', 10)).toBe('hello worl...');
  });

  it('should handle exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});

describe('getInitials', () => {
  it('should get initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('should get single initial', () => {
    expect(getInitials('John')).toBe('J');
  });

  it('should limit to maxLength', () => {
    expect(getInitials('John Michael Doe', 2)).toBe('JM');
  });

  it('should handle 3 words with maxLength 3', () => {
    expect(getInitials('John Michael Doe', 3)).toBe('JMD');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should debounce function calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to debounced function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('percentage', () => {
  it('should calculate percentage', () => {
    expect(percentage(50, 200)).toBe(25);
  });

  it('should return 0 when total is 0', () => {
    expect(percentage(50, 0)).toBe(0);
  });

  it('should handle 100%', () => {
    expect(percentage(200, 200)).toBe(100);
  });
});

describe('clamp', () => {
  it('should clamp value above max', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it('should clamp value below min', () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });

  it('should not clamp value within range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('should handle equal min and max', () => {
    expect(clamp(50, 10, 10)).toBe(10);
  });
});

describe('isEmpty', () => {
  it('should return true for null', () => {
    expect(isEmpty(null)).toBe(true);
  });

  it('should return true for undefined', () => {
    expect(isEmpty(undefined)).toBe(true);
  });

  it('should return true for empty string', () => {
    expect(isEmpty('')).toBe(true);
  });

  it('should return true for whitespace string', () => {
    expect(isEmpty('   ')).toBe(true);
  });

  it('should return true for empty array', () => {
    expect(isEmpty([])).toBe(true);
  });

  it('should return true for empty object', () => {
    expect(isEmpty({})).toBe(true);
  });

  it('should return false for non-empty string', () => {
    expect(isEmpty('hello')).toBe(false);
  });

  it('should return false for number', () => {
    expect(isEmpty(0)).toBe(false);
  });

  it('should return false for non-empty array', () => {
    expect(isEmpty([1])).toBe(false);
  });

  it('should return false for non-empty object', () => {
    expect(isEmpty({ a: 1 })).toBe(false);
  });
});
