import { describe, it, expect } from 'vitest';
import {
  validateJournalBalance,
  validateJournalInput,
  generateJournalNumber,
  parseJournalNumber,
  calculateAccountBalance,
  getNormalBalance,
  calculateTrialBalanceTotals,
} from '../gl-core';

describe('GL Core', () => {
  describe('validateJournalBalance', () => {
    it('should validate balanced journal', () => {
      const result = validateJournalBalance([
        { debitAmount: 100, creditAmount: 0 },
        { debitAmount: 0, creditAmount: 100 },
      ]);
      expect(result.isValid).toBe(true);
      expect(result.totalDebit).toBe(100);
      expect(result.totalCredit).toBe(100);
      expect(result.difference).toBeLessThan(0.01);
    });

    it('should reject unbalanced journal', () => {
      const result = validateJournalBalance([
        { debitAmount: 100, creditAmount: 0 },
        { debitAmount: 0, creditAmount: 50 },
      ]);
      expect(result.isValid).toBe(false);
      expect(result.difference).toBe(50);
    });

    it('should handle multiple lines', () => {
      const result = validateJournalBalance([
        { debitAmount: 50, creditAmount: 0 },
        { debitAmount: 50, creditAmount: 0 },
        { debitAmount: 0, creditAmount: 100 },
      ]);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateJournalInput', () => {
    const validInput = {
      entryDate: new Date(),
      description: 'Test entry',
      lines: [
        { accountId: 'acc-1', debitAmount: 100, creditAmount: 0 },
        { accountId: 'acc-2', debitAmount: 0, creditAmount: 100 },
      ],
    };

    it('should accept valid input', () => {
      expect(() => validateJournalInput(validInput as any)).not.toThrow();
    });

    it('should reject missing entry date', () => {
      expect(() => validateJournalInput({ ...validInput, entryDate: null } as any)).toThrow('Entry date');
    });

    it('should reject empty description', () => {
      expect(() => validateJournalInput({ ...validInput, description: '' } as any)).toThrow('Description');
    });

    it('should reject no lines', () => {
      expect(() => validateJournalInput({ ...validInput, lines: [] } as any)).toThrow();
    });

    it('should reject single line', () => {
      expect(() => validateJournalInput({
        ...validInput,
        lines: [{ accountId: 'acc-1', debitAmount: 100, creditAmount: 0 }],
      } as any)).toThrow('at least 2');
    });

    it('should reject line without account', () => {
      expect(() => validateJournalInput({
        ...validInput,
        lines: [
          { accountId: '', debitAmount: 100, creditAmount: 0 },
          { accountId: 'acc-2', debitAmount: 0, creditAmount: 100 },
        ],
      } as any)).toThrow('Account ID');
    });

    it('should reject negative amounts', () => {
      expect(() => validateJournalInput({
        ...validInput,
        lines: [
          { accountId: 'acc-1', debitAmount: -10, creditAmount: 0 },
          { accountId: 'acc-2', debitAmount: 0, creditAmount: 100 },
        ],
      } as any)).toThrow('negative');
    });

    it('should reject zero amounts', () => {
      expect(() => validateJournalInput({
        ...validInput,
        lines: [
          { accountId: 'acc-1', debitAmount: 0, creditAmount: 0 },
          { accountId: 'acc-2', debitAmount: 0, creditAmount: 100 },
        ],
      } as any)).toThrow('greater than 0');
    });

    it('should reject both debit and credit on same line', () => {
      expect(() => validateJournalInput({
        ...validInput,
        lines: [
          { accountId: 'acc-1', debitAmount: 50, creditAmount: 50 },
          { accountId: 'acc-2', debitAmount: 0, creditAmount: 100 },
        ],
      } as any)).toThrow('both debit and credit');
    });
  });

  describe('generateJournalNumber', () => {
    it('should generate formatted number', () => {
      const result = generateJournalNumber(new Date(2024, 0, 15), 42);
      expect(result).toBe('JE-202401-00043');
    });

    it('should use custom prefix', () => {
      const result = generateJournalNumber(new Date(2024, 5, 1), 0, 'AP');
      expect(result).toBe('AP-202406-00001');
    });
  });

  describe('parseJournalNumber', () => {
    it('should parse valid journal number', () => {
      const result = parseJournalNumber('JE-202401-00043');
      expect(result).toEqual({
        prefix: 'JE',
        year: 2024,
        month: 1,
        sequence: 43,
      });
    });

    it('should return null for invalid format', () => {
      expect(parseJournalNumber('invalid')).toBeNull();
      expect(parseJournalNumber('JE-2024-001')).toBeNull();
    });
  });

  describe('calculateAccountBalance', () => {
    it('should calculate debit normal balance', () => {
      const balance = calculateAccountBalance([
        { debitAmount: 100, creditAmount: 0 },
        { debitAmount: 50, creditAmount: 30 },
      ], 'DEBIT');
      expect(balance).toBe(120); // (100+50) - (0+30)
    });

    it('should calculate credit normal balance', () => {
      const balance = calculateAccountBalance([
        { debitAmount: 0, creditAmount: 100 },
        { debitAmount: 20, creditAmount: 50 },
      ], 'CREDIT');
      expect(balance).toBe(130); // (100+50) - (0+20)
    });
  });

  describe('getNormalBalance', () => {
    it('should return DEBIT for asset accounts', () => {
      expect(getNormalBalance('ASSET')).toBe('DEBIT');
      expect(getNormalBalance('EXPENSE')).toBe('DEBIT');
    });

    it('should return CREDIT for liability accounts', () => {
      expect(getNormalBalance('LIABILITY')).toBe('CREDIT');
      expect(getNormalBalance('REVENUE')).toBe('CREDIT');
      expect(getNormalBalance('EQUITY')).toBe('CREDIT');
    });
  });

  describe('calculateTrialBalanceTotals', () => {
    it('should calculate balanced totals', () => {
      const result = calculateTrialBalanceTotals([
        { debit: 100, credit: 0 },
        { debit: 0, credit: 100 },
      ]);
      expect(result.isBalanced).toBe(true);
      expect(result.totalDebit).toBe(100);
      expect(result.totalCredit).toBe(100);
    });

    it('should detect unbalanced', () => {
      const result = calculateTrialBalanceTotals([
        { debit: 100, credit: 0 },
        { debit: 0, credit: 80 },
      ]);
      expect(result.isBalanced).toBe(false);
    });
  });
});
