export interface ROIInput {
  buyPrice: number;
  makeCost: number;
  investment: number;
  annualVolume: number;
  discountRate?: number;
}

export interface ROIResult {
  savingsPerUnit: number;
  savingsPercent: number;
  annualSavings: number;
  breakEvenUnits: number;
  breakEvenMonths: number;
  npv1Year: number;
  npv3Year: number;
  npv5Year: number;
  paybackMonths: number;
}

export function calculateROI(input: ROIInput): ROIResult {
  const { buyPrice, makeCost, investment, annualVolume, discountRate = 0.10 } = input;

  const savingsPerUnit = buyPrice - makeCost;
  const savingsPercent = buyPrice > 0 ? (savingsPerUnit / buyPrice) * 100 : 0;
  const annualSavings = savingsPerUnit * annualVolume;

  const breakEvenUnits = savingsPerUnit > 0 ? Math.ceil(investment / savingsPerUnit) : 0;
  const monthlyVolume = annualVolume / 12;
  const breakEvenMonths = monthlyVolume > 0 ? Math.ceil(breakEvenUnits / monthlyVolume) : 0;

  const npv1Year = calculateNPV(annualSavings, investment, discountRate, 1);
  const npv3Year = calculateNPV(annualSavings, investment, discountRate, 3);
  const npv5Year = calculateNPV(annualSavings, investment, discountRate, 5);

  const paybackMonths = annualSavings > 0
    ? Math.ceil((investment / annualSavings) * 12)
    : 999;

  return {
    savingsPerUnit: round2(savingsPerUnit),
    savingsPercent: round2(savingsPercent),
    annualSavings: round2(annualSavings),
    breakEvenUnits,
    breakEvenMonths,
    npv1Year: round2(npv1Year),
    npv3Year: round2(npv3Year),
    npv5Year: round2(npv5Year),
    paybackMonths,
  };
}

function calculateNPV(
  annualCashFlow: number,
  initialInvestment: number,
  rate: number,
  years: number
): number {
  let npv = -initialInvestment;
  for (let year = 1; year <= years; year++) {
    npv += annualCashFlow / Math.pow(1 + rate, year);
  }
  return npv;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface BreakEvenPoint {
  month: number;
  cumulativeSavings: number;
  breakEvenLine: number;
  units: number;
}

export function generateBreakEvenChartData(
  input: ROIInput,
  months: number = 24
): BreakEvenPoint[] {
  const { buyPrice, makeCost, investment, annualVolume } = input;
  const monthlyVolume = annualVolume / 12;
  const savingsPerUnit = buyPrice - makeCost;

  const data: BreakEvenPoint[] = [];
  let cumulativeSavings = -investment;
  let cumulativeUnits = 0;

  for (let month = 0; month <= months; month++) {
    if (month > 0) {
      cumulativeUnits += monthlyVolume;
      cumulativeSavings += savingsPerUnit * monthlyVolume;
    }

    data.push({
      month,
      cumulativeSavings: Math.round(cumulativeSavings),
      breakEvenLine: 0,
      units: Math.round(cumulativeUnits),
    });
  }

  return data;
}
