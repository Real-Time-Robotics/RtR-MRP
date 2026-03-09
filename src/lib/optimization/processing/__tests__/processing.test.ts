import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

import { validateRow, parseCSV, type ValidationRule } from '../index';

describe('Processing Module', () => {
  describe('validateRow', () => {
    it('should validate required fields', () => {
      const rules: ValidationRule[] = [
        { field: 'name', required: true },
      ];
      expect(validateRow({}, rules).valid).toBe(false);
      expect(validateRow({ name: 'Test' }, rules).valid).toBe(true);
    });

    it('should validate string type', () => {
      const rules: ValidationRule[] = [
        { field: 'name', type: 'string' },
      ];
      expect(validateRow({ name: 'hello' }, rules).valid).toBe(true);
      expect(validateRow({ name: 123 }, rules).valid).toBe(false);
    });

    it('should validate number type', () => {
      const rules: ValidationRule[] = [
        { field: 'qty', type: 'number' },
      ];
      expect(validateRow({ qty: 42 }, rules).valid).toBe(true);
      expect(validateRow({ qty: '42' }, rules).valid).toBe(true);
      expect(validateRow({ qty: 'abc' }, rules).valid).toBe(false);
    });

    it('should validate boolean type', () => {
      const rules: ValidationRule[] = [
        { field: 'active', type: 'boolean' },
      ];
      expect(validateRow({ active: true }, rules).valid).toBe(true);
      expect(validateRow({ active: 'true' }, rules).valid).toBe(true);
      expect(validateRow({ active: 'maybe' }, rules).valid).toBe(false);
    });

    it('should validate date type', () => {
      const rules: ValidationRule[] = [
        { field: 'date', type: 'date' },
      ];
      expect(validateRow({ date: '2024-01-15' }, rules).valid).toBe(true);
      expect(validateRow({ date: 'not-a-date' }, rules).valid).toBe(false);
    });

    it('should validate email type', () => {
      const rules: ValidationRule[] = [
        { field: 'email', type: 'email' },
      ];
      expect(validateRow({ email: 'test@test.com' }, rules).valid).toBe(true);
      expect(validateRow({ email: 'invalid' }, rules).valid).toBe(false);
    });

    it('should validate minLength/maxLength', () => {
      const rules: ValidationRule[] = [
        { field: 'code', minLength: 3, maxLength: 10 },
      ];
      expect(validateRow({ code: 'AB' }, rules).valid).toBe(false);
      expect(validateRow({ code: 'ABC' }, rules).valid).toBe(true);
      expect(validateRow({ code: 'A'.repeat(11) }, rules).valid).toBe(false);
    });

    it('should validate min/max', () => {
      const rules: ValidationRule[] = [
        { field: 'qty', min: 0, max: 100 },
      ];
      expect(validateRow({ qty: -1 }, rules).valid).toBe(false);
      expect(validateRow({ qty: 50 }, rules).valid).toBe(true);
      expect(validateRow({ qty: 101 }, rules).valid).toBe(false);
    });

    it('should validate pattern', () => {
      const rules: ValidationRule[] = [
        { field: 'code', pattern: /^[A-Z]{3}-\d{3}$/ },
      ];
      expect(validateRow({ code: 'ABC-123' }, rules).valid).toBe(true);
      expect(validateRow({ code: 'abc-123' }, rules).valid).toBe(false);
    });

    it('should validate enum', () => {
      const rules: ValidationRule[] = [
        { field: 'status', enum: ['active', 'inactive'] },
      ];
      expect(validateRow({ status: 'active' }, rules).valid).toBe(true);
      expect(validateRow({ status: 'deleted' }, rules).valid).toBe(false);
    });

    it('should validate custom function', () => {
      const rules: ValidationRule[] = [
        { field: 'value', custom: (v) => Number(v) % 2 === 0 || 'Must be even' },
      ];
      expect(validateRow({ value: 4 }, rules).valid).toBe(true);
      expect(validateRow({ value: 3 }, rules).valid).toBe(false);
    });

    it('should skip null/undefined values for non-required', () => {
      const rules: ValidationRule[] = [
        { field: 'optional', type: 'number' },
      ];
      expect(validateRow({}, rules).valid).toBe(true);
      expect(validateRow({ optional: null }, rules).valid).toBe(true);
    });
  });

  describe('parseCSV', () => {
    it('should parse basic CSV', () => {
      const csv = 'name,value\nAlice,10\nBob,20';
      const result = parseCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'Alice', value: '10' });
    });

    it('should handle custom delimiter', () => {
      const csv = 'name;value\nAlice;10';
      const result = parseCSV(csv, { delimiter: ';' });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'Alice', value: '10' });
    });

    it('should handle empty content', () => {
      expect(parseCSV('')).toHaveLength(0);
    });

    it('should handle Buffer input', () => {
      const csv = Buffer.from('name,value\nAlice,10');
      const result = parseCSV(csv);
      expect(result).toHaveLength(1);
    });

    it('should handle columns as false', () => {
      const csv = 'Alice,10\nBob,20';
      const result = parseCSV(csv, { columns: false });
      expect(result).toHaveLength(2);
      expect(Array.isArray(result[0])).toBe(true);
    });
  });
});
