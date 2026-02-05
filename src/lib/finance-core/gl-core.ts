/**
 * @prismy/finance-core - General Ledger Core Functions
 *
 * Database-agnostic GL functions that can be used with any ORM/database.
 * Actual database operations are passed in as callbacks.
 */

import {
  JournalEntry,
  JournalLine,
  CreateJournalInput,
  AccountBalance,
  TrialBalance,
  FinanceCoreError,
  FinanceErrorCodes,
  JournalStatus,
} from './types';

// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

/**
 * Validate journal entry is balanced (debits = credits)
 */
export function validateJournalBalance(
  lines: Array<{ debitAmount: number; creditAmount: number }>
): { isValid: boolean; totalDebit: number; totalCredit: number; difference: number } {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    totalDebit += line.debitAmount;
    totalCredit += line.creditAmount;
  }

  const difference = Math.abs(totalDebit - totalCredit);
  const isValid = difference < 0.01; // Allow for floating point errors

  return { isValid, totalDebit, totalCredit, difference };
}

/**
 * Validate journal entry before creation
 */
export function validateJournalInput(input: CreateJournalInput): void {
  // Check required fields
  if (!input.entryDate) {
    throw new FinanceCoreError('VALIDATION_ERROR', 'Entry date is required');
  }

  if (!input.description || input.description.trim() === '') {
    throw new FinanceCoreError('VALIDATION_ERROR', 'Description is required');
  }

  if (!input.lines || input.lines.length === 0) {
    throw new FinanceCoreError('VALIDATION_ERROR', 'At least one line is required');
  }

  if (input.lines.length < 2) {
    throw new FinanceCoreError('VALIDATION_ERROR', 'Journal must have at least 2 lines');
  }

  // Validate each line
  for (let i = 0; i < input.lines.length; i++) {
    const line = input.lines[i];

    if (!line.accountId) {
      throw new FinanceCoreError('VALIDATION_ERROR', `Line ${i + 1}: Account ID is required`);
    }

    if (line.debitAmount < 0 || line.creditAmount < 0) {
      throw new FinanceCoreError('VALIDATION_ERROR', `Line ${i + 1}: Amounts cannot be negative`);
    }

    if (line.debitAmount === 0 && line.creditAmount === 0) {
      throw new FinanceCoreError('VALIDATION_ERROR', `Line ${i + 1}: Either debit or credit must be greater than 0`);
    }

    if (line.debitAmount > 0 && line.creditAmount > 0) {
      throw new FinanceCoreError('VALIDATION_ERROR', `Line ${i + 1}: Line cannot have both debit and credit`);
    }
  }

  // Validate balance
  const { isValid, totalDebit, totalCredit } = validateJournalBalance(input.lines);
  if (!isValid) {
    throw new FinanceCoreError(
      FinanceErrorCodes.JOURNAL_NOT_BALANCED,
      `Journal not balanced: Debit ${totalDebit.toFixed(2)} ≠ Credit ${totalCredit.toFixed(2)}`
    );
  }
}

// ============================================================
// NUMBER GENERATION
// ============================================================

/**
 * Generate journal entry number
 * Format: JE-YYYYMM-XXXXX
 */
export function generateJournalNumber(
  date: Date,
  lastNumber: number,
  prefix: string = 'JE'
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const sequence = String(lastNumber + 1).padStart(5, '0');
  return `${prefix}-${year}${month}-${sequence}`;
}

/**
 * Parse journal number to extract components
 */
export function parseJournalNumber(
  entryNumber: string
): { prefix: string; year: number; month: number; sequence: number } | null {
  const match = entryNumber.match(/^([A-Z]+)-(\d{4})(\d{2})-(\d+)$/);
  if (!match) return null;

  return {
    prefix: match[1],
    year: parseInt(match[2]),
    month: parseInt(match[3]),
    sequence: parseInt(match[4]),
  };
}

// ============================================================
// BALANCE CALCULATIONS
// ============================================================

/**
 * Calculate account balance from journal lines
 */
export function calculateAccountBalance(
  lines: Array<{ debitAmount: number; creditAmount: number }>,
  normalBalance: 'DEBIT' | 'CREDIT'
): number {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    totalDebit += line.debitAmount;
    totalCredit += line.creditAmount;
  }

  return normalBalance === 'DEBIT'
    ? totalDebit - totalCredit
    : totalCredit - totalDebit;
}

/**
 * Get normal balance for account type
 */
export function getNormalBalance(accountType: string): 'DEBIT' | 'CREDIT' {
  const debitAccounts = ['ASSET', 'EXPENSE', 'CONTRA_LIABILITY', 'CONTRA_EQUITY', 'CONTRA_REVENUE'];
  return debitAccounts.includes(accountType) ? 'DEBIT' : 'CREDIT';
}

/**
 * Calculate trial balance totals
 */
export function calculateTrialBalanceTotals(
  rows: Array<{ debit: number; credit: number }>
): { totalDebit: number; totalCredit: number; isBalanced: boolean } {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const row of rows) {
    totalDebit += row.debit;
    totalCredit += row.credit;
  }

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return { totalDebit, totalCredit, isBalanced };
}

// ============================================================
// REVERSAL LOGIC
// ============================================================

