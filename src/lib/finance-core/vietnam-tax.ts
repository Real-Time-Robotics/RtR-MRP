/**
 * @prismy/finance-core - Vietnam Tax Calculations
 *
 * Implements Vietnam-specific tax calculations:
 * - Personal Income Tax (PIT / Thuế TNCN)
 * - Social Insurance (BHXH)
 * - Health Insurance (BHYT)
 * - Unemployment Insurance (BHTN)
 * - VAT calculations
 */

import { VietnamTaxConfig, DEFAULT_VIETNAM_TAX_CONFIG } from './types';

// ============================================================
// PERSONAL INCOME TAX (PIT)
// ============================================================

export interface PITCalculationInput {
  grossIncome: number;           // Tổng thu nhập
  insuranceSalary: number;       // Mức đóng BHXH (có thể khác gross)
  dependentCount: number;        // Số người phụ thuộc
  otherDeductions?: number;      // Các khoản giảm trừ khác
  config?: VietnamTaxConfig;
}

export interface PITCalculationResult {
  grossIncome: number;
  totalInsuranceEmployee: number;
  personalDeduction: number;
  dependentDeduction: number;
  otherDeductions: number;
  taxableIncome: number;
  assessableIncome: number;      // Thu nhập chịu thuế sau giảm trừ
  pitAmount: number;             // Thuế TNCN
  netIncome: number;
  effectiveRate: number;         // Thuế suất thực tế

  // Insurance breakdown
  bhxhEmployee: number;
  bhytEmployee: number;
  bhtnEmployee: number;

  // Tax bracket details
  taxBracketBreakdown: Array<{
    bracket: number;
    rate: number;
    income: number;
    tax: number;
  }>;
}

/**
 * Calculate Personal Income Tax (Vietnam)
 *
 * Formula:
 * 1. Gross Income
 * 2. - Insurance contributions (BHXH + BHYT + BHTN)
 * 3. = Taxable Income
 * 4. - Personal deduction (11M VND)
 * 5. - Dependent deductions (4.4M x number)
 * 6. - Other deductions
 * 7. = Assessable Income
 * 8. Apply progressive tax rates
 * 9. = PIT Amount
 */
export function calculatePIT(input: PITCalculationInput): PITCalculationResult {
  const config = input.config || DEFAULT_VIETNAM_TAX_CONFIG;
  const { grossIncome, insuranceSalary, dependentCount, otherDeductions = 0 } = input;

  // Calculate insurance contributions (employee portion)
  const insuranceBase = Math.min(insuranceSalary, config.insuranceCeiling);
  const bhxhEmployee = insuranceBase * config.bhxhEmployeeRate;
  const bhytEmployee = insuranceBase * config.bhytEmployeeRate;
  const bhtnEmployee = insuranceBase * config.bhtnEmployeeRate;
  const totalInsuranceEmployee = bhxhEmployee + bhytEmployee + bhtnEmployee;

  // Calculate taxable income
  const taxableIncome = grossIncome - totalInsuranceEmployee;

  // Calculate deductions
  const personalDeduction = config.personalDeduction;
  const dependentDeduction = dependentCount * config.dependentDeduction;
  const totalDeductions = personalDeduction + dependentDeduction + otherDeductions;

  // Calculate assessable income (cannot be negative)
  const assessableIncome = Math.max(0, taxableIncome - totalDeductions);

  // Calculate PIT using progressive brackets
  let pitAmount = 0;
  let remainingIncome = assessableIncome;
  const taxBracketBreakdown: PITCalculationResult['taxBracketBreakdown'] = [];

  for (let i = 0; i < config.pitBrackets.length && remainingIncome > 0; i++) {
    const bracket = config.pitBrackets[i];
    const bracketWidth = i === 0
      ? bracket.maxIncome
      : bracket.maxIncome - config.pitBrackets[i - 1].maxIncome;

    const incomeInBracket = Math.min(remainingIncome, bracketWidth);
    const taxInBracket = incomeInBracket * bracket.rate;

    if (incomeInBracket > 0) {
      taxBracketBreakdown.push({
        bracket: i + 1,
        rate: bracket.rate,
        income: incomeInBracket,
        tax: taxInBracket,
      });
    }

    pitAmount += taxInBracket;
    remainingIncome -= incomeInBracket;
  }

  // Calculate net income
  const netIncome = grossIncome - totalInsuranceEmployee - pitAmount;

  // Calculate effective tax rate
  const effectiveRate = grossIncome > 0 ? pitAmount / grossIncome : 0;

  return {
    grossIncome,
    totalInsuranceEmployee,
    personalDeduction,
    dependentDeduction,
    otherDeductions,
    taxableIncome,
    assessableIncome,
    pitAmount,
    netIncome,
    effectiveRate,
    bhxhEmployee,
    bhytEmployee,
    bhtnEmployee,
    taxBracketBreakdown,
  };
}

// ============================================================
// EMPLOYER CONTRIBUTIONS
// ============================================================

export interface EmployerContributionResult {
  bhxhEmployer: number;
  bhytEmployer: number;
  bhtnEmployer: number;
  totalEmployerContribution: number;
  totalLaborCost: number;  // Gross + Employer contributions
}

/**
 * Calculate employer insurance contributions
 */
