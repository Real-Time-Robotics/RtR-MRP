/**
 * Sprint 27 TIP-S27-02 — Serial Numbering Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateSerial,
  formatSerialDate,
  computeMMYY,
  SerialNumberingRuleNotFoundError,
} from '../numbering';

// In-memory rule store for mocking
let ruleStore: Record<string, {
  id: string;
  moduleDesignId: string;
  prefix: string;
  version: string;
  counter: number;
  counterLastMMYY: number | null;
  template: string;
}> = {};

// Mock prisma with serializable transaction support
vi.mock('@/lib/prisma', () => {
  return {
    default: {
      serialNumberingRule: {
        findUnique: vi.fn(({ where }: { where: { moduleDesignId?: string; id?: string } }) => {
          const key = where.moduleDesignId || where.id;
          return Promise.resolve(key ? ruleStore[key] || null : null);
        }),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        // Simulate serializable transaction by running the callback with a tx proxy
        const tx = {
          serialNumberingRule: {
            findUnique: ({ where }: { where: { moduleDesignId?: string } }) => {
              const key = where.moduleDesignId;
              return Promise.resolve(key ? ruleStore[key] || null : null);
            },
            update: ({ where, data }: { where: { id: string }; data: { counter: number; counterLastMMYY: number } }) => {
              // Find rule by id and update
              for (const key of Object.keys(ruleStore)) {
                if (ruleStore[key].id === where.id) {
                  ruleStore[key] = { ...ruleStore[key], ...data };
                  return Promise.resolve(ruleStore[key]);
                }
              }
              return Promise.resolve(null);
            },
          },
        };
        return fn(tx);
      }),
    },
  };
});

describe('Serial Numbering Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ruleStore = {};
  });

  describe('helpers', () => {
    it('formatSerialDate should format as DDMMYY', () => {
      expect(formatSerialDate(new Date(2025, 9, 9))).toBe('091025'); // Oct 9, 2025
      expect(formatSerialDate(new Date(2025, 0, 1))).toBe('010125'); // Jan 1, 2025
      expect(formatSerialDate(new Date(2026, 11, 31))).toBe('311226'); // Dec 31, 2026
    });

    it('computeMMYY should return month*100+year%100', () => {
      expect(computeMMYY(new Date(2025, 8, 1))).toBe(925);   // Sep 2025
      expect(computeMMYY(new Date(2025, 9, 1))).toBe(1025);  // Oct 2025
      expect(computeMMYY(new Date(2026, 0, 15))).toBe(126);  // Jan 2026
    });
  });

  describe('generateSerial', () => {
    it('should throw SerialNumberingRuleNotFoundError when rule missing', async () => {
      await expect(
        generateSerial({ moduleDesignId: 'nonexistent' })
      ).rejects.toThrow(SerialNumberingRuleNotFoundError);
    });

    it('should generate sequential serials for same module', async () => {
      ruleStore['md-io1'] = {
        id: 'rule-1',
        moduleDesignId: 'md-io1',
        prefix: 'IO1',
        version: 'V15',
        counter: 0,
        counterLastMMYY: null,
        template: '{prefix}-{version}-{ddmmyy}-{###}',
      };

      const now = new Date(2025, 9, 9); // Oct 9, 2025
      const serials: string[] = [];

      for (let i = 0; i < 10; i++) {
        const s = await generateSerial({ moduleDesignId: 'md-io1', now });
        serials.push(s);
      }

      expect(serials).toHaveLength(10);
      // All unique
      expect(new Set(serials).size).toBe(10);
      // All match format
      const regex = /^IO1-V15-\d{6}-\d{3,}$/;
      serials.forEach((s) => expect(s).toMatch(regex));
      // Counter progressed
      expect(ruleStore['md-io1'].counter).toBe(10);
    });

    it('should reset counter on month rollover', async () => {
      ruleStore['md-io1'] = {
        id: 'rule-1',
        moduleDesignId: 'md-io1',
        prefix: 'IO1',
        version: 'V15',
        counter: 5,
        counterLastMMYY: 925, // Sep 2025
        template: '{prefix}-{version}-{ddmmyy}-{###}',
      };

      // Generate in Sep
      const sep = new Date(2025, 8, 30);
      const sSep = await generateSerial({ moduleDesignId: 'md-io1', now: sep });
      expect(sSep).toMatch(/^IO1-V15-300925-006$/);
      expect(ruleStore['md-io1'].counter).toBe(6);

      // Generate in Oct (rollover)
      const oct = new Date(2025, 9, 1);
      const sOct = await generateSerial({ moduleDesignId: 'md-io1', now: oct });
      expect(sOct).toMatch(/^IO1-V15-011025-001$/);
      expect(ruleStore['md-io1'].counter).toBe(1);
      expect(ruleStore['md-io1'].counterLastMMYY).toBe(1025);
    });

    it('should handle counter > 999 without padding', async () => {
      ruleStore['md-io1'] = {
        id: 'rule-1',
        moduleDesignId: 'md-io1',
        prefix: 'IO1',
        version: 'V15',
        counter: 999,
        counterLastMMYY: 1025,
        template: '{prefix}-{version}-{ddmmyy}-{###}',
      };

      const now = new Date(2025, 9, 15);
      const s = await generateSerial({ moduleDesignId: 'md-io1', now });
      expect(s).toBe('IO1-V15-151025-1000');
      expect(ruleStore['md-io1'].counter).toBe(1000);
    });

    it('should generate 50 sequential serials all unique', async () => {
      ruleStore['md-io1'] = {
        id: 'rule-1',
        moduleDesignId: 'md-io1',
        prefix: 'IO1',
        version: 'V15',
        counter: 0,
        counterLastMMYY: 1025,
        template: '{prefix}-{version}-{ddmmyy}-{###}',
      };

      const now = new Date(2025, 9, 15);
      const serials: string[] = [];
      for (let i = 0; i < 50; i++) {
        const s = await generateSerial({ moduleDesignId: 'md-io1', now });
        serials.push(s);
      }

      expect(new Set(serials).size).toBe(50);
      expect(ruleStore['md-io1'].counter).toBe(50);
    });
  });
});
