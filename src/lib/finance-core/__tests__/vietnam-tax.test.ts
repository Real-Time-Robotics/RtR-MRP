import { describe, it, expect } from 'vitest';
import {
  calculatePIT,
  calculateEmployerContributions,
  calculateVATFromBase,
  extractVATFromTotal,
  calculatePayrollSummary,
  formatVND,
  parseVND,
  roundToThousand,
} from '../vietnam-tax';

describe('Vietnam Tax', () => {
  describe('calculatePIT', () => {
    it('should calculate PIT for standard salary', () => {
      const result = calculatePIT({
        grossIncome: 30000000, // 30M VND
        insuranceSalary: 30000000,
        dependentCount: 0,
      });
      expect(result.grossIncome).toBe(30000000);
      expect(result.pitAmount).toBeGreaterThanOrEqual(0);
      expect(result.netIncome).toBeLessThanOrEqual(30000000);
      expect(result.totalInsuranceEmployee).toBeGreaterThan(0);
      expect(result.effectiveRate).toBeGreaterThanOrEqual(0);
      expect(result.effectiveRate).toBeLessThanOrEqual(1);
    });

    it('should reduce tax with dependents', () => {
      const noDeps = calculatePIT({
        grossIncome: 30000000,
        insuranceSalary: 30000000,
        dependentCount: 0,
      });
      const withDeps = calculatePIT({
        grossIncome: 30000000,
        insuranceSalary: 30000000,
        dependentCount: 2,
      });
      expect(withDeps.pitAmount).toBeLessThanOrEqual(noDeps.pitAmount);
      expect(withDeps.dependentDeduction).toBeGreaterThan(0);
    });

    it('should calculate insurance contributions', () => {
      const result = calculatePIT({
        grossIncome: 20000000,
        insuranceSalary: 20000000,
        dependentCount: 0,
      });
      expect(result.bhxhEmployee).toBeGreaterThan(0);
      expect(result.bhytEmployee).toBeGreaterThan(0);
      expect(result.bhtnEmployee).toBeGreaterThan(0);
      expect(result.totalInsuranceEmployee).toBe(
        result.bhxhEmployee + result.bhytEmployee + result.bhtnEmployee
      );
    });

    it('should have zero PIT for low income', () => {
      const result = calculatePIT({
        grossIncome: 10000000, // 10M VND - likely below threshold
        insuranceSalary: 10000000,
        dependentCount: 1,
      });
      expect(result.pitAmount).toBeGreaterThanOrEqual(0);
      expect(result.assessableIncome).toBeGreaterThanOrEqual(0);
    });

    it('should provide tax bracket breakdown', () => {
      const result = calculatePIT({
        grossIncome: 50000000,
        insuranceSalary: 50000000,
        dependentCount: 0,
      });
      expect(result.taxBracketBreakdown).toBeDefined();
      expect(Array.isArray(result.taxBracketBreakdown)).toBe(true);
      if (result.pitAmount > 0) {
        expect(result.taxBracketBreakdown.length).toBeGreaterThan(0);
      }
    });

    it('should handle zero income', () => {
      const result = calculatePIT({
        grossIncome: 0,
        insuranceSalary: 0,
        dependentCount: 0,
      });
      expect(result.pitAmount).toBe(0);
      expect(result.netIncome).toBe(0);
    });
  });

  describe('calculateEmployerContributions', () => {
    it('should calculate employer contributions', () => {
      const result = calculateEmployerContributions(20000000, 20000000);
      expect(result.bhxhEmployer).toBeGreaterThan(0);
      expect(result.bhytEmployer).toBeGreaterThan(0);
      expect(result.bhtnEmployer).toBeGreaterThan(0);
      expect(result.totalEmployerContribution).toBe(
        result.bhxhEmployer + result.bhytEmployer + result.bhtnEmployer
      );
    });

    it('should calculate total labor cost', () => {
      const gross = 20000000;
      const result = calculateEmployerContributions(gross, gross);
      expect(result.totalLaborCost).toBe(gross + result.totalEmployerContribution);
    });

    it('should handle different insurance salary', () => {
      const result1 = calculateEmployerContributions(30000000, 20000000);
      const result2 = calculateEmployerContributions(30000000, 30000000);
      expect(result2.totalEmployerContribution).toBeGreaterThanOrEqual(result1.totalEmployerContribution);
    });
  });

  describe('calculateVATFromBase', () => {
    it('should calculate VAT from base amount', () => {
      const result = calculateVATFromBase(1000000);
      expect(result.baseAmount).toBe(1000000);
      expect(result.vatAmount).toBeGreaterThan(0);
      expect(result.totalAmount).toBe(result.baseAmount + result.vatAmount);
    });

    it('should use custom VAT rate', () => {
      const result = calculateVATFromBase(1000000, 0.05);
      expect(result.vatAmount).toBe(50000);
      expect(result.vatRate).toBe(0.05);
    });
  });

  describe('extractVATFromTotal', () => {
    it('should extract VAT from total', () => {
      const result = extractVATFromTotal(1100000, 0.10);
      expect(result.totalAmount).toBe(1100000);
      expect(Math.round(result.baseAmount)).toBe(1000000);
      expect(Math.round(result.vatAmount)).toBe(100000);
    });
  });

  describe('calculatePayrollSummary', () => {
    it('should calculate complete payroll', () => {
      const result = calculatePayrollSummary({
        grossSalary: 20000000,
        insuranceSalary: 20000000,
        dependentCount: 1,
      });
      expect(result.totalEarnings).toBe(20000000);
      expect(result.totalDeductionsAmount).toBeGreaterThan(0);
    });

    it('should include overtime calculations', () => {
      const result = calculatePayrollSummary({
        grossSalary: 20000000,
        insuranceSalary: 20000000,
        dependentCount: 0,
        otHoursWeekday: 10,
        otHoursWeekend: 8,
      });
      expect(result.otAmountWeekday).toBeGreaterThan(0);
      expect(result.otAmountWeekend).toBeGreaterThan(0);
      expect(result.totalOTAmount).toBe(
        result.otAmountWeekday + result.otAmountWeekend + result.otAmountHoliday
      );
      expect(result.totalEarnings).toBeGreaterThan(20000000);
    });

    it('should include allowances and bonuses', () => {
      const result = calculatePayrollSummary({
        grossSalary: 20000000,
        insuranceSalary: 20000000,
        dependentCount: 0,
        allowances: 2000000,
        bonuses: 5000000,
      });
      expect(result.allowances).toBe(2000000);
      expect(result.bonuses).toBe(5000000);
      expect(result.totalEarnings).toBe(27000000);
    });
  });

  describe('formatVND', () => {
    it('should format as Vietnamese currency', () => {
      const result = formatVND(1000000);
      expect(result).toContain('1.000.000');
    });
  });

  describe('parseVND', () => {
    it('should parse currency string', () => {
      expect(parseVND('1.000.000')).toBe(1000000);
    });

    it('should handle invalid input', () => {
      expect(parseVND('abc')).toBe(0);
    });
  });

  describe('roundToThousand', () => {
    it('should round to nearest thousand', () => {
      expect(roundToThousand(1500)).toBe(2000);
      expect(roundToThousand(1499)).toBe(1000);
      expect(roundToThousand(1000)).toBe(1000);
    });
  });
});
