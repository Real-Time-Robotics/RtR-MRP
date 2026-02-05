/**
 * @prismy/finance-core - Unified Financial Types
 *
 * Shared types for GL, Journals, Accounts across all Prismy modules:
 * - MRP (Manufacturing)
 * - TPM (Trade Promotion)
 * - HRM (Human Resources)
 * - OTB (Open-To-Buy)
 */

// ============================================================
// ENUMS
// ============================================================

export type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'REVENUE'
  | 'EXPENSE'
  | 'CONTRA_ASSET'
  | 'CONTRA_LIABILITY'
  | 'CONTRA_EQUITY'
  | 'CONTRA_REVENUE'
  | 'CONTRA_EXPENSE';

export type NormalBalance = 'DEBIT' | 'CREDIT';

export type JournalStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'POSTED' | 'VOID' | 'REVERSED';

export type JournalType =
  | 'STANDARD'      // Manual entry
  | 'ADJUSTING'     // Period-end adjustments
  | 'CLOSING'       // Period close entries
  | 'REVERSING'     // Reversal entries
  | 'ACCRUAL'       // Accrual entries
  | 'PAYROLL'       // Payroll entries (HRM)
  | 'AP_INVOICE'    // Accounts Payable (MRP)
  | 'AR_INVOICE'    // Accounts Receivable (MRP)
  | 'PROMOTION'     // Promotion expense (TPM)
  | 'CLAIM'         // Claim settlement (TPM)
  | 'BUDGET'        // Budget entries (OTB)
  | 'INVENTORY'     // Inventory adjustments
  | 'DEPRECIATION'; // Asset depreciation

export type TransactionSource =
  | 'MANUAL'
  | 'SYSTEM'
  | 'IMPORT'
  | 'API'
  | 'INTEGRATION';

export type Currency = 'VND' | 'USD' | 'EUR' | 'GBP' | 'SGD' | 'JPY' | 'CNY';

// ============================================================
// CORE INTERFACES
// ============================================================

export interface Account {
  id: string;
  accountNumber: string;
  name: string;
  nameVi?: string;          // Vietnamese name
  accountType: AccountType;
  normalBalance: NormalBalance;
  parentId?: string;
  level: number;
  isActive: boolean;
  isControl: boolean;       // Control account (has sub-ledger)
  isBankAccount: boolean;
  currency: Currency;
  description?: string;

  // Tenant support
  tenantId?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: Date;
  postingDate?: Date;

  journalType: JournalType;
  status: JournalStatus;

  description: string;
  reference?: string;
  memo?: string;

  // Totals
  totalDebit: number;
  totalCredit: number;

  // Source tracking
  source: TransactionSource;
  sourceModule?: string;    // 'MRP', 'TPM', 'HRM', 'OTB'
  sourceId?: string;        // ID in source module

  // Relationships
  reversalOf?: string;      // If this is a reversal
  reversedBy?: string;      // If this was reversed

  // Approval workflow
  approvedBy?: string;
  approvedAt?: Date;

  // Posting
  postedBy?: string;
  postedAt?: Date;

  // Tenant support
  tenantId?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;

  // Lines
  lines: JournalLine[];
}

export interface JournalLine {
  id: string;
  journalEntryId: string;
  lineNumber: number;

  // Account reference
  accountId: string;
  accountNumber?: string;   // Denormalized for display
  accountName?: string;     // Denormalized for display

  // Amounts
  debitAmount: number;
  creditAmount: number;

  // Description
  description?: string;

  // Dimensions (for cost allocation)
  departmentId?: string;
  projectId?: string;
  costCenterId?: string;
  customerId?: string;
  supplierId?: string;
  employeeId?: string;
  productId?: string;

  // Multi-currency
  currency?: Currency;
  exchangeRate?: number;
  baseCurrencyDebit?: number;
  baseCurrencyCredit?: number;

  // Tax
  taxCode?: string;
  taxAmount?: number;
}

// ============================================================
// INPUT TYPES
// ============================================================

export interface CreateJournalInput {
  entryDate: Date;
  journalType?: JournalType;
  description: string;
  reference?: string;
  memo?: string;
  lines: CreateJournalLineInput[];

