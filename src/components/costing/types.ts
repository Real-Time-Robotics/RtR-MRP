/**
 * Costing Types
 * Integrated from OTB module
 *
 * For full cost breakdown calculation
 * Maps to Excel: Unit cost → Freight → Tax → Import → Landed → SRP
 */

export type CostCurrency = 'USD' | 'GBP' | 'EUR' | 'SGD' | 'VND';

export interface CostingBreakdown {
  id: string;
  skuId: string;
  partId?: string;

  // Base cost
  unitCost: number;
  unitCostCurrency: CostCurrency;

  // Additional cost percentages
  freightInsurancePct: number;    // Default 3%
  othersTaxPct: number;           // Default 2%
  importTaxPct: number;           // Varies: 11%, 15%, etc.

  // Calculated values
  freightInsuranceValue: number;
  othersTaxValue: number;
  importTaxValue: number;

  // Landed cost
  landedCost: number;             // Foreign currency total
  landedCostVND: number;          // VND equivalent

  // Exchange rate
  exchangeRate: number;           // e.g., 24000 VND/USD

  // Retail
  srp: number;                    // Suggested Retail Price (VND)
  wholesalePrice?: number;        // Wholesale price
  rrp?: number;                   // Recommended Retail Price

  // Margin
  grossMargin: number;            // (SRP - LandedVND) / SRP
}

export interface CostingSummary {
  totalSKUs: number;
  avgUnitCost: number;
  avgLandedCost: number;
  avgMargin: number;
  totalLandedValue: number;
  totalRetailValue: number;
}

// Import tax rates by product category (Vietnam)
export const IMPORT_TAX_RATES: Record<string, number> = {
  'ACCESSORIES': 0.11,
  'SCARVES': 0.15,
  'WOMENS': 0.12,
  'MENS': 0.12,
  'SHOES': 0.20,
  'BAGS': 0.15,
  'JEWELLERY': 0.11,
  'LEATHER_GOODS': 0.15,
  'RTW': 0.12,
  'ELECTRONICS': 0.10,
  'RAW_MATERIALS': 0.05,
  'COMPONENTS': 0.08,
  'PACKAGING': 0.05,
  'DEFAULT': 0.11,
};

// Default costing parameters
export const DEFAULT_COSTING_PARAMS = {
  freightInsurancePct: 0.03,      // 3%
  othersTaxPct: 0.02,             // 2%
  exchangeRate: 25000,            // VND/USD (updated rate)
};

export const MARGIN_THRESHOLDS = {
  excellent: 0.60,  // 60%+
  good: 0.50,       // 50-60%
  acceptable: 0.40, // 40-50%
  low: 0.30,        // 30-40%
  critical: 0,      // <30%
};

export type MarginStatus = 'excellent' | 'good' | 'acceptable' | 'low' | 'critical';

export const getMarginStatus = (margin: number): {
  status: MarginStatus;
  color: string;
  bgColor: string;
} => {
  if (margin >= MARGIN_THRESHOLDS.excellent) {
    return { status: 'excellent', color: 'text-emerald-700', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' };
  }
  if (margin >= MARGIN_THRESHOLDS.good) {
    return { status: 'good', color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/30' };
  }
  if (margin >= MARGIN_THRESHOLDS.acceptable) {
    return { status: 'acceptable', color: 'text-amber-700', bgColor: 'bg-amber-100 dark:bg-amber-900/30' };
  }
  if (margin >= MARGIN_THRESHOLDS.low) {
    return { status: 'low', color: 'text-orange-700', bgColor: 'bg-orange-100 dark:bg-orange-900/30' };
  }
  return { status: 'critical', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900/30' };
};
