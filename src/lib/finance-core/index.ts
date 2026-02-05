/**
 * @prismy/finance-core - Unified Financial Core Library
 *
 * Shared financial functionality across all Prismy modules:
 * - MRP (Manufacturing Resource Planning)
 * - TPM (Trade Promotion Management)
 * - HRM (Human Resource Management)
 * - OTB (Open-To-Buy)
 *
 * This module provides:
 * - Type definitions for GL, Journals, Accounts
 * - Database-agnostic validation and calculation functions
 * - Vietnam-specific tax calculations (PIT, Insurance, VAT)
 * - Utility functions for formatting and period handling
 */

// ============================================================
// TYPE EXPORTS
// ============================================================

export type {
  // Enums/Type aliases
  AccountType,
  NormalBalance,
  JournalStatus,
  JournalType,
  TransactionSource,
  Currency,

  // Core interfaces
  Account,
  JournalEntry,
  JournalLine,

  // Input types
  CreateJournalInput,
  CreateJournalLineInput,

  // Result types
  AccountBalance,
  TrialBalanceRow,
  TrialBalance,
  FinancialPeriod,

  // Vietnam-specific
  VietnamTaxConfig,
} from './types';

export {
  DEFAULT_VIETNAM_TAX_CONFIG,
  FinanceCoreError,
  FinanceErrorCodes,
} from './types';

// ============================================================
// GL CORE EXPORTS
// ============================================================

export {
  // Validation
  validateJournalBalance,
  validateJournalInput,
  validateCanPost,
  validateCanVoid,
  validateCanReverse,

  // Number generation
  generateJournalNumber,
  parseJournalNumber,

  // Balance calculations
  calculateAccountBalance,
  getNormalBalance,
  calculateTrialBalanceTotals,

  // Reversal logic
  createReversalLines,

  // Formatting
  formatAmountVND,
  formatAmountUSD,
  formatAmount,

  // Period utilities
  getFiscalPeriod,
  getPeriodDateRange,

  // Chart of Accounts
  validateAccountNumber,
  getAccountLevel,
  getParentAccountNumber,
  VN_ACCOUNT_CATEGORIES,
} from './gl-core';

// ============================================================
// VIETNAM TAX EXPORTS
// ============================================================

export type {
  PITCalculationInput,
  PITCalculationResult,
  EmployerContributionResult,
  VATCalculationResult,
  PayrollSummaryInput,
  PayrollSummaryResult,
} from './vietnam-tax';

export {
  // Personal Income Tax
  calculatePIT,

  // Employer contributions
  calculateEmployerContributions,

  // VAT
  calculateVATFromBase,
  extractVATFromTotal,

  // Payroll
  calculatePayrollSummary,

  // Currency utilities
  formatVND,
  parseVND,
  roundToThousand,
} from './vietnam-tax';