  // Source tracking
  sourceModule?: string;
  sourceId?: string;

  // Auto-post
  autoPost?: boolean;
}

export interface CreateJournalLineInput {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;

  // Dimensions
  departmentId?: string;
  projectId?: string;
  costCenterId?: string;
  customerId?: string;
  supplierId?: string;
  employeeId?: string;
  productId?: string;

  // Multi-currency
  currency?: Currency;
  exchangeRate?: number;
}

// ============================================================
// RESULT TYPES
// ============================================================

export interface AccountBalance {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  normalBalance: NormalBalance;

  totalDebit: number;
  totalCredit: number;
  balance: number;

  // Period comparison
  openingBalance?: number;
  periodDebit?: number;
  periodCredit?: number;
  closingBalance?: number;
}

export interface TrialBalanceRow {
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalance {
  asOfDate: Date;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export interface FinancialPeriod {
  id: string;
  year: number;
  month: number;
  name: string;
  startDate: Date;
  endDate: Date;
  isClosed: boolean;
  closedAt?: Date;
  closedBy?: string;
}

// ============================================================
// VIETNAM-SPECIFIC TYPES
// ============================================================

export interface VietnamTaxConfig {
  // Personal Income Tax brackets
  pitBrackets: Array<{
    minIncome: number;
    maxIncome: number;
    rate: number;
  }>;

  // Insurance rates (as of 2024)
  bhxhEmployeeRate: number;  // 8%
  bhxhEmployerRate: number;  // 17.5%
  bhytEmployeeRate: number;  // 1.5%
  bhytEmployerRate: number;  // 3%
  bhtnEmployeeRate: number;  // 1%
  bhtnEmployerRate: number;  // 1%

  // Deductions
  personalDeduction: number;     // 11,000,000 VND
  dependentDeduction: number;    // 4,400,000 VND per dependent

  // Insurance ceiling
  insuranceCeiling: number;      // 20x base salary

  // VAT rates
  vatStandardRate: number;       // 10%
  vatReducedRate: number;        // 5%
  vatZeroRate: number;           // 0%
}

export const DEFAULT_VIETNAM_TAX_CONFIG: VietnamTaxConfig = {
  pitBrackets: [
    { minIncome: 0, maxIncome: 5000000, rate: 0.05 },
    { minIncome: 5000000, maxIncome: 10000000, rate: 0.10 },
    { minIncome: 10000000, maxIncome: 18000000, rate: 0.15 },
    { minIncome: 18000000, maxIncome: 32000000, rate: 0.20 },
    { minIncome: 32000000, maxIncome: 52000000, rate: 0.25 },
    { minIncome: 52000000, maxIncome: 80000000, rate: 0.30 },
    { minIncome: 80000000, maxIncome: Infinity, rate: 0.35 },
  ],
  bhxhEmployeeRate: 0.08,
  bhxhEmployerRate: 0.175,
  bhytEmployeeRate: 0.015,
  bhytEmployerRate: 0.03,
  bhtnEmployeeRate: 0.01,
  bhtnEmployerRate: 0.01,
  personalDeduction: 11000000,
  dependentDeduction: 4400000,
  insuranceCeiling: 36000000,  // 20 x 1,800,000 base
  vatStandardRate: 0.10,
  vatReducedRate: 0.05,
  vatZeroRate: 0,
};

// ============================================================
// ERROR TYPES
// ============================================================

export class FinanceCoreError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FinanceCoreError';
  }
}

export const FinanceErrorCodes = {
  JOURNAL_NOT_BALANCED: 'JOURNAL_NOT_BALANCED',
  JOURNAL_NOT_FOUND: 'JOURNAL_NOT_FOUND',
  JOURNAL_ALREADY_POSTED: 'JOURNAL_ALREADY_POSTED',
  JOURNAL_ALREADY_VOID: 'JOURNAL_ALREADY_VOID',
  JOURNAL_ALREADY_REVERSED: 'JOURNAL_ALREADY_REVERSED',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  PERIOD_CLOSED: 'PERIOD_CLOSED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
} as const;