/**
 * Create reversal journal lines (swap debits and credits)
 */
export function createReversalLines<T extends { debitAmount: number; creditAmount: number }>(
  originalLines: T[]
): Array<Omit<T, 'debitAmount' | 'creditAmount'> & { debitAmount: number; creditAmount: number }> {
  return originalLines.map((line) => ({
    ...line,
    debitAmount: line.creditAmount,
    creditAmount: line.debitAmount,
  }));
}

// ============================================================
// POSTING VALIDATION
// ============================================================

/**
 * Validate journal can be posted
 */
export function validateCanPost(
  journal: Pick<JournalEntry, 'status' | 'totalDebit' | 'totalCredit'>
): void {
  if (journal.status === 'POSTED') {
    throw new FinanceCoreError(
      FinanceErrorCodes.JOURNAL_ALREADY_POSTED,
      'Journal entry already posted'
    );
  }

  if (journal.status === 'VOID') {
    throw new FinanceCoreError(
      FinanceErrorCodes.JOURNAL_ALREADY_VOID,
      'Cannot post a voided entry'
    );
  }

  const { isValid } = validateJournalBalance([
    { debitAmount: journal.totalDebit, creditAmount: journal.totalCredit },
  ]);

  if (!isValid) {
    throw new FinanceCoreError(
      FinanceErrorCodes.JOURNAL_NOT_BALANCED,
      'Journal entry not balanced'
    );
  }
}

/**
 * Validate journal can be voided
 */
export function validateCanVoid(
  journal: Pick<JournalEntry, 'status'>
): void {
  if (journal.status === 'VOID') {
    throw new FinanceCoreError(
      FinanceErrorCodes.JOURNAL_ALREADY_VOID,
      'Journal entry already voided'
    );
  }
}

/**
 * Validate journal can be reversed
 */
export function validateCanReverse(
  journal: Pick<JournalEntry, 'status' | 'reversedBy'>
): void {
  if (journal.status !== 'POSTED') {
    throw new FinanceCoreError(
      'INVALID_STATUS',
      'Can only reverse posted entries'
    );
  }

  if (journal.reversedBy) {
    throw new FinanceCoreError(
      FinanceErrorCodes.JOURNAL_ALREADY_REVERSED,
      'Entry already reversed'
    );
  }
}

// ============================================================
// FORMATTING UTILITIES
// ============================================================

/**
 * Format amount for display (VND)
 */
export function formatAmountVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format amount for display (USD)
 */
export function formatAmountUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format amount based on currency
 */
export function formatAmount(amount: number, currency: string = 'VND'): string {
  if (currency === 'VND') return formatAmountVND(amount);
  if (currency === 'USD') return formatAmountUSD(amount);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ============================================================
// PERIOD UTILITIES
// ============================================================

/**
 * Get fiscal period from date
 */
export function getFiscalPeriod(
  date: Date,
  fiscalYearStartMonth: number = 1 // Default: January
): { year: number; month: number; period: number } {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();

  let fiscalYear = year;
  let period = month - fiscalYearStartMonth + 1;

  if (period <= 0) {
    period += 12;
    fiscalYear -= 1;
  }

  return { year: fiscalYear, month, period };
}

/**
 * Get period date range
 */
export function getPeriodDateRange(
  year: number,
  month: number
): { startDate: Date; endDate: Date } {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month

  return { startDate, endDate };
}

// ============================================================
// CHART OF ACCOUNTS UTILITIES
// ============================================================

/**
 * Validate account number format
 * Standard format: XXXX or XXXX-XX or XXXX-XX-XXX
 */
export function validateAccountNumber(accountNumber: string): boolean {
  const pattern = /^\d{4}(-\d{2,3})*$/;
  return pattern.test(accountNumber);
}

/**
 * Get account level from account number
 */
export function getAccountLevel(accountNumber: string): number {
  const parts = accountNumber.split('-');
  return parts.length;
}

/**
 * Get parent account number
 */
export function getParentAccountNumber(accountNumber: string): string | null {
  const parts = accountNumber.split('-');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('-');
}

/**
 * Standard Vietnam Chart of Accounts categories
 */
export const VN_ACCOUNT_CATEGORIES = {
  '1': { name: 'Tài sản', nameEn: 'Assets', type: 'ASSET' },
  '2': { name: 'Nợ phải trả', nameEn: 'Liabilities', type: 'LIABILITY' },
  '3': { name: 'Vốn chủ sở hữu', nameEn: 'Equity', type: 'EQUITY' },
  '4': { name: 'Doanh thu', nameEn: 'Revenue', type: 'REVENUE' },
  '5': { name: 'Chi phí', nameEn: 'Expenses', type: 'EXPENSE' },
  '6': { name: 'Chi phí sản xuất', nameEn: 'Production Costs', type: 'EXPENSE' },
  '7': { name: 'Thu nhập khác', nameEn: 'Other Income', type: 'REVENUE' },
  '8': { name: 'Chi phí khác', nameEn: 'Other Expenses', type: 'EXPENSE' },
  '9': { name: 'Kết quả kinh doanh', nameEn: 'P&L Summary', type: 'EQUITY' },
} as const;
