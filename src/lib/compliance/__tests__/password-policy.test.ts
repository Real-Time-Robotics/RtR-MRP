import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPasswordStrengthMeter } from '../password-policy';

// Mock prisma since most functions depend on it
vi.mock('@/lib/prisma', () => ({
  prisma: {
    settings: { findFirst: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    passwordHistory: { findMany: vi.fn(), create: vi.fn() },
  },
}));

describe('getPasswordStrengthMeter', () => {
  it('should rate weak passwords', () => {
    const result = getPasswordStrengthMeter('abc');
    expect(result.label).toBe('Weak');
    expect(result.color).toBe('red');
    expect(result.score).toBeLessThan(30);
  });

  it('should rate fair passwords', () => {
    const result = getPasswordStrengthMeter('Password1');
    expect(result.score).toBeGreaterThanOrEqual(30);
  });

  it('should rate strong passwords', () => {
    const result = getPasswordStrengthMeter('MyStr0ng!P@ssw0rd2026');
    expect(result.label).toBe('Strong');
    expect(result.color).toBe('green');
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('should suggest uppercase letters when missing', () => {
    const result = getPasswordStrengthMeter('lowercaseonly');
    expect(result.suggestions).toContain('Add uppercase letters');
  });

  it('should suggest lowercase letters when missing', () => {
    const result = getPasswordStrengthMeter('UPPERCASEONLY');
    expect(result.suggestions).toContain('Add lowercase letters');
  });

  it('should suggest numbers when missing', () => {
    const result = getPasswordStrengthMeter('NoNumbersHere!');
    expect(result.suggestions).toContain('Add numbers');
  });

  it('should suggest special characters when missing', () => {
    const result = getPasswordStrengthMeter('NoSpecialChars1');
    expect(result.suggestions).toContain('Add special characters');
  });

  it('should penalize repeated characters', () => {
    const withRepeat = getPasswordStrengthMeter('aaa123456!');
    const without = getPasswordStrengthMeter('abc123456!');
    expect(withRepeat.score).toBeLessThanOrEqual(without.score);
  });

  it('should penalize letters-only passwords', () => {
    const result = getPasswordStrengthMeter('OnlyLettersHere');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('should limit suggestions to 3', () => {
    const result = getPasswordStrengthMeter('a');
    expect(result.suggestions.length).toBeLessThanOrEqual(3);
  });

  it('should clamp score between 0 and 100', () => {
    const weak = getPasswordStrengthMeter('');
    expect(weak.score).toBeGreaterThanOrEqual(0);

    const strong = getPasswordStrengthMeter('V3ry$tr0ng!P@ssw0rd!2026#Extra');
    expect(strong.score).toBeLessThanOrEqual(100);
  });

  it('should reward longer passwords', () => {
    const short = getPasswordStrengthMeter('Ab1!');
    const long = getPasswordStrengthMeter('AbCdEfGh1234!@#$');
    expect(long.score).toBeGreaterThan(short.score);
  });
});