export function calculateEmployerContributions(
  grossSalary: number,
  insuranceSalary: number,
  config?: VietnamTaxConfig
): EmployerContributionResult {
  const cfg = config || DEFAULT_VIETNAM_TAX_CONFIG;

  const insuranceBase = Math.min(insuranceSalary, cfg.insuranceCeiling);

  const bhxhEmployer = insuranceBase * cfg.bhxhEmployerRate;
  const bhytEmployer = insuranceBase * cfg.bhytEmployerRate;
  const bhtnEmployer = insuranceBase * cfg.bhtnEmployerRate;
  const totalEmployerContribution = bhxhEmployer + bhytEmployer + bhtnEmployer;

  return {
    bhxhEmployer,
    bhytEmployer,
    bhtnEmployer,
    totalEmployerContribution,
    totalLaborCost: grossSalary + totalEmployerContribution,
  };
}

// ============================================================
// VAT CALCULATIONS
// ============================================================

export interface VATCalculationResult {
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
  vatRate: number;
}

/**
 * Calculate VAT from base amount (exclusive)
 */
export function calculateVATFromBase(
  baseAmount: number,
  vatRate: number = DEFAULT_VIETNAM_TAX_CONFIG.vatStandardRate
): VATCalculationResult {
  const vatAmount = baseAmount * vatRate;
  return {
    baseAmount,
    vatAmount,
    totalAmount: baseAmount + vatAmount,
    vatRate,
  };
}

/**
 * Extract VAT from total amount (inclusive)
 */
export function extractVATFromTotal(
  totalAmount: number,
  vatRate: number = DEFAULT_VIETNAM_TAX_CONFIG.vatStandardRate
): VATCalculationResult {
  const baseAmount = totalAmount / (1 + vatRate);
  const vatAmount = totalAmount - baseAmount;
  return {
    baseAmount,
    vatAmount,
    totalAmount,
    vatRate,
  };
}

// ============================================================
// PAYROLL SUMMARY
// ============================================================

export interface PayrollSummaryInput {
  grossSalary: number;
  insuranceSalary: number;
  dependentCount: number;
  workDays?: number;
  standardDays?: number;
  otHoursWeekday?: number;
  otHoursWeekend?: number;
  otHoursHoliday?: number;
  otRateWeekday?: number;    // Default: 1.5
  otRateWeekend?: number;    // Default: 2.0
  otRateHoliday?: number;    // Default: 3.0
  allowances?: number;
  bonuses?: number;
  deductions?: number;
}

export interface PayrollSummaryResult extends PITCalculationResult, EmployerContributionResult {
  // Work details
  workDays: number;
  standardDays: number;

  // Overtime
  otHoursWeekday: number;
  otHoursWeekend: number;
  otHoursHoliday: number;
  otAmountWeekday: number;
  otAmountWeekend: number;
  otAmountHoliday: number;
  totalOTAmount: number;

  // Additions
  allowances: number;
  bonuses: number;

  // Deductions
  otherDeductions: number;

  // Totals
  totalEarnings: number;
  totalDeductionsAmount: number;
}

/**
 * Calculate complete payroll for an employee
 */
export function calculatePayrollSummary(
  input: PayrollSummaryInput,
  config?: VietnamTaxConfig
): PayrollSummaryResult {
  const {
    grossSalary,
    insuranceSalary,
    dependentCount,
    workDays = 22,
    standardDays = 22,
    otHoursWeekday = 0,
    otHoursWeekend = 0,
    otHoursHoliday = 0,
    otRateWeekday = 1.5,
    otRateWeekend = 2.0,
    otRateHoliday = 3.0,
    allowances = 0,
    bonuses = 0,
    deductions = 0,
  } = input;

  // Calculate hourly rate (assuming 8 hours/day, 22 days/month)
  const hourlyRate = grossSalary / (standardDays * 8);

  // Calculate OT amounts
  const otAmountWeekday = otHoursWeekday * hourlyRate * otRateWeekday;
  const otAmountWeekend = otHoursWeekend * hourlyRate * otRateWeekend;
  const otAmountHoliday = otHoursHoliday * hourlyRate * otRateHoliday;
  const totalOTAmount = otAmountWeekday + otAmountWeekend + otAmountHoliday;

  // Calculate total earnings
  const totalEarnings = grossSalary + totalOTAmount + allowances + bonuses;

  // Calculate PIT
  const pitResult = calculatePIT({
    grossIncome: totalEarnings,
    insuranceSalary,
    dependentCount,
    otherDeductions: deductions,
    config,
  });

  // Calculate employer contributions
  const employerResult = calculateEmployerContributions(totalEarnings, insuranceSalary, config);

  // Total deductions
  const totalDeductionsAmount = pitResult.totalInsuranceEmployee + pitResult.pitAmount + deductions;

  return {
    ...pitResult,
    ...employerResult,

    workDays,
    standardDays,

    otHoursWeekday,
    otHoursWeekend,
    otHoursHoliday,
    otAmountWeekday,
    otAmountWeekend,
    otAmountHoliday,
    totalOTAmount,

    allowances,
    bonuses,

    totalEarnings,
    totalDeductionsAmount,
  };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format Vietnamese currency
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Parse Vietnamese currency string to number
 */
export function parseVND(str: string): number {
  return parseInt(str.replace(/[^\d]/g, ''), 10) || 0;
}

/**
 * Round to nearest thousand (common in VN)
 */
export function roundToThousand(amount: number): number {
  return Math.round(amount / 1000) * 1000;
}
