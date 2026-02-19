// src/lib/finance/index.ts
// Financial Module Exports

// Types
export * from "./types";

// Cost Rollup
export {
  rollupPartCost,
  saveRollupResults,
  getPartCostRollup,
  runFullCostRollup,
  markRollupStale,
  getRollupStatus,
} from "./cost-rollup";

// Variance Analysis
export {
  calculateMaterialPriceVariance,
  calculateMaterialUsageVariance,
  calculateLaborEfficiencyVariance,
  calculateAllVariances,
  saveVarianceResults,
  getVarianceSummary,
} from "./variance";

// Invoicing
export {
  createPurchaseInvoice,
  createSalesInvoice,
  recordPurchasePayment,
  recordSalesPayment,
  getAPAging,
  getARAging,
} from "./invoicing";

// Work Order Cost Accumulation
export {
  recordMaterialCost,
  recordLaborCost,
  getWOCostSummary,
  calculateVariance,
} from "./wo-cost-service";

// MISA Export
export {
  exportToMISA,
  exportPurchaseInvoicesToMISA,
  exportSalesInvoicesToMISA,
  generateMISACSV,
} from "./misa-export-service";

// General Ledger
export {
  createJournalEntry,
  postJournalEntry,
  voidJournalEntry,
  reverseJournalEntry,
  getAccountBalance,
  getTrialBalance,
  postPurchaseInvoiceToGL,
  postSalesInvoiceToGL,
} from "./gl-engine";

// Financial Functions (Integrated from SHEETS)
export {
  // Time Value of Money
  PMT,
  FV,
  PV,
  NPV,
  IRR,
  RATE,
  NPER,
  // Loan Analysis
  IPMT,
  PPMT,
  CUMIPMT,
  CUMPRINC,
  // Depreciation
  SLN,
  DB,
  DDB,
  SYD,
  // Interest Rate Conversions
  EFFECT,
  NOMINAL,
  // Irregular Cash Flows
  XNPV,
  XIRR,
  MIRR,
  // Bonds
  PRICE,
  ACCRINT,
  // T-Bills
  TBILLPRICE,
  TBILLYIELD,
  TBILLEQ,
  // Helper Functions
  generateAmortizationSchedule,
  generateDepreciationSchedule,
  analyzeInvestment,
} from "./financial-functions";
