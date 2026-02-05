import {
  CostingBreakdown,
  CostingSummary,
  CostCurrency,
  IMPORT_TAX_RATES,
  DEFAULT_COSTING_PARAMS,
} from '../types';

interface CalculateCostingInput {
  skuId: string;
  partId?: string;
  unitCost: number;
  unitCostCurrency?: CostCurrency;
  category?: string;
  freightInsurancePct?: number;
  othersTaxPct?: number;
  importTaxPct?: number;
  exchangeRate?: number;
  srp: number;
  wholesalePrice?: number;
  rrp?: number;
}

/**
 * Calculate full costing breakdown for a SKU/Part
 * Formula: Unit Cost + Freight + Others Tax + Import Tax = Landed Cost
 * Margin = (SRP - LandedVND) / SRP
 */
export function calculateCosting(input: CalculateCostingInput): CostingBreakdown {
  const {
    skuId,
    partId,
    unitCost,
    unitCostCurrency = 'USD',
    category = 'DEFAULT',
    freightInsurancePct = DEFAULT_COSTING_PARAMS.freightInsurancePct,
    othersTaxPct = DEFAULT_COSTING_PARAMS.othersTaxPct,
    exchangeRate = DEFAULT_COSTING_PARAMS.exchangeRate,
    srp,
    wholesalePrice,
    rrp,
  } = input;

  // Get import tax rate based on category
  const importTaxPct =
    input.importTaxPct ?? IMPORT_TAX_RATES[category.toUpperCase()] ?? IMPORT_TAX_RATES.DEFAULT;

  // Calculate individual cost components
  const freightInsuranceValue = unitCost * freightInsurancePct;
  const othersTaxValue = unitCost * othersTaxPct;

  // Import tax is calculated on (unitCost + freight + othersTax)
  const taxableBase = unitCost + freightInsuranceValue + othersTaxValue;
  const importTaxValue = taxableBase * importTaxPct;

  // Landed cost in foreign currency
  const landedCost = unitCost + freightInsuranceValue + othersTaxValue + importTaxValue;

  // Landed cost in VND
  const landedCostVND = landedCost * exchangeRate;

  // Gross margin
  const grossMargin = srp > 0 ? (srp - landedCostVND) / srp : 0;

  return {
    id: `costing-${skuId}`,
    skuId,
    partId,
    unitCost,
    unitCostCurrency,
    freightInsurancePct,
    othersTaxPct,
    importTaxPct,
    freightInsuranceValue,
    othersTaxValue,
    importTaxValue,
    landedCost,
    landedCostVND,
    exchangeRate,
    srp,
    wholesalePrice,
    rrp,
    grossMargin,
  };
}

/**
 * Calculate summary statistics for multiple costings
 */
export function calculateCostingSummary(costings: CostingBreakdown[]): CostingSummary {
  const count = costings.length;
  if (count === 0) {
    return {
      totalSKUs: 0,
      avgUnitCost: 0,
      avgLandedCost: 0,
      avgMargin: 0,
      totalLandedValue: 0,
      totalRetailValue: 0,
    };
  }

  const totalUnitCost = costings.reduce((sum, c) => sum + c.unitCost, 0);
  const totalLandedCost = costings.reduce((sum, c) => sum + c.landedCost, 0);
  const totalMargin = costings.reduce((sum, c) => sum + c.grossMargin, 0);
  const totalLandedValue = costings.reduce((sum, c) => sum + c.landedCostVND, 0);
  const totalRetailValue = costings.reduce((sum, c) => sum + c.srp, 0);

  return {
    totalSKUs: count,
    avgUnitCost: totalUnitCost / count,
    avgLandedCost: totalLandedCost / count,
    avgMargin: totalMargin / count,
    totalLandedValue,
    totalRetailValue,
  };
}

/**
 * Recalculate margin with updated SRP
 */
export function recalculateMargin(landedCostVND: number, newSRP: number): number {
  return newSRP > 0 ? (newSRP - landedCostVND) / newSRP : 0;
}

/**
 * Calculate required SRP for target margin
 */
export function calculateTargetSRP(landedCostVND: number, targetMargin: number): number {
  return landedCostVND / (1 - targetMargin);
}

/**
 * Calculate break-even price (0% margin)
 */
export function calculateBreakEvenPrice(landedCostVND: number): number {
  return landedCostVND;
}

/**
 * Format currency for display
 */
export function formatCostingCurrency(value: number, currency: string = 'VND'): string {
  if (currency === 'VND') {
    if (value >= 1000000000) {
      return `₫${(value / 1000000000).toFixed(2)}B`;
    }
    if (value >= 1000000) {
      return `₫${(value / 1000000).toFixed(2)}M`;
    }
    return `₫${value.toLocaleString()}`;
  }
  return `${currency} ${value.toFixed(2)}`;
}
