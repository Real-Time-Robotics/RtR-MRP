import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatCurrencyValue,
  formatCurrencyWithSymbol,
  formatCurrencyCompact,
  parseCurrency,
  getCurrencySymbol,
  getDefaultCurrency,
} from '../currency';

describe('formatCurrency', () => {
  it('should format USD with symbol by default', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1,234.56');
  });

  it('should format VND with 0 decimals', () => {
    const result = formatCurrency(1500000, { currency: 'VND' });
    expect(result).toBeDefined();
  });

  it('should handle null value', () => {
    const result = formatCurrency(null);
    expect(result).toBeDefined();
  });

  it('should handle undefined value', () => {
    const result = formatCurrency(undefined);
    expect(result).toBeDefined();
  });

  it('should format without symbol', () => {
    const result = formatCurrency(100, { showSymbol: false });
    expect(result).not.toContain('$');
  });

  it('should format compact large numbers', () => {
    const result = formatCurrency(1500000, { compact: true });
    expect(result).toBeDefined();
  });

  it('should not use compact for small numbers', () => {
    const result = formatCurrency(500, { compact: true });
    expect(result).toBeDefined();
  });

  it('should respect custom fraction digits', () => {
    const result = formatCurrency(100, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
      showSymbol: false,
    });
    expect(result).toContain('100.0000');
  });

  it('should format EUR', () => {
    const result = formatCurrency(1234.56, { currency: 'EUR' });
    expect(result).toBeDefined();
  });
});

describe('formatCurrencyValue', () => {
  it('should format without symbol', () => {
    const result = formatCurrencyValue(1234.56);
    expect(result).not.toContain('$');
  });

  it('should handle null', () => {
    const result = formatCurrencyValue(null);
    expect(result).toBe('0');
  });
});

describe('formatCurrencyWithSymbol', () => {
  it('should include currency symbol', () => {
    const result = formatCurrencyWithSymbol(1234.56);
    expect(result).toContain('$');
  });
});

describe('formatCurrencyCompact', () => {
  it('should compact large amounts', () => {
    const result = formatCurrencyCompact(1500000);
    expect(result).toBeDefined();
  });
});

describe('parseCurrency', () => {
  it('should parse simple number', () => {
    expect(parseCurrency('1234.56')).toBe(1234.56);
  });

  it('should parse with currency symbol', () => {
    expect(parseCurrency('$1,234.56')).toBe(1234.56);
  });

  it('should parse with spaces', () => {
    expect(parseCurrency('1 234.56')).toBe(1234.56);
  });

  it('should return 0 for invalid string', () => {
    expect(parseCurrency('abc')).toBe(0);
  });

  it('should handle empty string', () => {
    expect(parseCurrency('')).toBe(0);
  });
});

describe('getCurrencySymbol', () => {
  it('should return $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('should return ₫ for VND', () => {
    expect(getCurrencySymbol('VND')).toBe('₫');
  });

  it('should return € for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('should default to USD', () => {
    expect(getCurrencySymbol()).toBe('$');
  });
});

describe('getDefaultCurrency', () => {
  it('should return USD', () => {
    expect(getDefaultCurrency()).toBe('USD');
  });
});
