// src/lib/finance/types.ts
// Financial Module Types

export interface CostBreakdown {
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  subcontractCost: number;
  otherCost: number;
  totalCost: number;
}

export interface RollupResult {
  partId: string;
  partNumber: string;
  bomLevel: number;
  costs: CostBreakdown;
  children: RollupResult[];
}

export interface VarianceResult {
  varianceType: string;
  standardAmount: number;
  actualAmount: number;
  varianceAmount: number;
  variancePercent: number;
  favorable: boolean;
  details: VarianceDetail[];
}

export interface VarianceDetail {
  reference: string;
  description: string;
  standardAmount: number;
  actualAmount: number;
  variance: number;
}

export interface InvoiceLineInput {
  partId?: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountPercent?: number;
}

export interface CreatePurchaseInvoiceInput {
  supplierId: string;
  purchaseOrderId?: string;
  vendorInvoiceNo?: string;
  invoiceDate: Date;
  dueDate: Date;
  lines: InvoiceLineInput[];
  notes?: string;
  shippingAmount?: number;
  paymentTerms?: string;
}

export interface CreateSalesInvoiceInput {
  customerId: string;
  salesOrderId?: string;
  invoiceDate: Date;
  dueDate: Date;
  lines: InvoiceLineInput[];
  notes?: string;
  shippingAmount?: number;
  paymentTerms?: string;
}

export interface PaymentInput {
  invoiceId: string;
  paymentDate: Date;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
}

export interface JournalEntryInput {
  entryDate: Date;
  description: string;
  reference?: string;
  lines: JournalLineInput[];
}

export interface JournalLineInput {
  accountId: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
  departmentId?: string;
  projectId?: string;
  costCenterId?: string;
}

export interface FinancialSummary {
  revenue: {
    mtd: number;
    ytd: number;
    change: number;
  };
  cogs: {
    mtd: number;
    ytd: number;
    change: number;
  };
  grossProfit: {
    mtd: number;
    ytd: number;
    margin: number;
  };
  accountsPayable: {
    total: number;
    current: number;
    overdue30: number;
    overdue60: number;
    overdue90: number;
  };
  accountsReceivable: {
    total: number;
    current: number;
    overdue30: number;
    overdue60: number;
    overdue90: number;
  };
}

export interface MarginAnalysis {
  productId: string;
  productName: string;
  sku: string;
  revenue: number;
  cogs: number;
  grossMargin: number;
  marginPercent: number;
  unitsSold: number;
}

export interface CostAnalysis {
  partId: string;
  partNumber: string;
  partName: string;
  standardCost: number;
  actualCost: number;
  variance: number;
  variancePercent: number;
  costBreakdown: CostBreakdown;
}

export type VarianceType =
  | "MATERIAL_PRICE"
  | "MATERIAL_USAGE"
  | "LABOR_RATE"
  | "LABOR_EFFICIENCY"
  | "OVERHEAD";

export type AccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE";

export type CostCategory =
  | "MATERIAL"
  | "LABOR"
  | "OVERHEAD"
  | "SUBCONTRACT"
  | "OTHER";

export type InvoiceStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "VOID";

export type JournalStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "POSTED"
  | "VOID";

// ============================================================
// Financial Calculation Types (Integrated from SHEETS module)
// ============================================================

export interface LoanResult {
  payment: number;
  totalPayment: number;
  totalInterest: number;
}

export interface AmortizationScheduleItem {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface DepreciationScheduleItem {
  period: number;
  depreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

export interface InvestmentAnalysisResult {
  npv: number;
  irr: number | null;
  mirr: number | null;
  paybackPeriod: number | null;
  profitabilityIndex: number;
}

export interface BondAnalysis {
  price: number;
  yieldToMaturity: number;
  accruedInterest: number;
}

export type PaymentType = 0 | 1; // 0 = end of period, 1 = beginning

export type DayCountBasis = 0 | 1 | 2 | 3 | 4;
// 0 = US (NASD) 30/360
// 1 = Actual/actual
// 2 = Actual/360
// 3 = Actual/365
// 4 = European 30/360

export class FinancialCalcError extends Error {
  constructor(
    public code: string,
    message?: string
  ) {
    super(message || `Financial calculation error: ${code}`);
    this.name = 'FinancialCalcError';
  }
}
