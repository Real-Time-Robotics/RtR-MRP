import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: { create: vi.fn() },
    activity: { create: vi.fn() },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1', name: 'Test' } }),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === 'x-forwarded-for') return '127.0.0.1';
      if (key === 'user-agent') return 'test-agent';
      return null;
    }),
  })),
}));

import { getChangedFields } from '../audit-logger';

describe('Audit Logger', () => {
  describe('getChangedFields', () => {
    it('should detect changed fields', () => {
      const oldObj = { name: 'Old', status: 'active', price: 10 };
      const newObj = { name: 'New', status: 'active', price: 20 };
      const result = getChangedFields(oldObj, newObj);
      expect(result.oldValues).toEqual({ name: 'Old', price: 10 });
      expect(result.newValues).toEqual({ name: 'New', price: 20 });
    });

    it('should return empty when no changes', () => {
      const obj = { name: 'Same', value: 42 };
      const result = getChangedFields(obj, { ...obj });
      expect(Object.keys(result.oldValues)).toHaveLength(0);
      expect(Object.keys(result.newValues)).toHaveLength(0);
    });

    it('should detect new fields', () => {
      const result = getChangedFields({ a: 1 }, { a: 1, b: 2 });
      expect(result.newValues).toHaveProperty('b', 2);
    });

    it('should detect removed fields', () => {
      const result = getChangedFields({ a: 1, b: 2 }, { a: 1 });
      expect(result.oldValues).toHaveProperty('b', 2);
    });
  });
});
