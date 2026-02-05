/**
 * Financial Functions Library
 * Integrated from SHEETS module - Standalone version for MRP
 *
 * Contains 30+ Excel-compatible financial functions:
 * - Time Value of Money: PMT, FV, PV, NPV, IRR, RATE, NPER
 * - Loan Analysis: IPMT, PPMT, CUMIPMT, CUMPRINC
 * - Depreciation: SLN, DB, DDB, SYD
 * - Interest Rates: EFFECT, NOMINAL
 * - Irregular Cash Flows: XNPV, XIRR, MIRR
 * - Bonds: PRICE, YIELD, ACCRINT
 * - T-Bills: TBILLPRICE, TBILLYIELD, TBILLEQ
 */

import {
  PaymentType,
  DayCountBasis,
  FinancialCalcError,
  AmortizationScheduleItem,
  DepreciationScheduleItem,
  InvestmentAnalysisResult,
} from './types';

// ============================================================
// TIME VALUE OF MONEY
// ============================================================

/**
 * PMT - Calculate payment for a loan
 * @param rate Interest rate per period
 * @param nper Total number of periods
 * @param pv Present value (loan amount)
 * @param fv Future value (default 0)
 * @param type Payment type: 0=end, 1=beginning
 */
export function PMT(
  rate: number,
  nper: number,
  pv: number,
  fv: number = 0,
  type: PaymentType = 0
): number {
  if (nper === 0) {
    throw new FinancialCalcError('#NUM!', 'Number of periods cannot be zero');
  }

  if (rate === 0) {
    return -(pv + fv) / nper;
  }

  const pvif = Math.pow(1 + rate, nper);
  let pmt = (rate * (pv * pvif + fv)) / (pvif - 1);

  if (type === 1) {
    pmt = pmt / (1 + rate);
  }

  return -pmt;
}

/**
 * FV - Calculate future value
 */
export function FV(
  rate: number,
  nper: number,
  pmt: number,
  pv: number = 0,
  type: PaymentType = 0
): number {
  if (rate === 0) {
    return -(pv + pmt * nper);
  }

  const pvif = Math.pow(1 + rate, nper);
  return -pv * pvif - (pmt * (1 + rate * type) * (pvif - 1)) / rate;
}

/**
 * PV - Calculate present value
 */
export function PV(
  rate: number,
  nper: number,
  pmt: number,
  fv: number = 0,
  type: PaymentType = 0
): number {
  if (rate === 0) {
    return -(fv + pmt * nper);
  }

  const pvif = Math.pow(1 + rate, nper);
  return (-fv - (pmt * (1 + rate * type) * (pvif - 1)) / rate) / pvif;
}

/**
 * NPV - Net present value
 */
export function NPV(rate: number, ...cashFlows: number[]): number {
  if (cashFlows.length === 0) {
    throw new FinancialCalcError('#VALUE!', 'At least one cash flow required');
  }

  let npv = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    npv += cashFlows[i] / Math.pow(1 + rate, i + 1);
  }

  return npv;
}

/**
 * IRR - Internal rate of return (Newton-Raphson method)
 */
export function IRR(cashFlows: number[], guess: number = 0.1): number {
  if (cashFlows.length < 2) {
    throw new FinancialCalcError('#NUM!', 'IRR requires at least 2 cash flows');
  }

  let rate = guess;
  const maxIterations = 100;
  const tolerance = 1e-10;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;

    for (let j = 0; j < cashFlows.length; j++) {
      const pvif = Math.pow(1 + rate, j);
      npv += cashFlows[j] / pvif;
      if (j > 0) {
        dnpv -= (j * cashFlows[j]) / Math.pow(1 + rate, j + 1);
      }
    }

    if (Math.abs(dnpv) < tolerance) {
      throw new FinancialCalcError('#NUM!', 'IRR calculation did not converge');
    }

    const newRate = rate - npv / dnpv;

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }

    rate = newRate;
  }

  throw new FinancialCalcError('#NUM!', 'IRR calculation did not converge');
}

/**
 * RATE - Interest rate per period
 */
export function RATE(
  nper: number,
  pmt: number,
  pv: number,
  fv: number = 0,
  type: PaymentType = 0,
  guess: number = 0.1
): number {
  let rate = guess;
  const maxIterations = 100;
  const tolerance = 1e-10;

  for (let i = 0; i < maxIterations; i++) {
    const pvif = Math.pow(1 + rate, nper);
    const y = pv * pvif + (pmt * (1 + rate * type) * (pvif - 1)) / rate + fv;
    const dy =
      nper * pv * Math.pow(1 + rate, nper - 1) +
      (pmt * (1 + rate * type) * ((nper * Math.pow(1 + rate, nper - 1) * rate - pvif + 1) / (rate * rate))) +
      (pmt * type * (pvif - 1)) / rate;

    if (Math.abs(dy) < tolerance) {
      throw new FinancialCalcError('#NUM!', 'RATE calculation did not converge');
    }

    const newRate = rate - y / dy;

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }

    rate = newRate;
  }

  throw new FinancialCalcError('#NUM!', 'RATE calculation did not converge');
}

/**
 * NPER - Number of periods
 */
export function NPER(
  rate: number,
  pmt: number,
  pv: number,
  fv: number = 0,
  type: PaymentType = 0
): number {
  if (rate === 0) {
    if (pmt === 0) {
      throw new FinancialCalcError('#NUM!');
    }
    return -(pv + fv) / pmt;
  }

  const pmtAdj = pmt * (1 + rate * type);
  const num = pmtAdj - fv * rate;
  const den = pv * rate + pmtAdj;

  const ratio = num / den;
  if (ratio <= 0) {
    throw new FinancialCalcError('#NUM!');
  }

  return Math.log(ratio) / Math.log(1 + rate);
}

// ============================================================
// LOAN ANALYSIS
// ============================================================

/**
 * IPMT - Interest payment for a specific period
 */
export function IPMT(
  rate: number,
  per: number,
  nper: number,
  pv: number,
  fv: number = 0,
  type: PaymentType = 0
): number {
  if (per < 1 || per > nper) {
    throw new FinancialCalcError('#NUM!', 'Period must be between 1 and nper');
  }

  const pmt = PMT(rate, nper, pv, fv, type);
  let balance = pv;

  for (let i = 1; i < per; i++) {
    if (type === 0) {
      balance = balance * (1 + rate) + pmt;
    } else {
      balance = (balance + pmt) * (1 + rate);
    }
  }

  if (type === 1 && per === 1) {
    return 0;
  }

  return -balance * rate;
}

/**
 * PPMT - Principal payment for a specific period
 */
export function PPMT(
  rate: number,
  per: number,
  nper: number,
  pv: number,
  fv: number = 0,
  type: PaymentType = 0
): number {
  const pmt = PMT(rate, nper, pv, fv, type);
  const ipmt = IPMT(rate, per, nper, pv, fv, type);
  return pmt - ipmt;
}

/**
 * CUMIPMT - Cumulative interest paid
 */
export function CUMIPMT(
  rate: number,
  nper: number,
  pv: number,
  startPeriod: number,
  endPeriod: number,
  type: PaymentType
): number {
  if (rate <= 0 || nper <= 0 || pv <= 0 || startPeriod < 1 || endPeriod < startPeriod || endPeriod > nper) {
    throw new FinancialCalcError('#NUM!');
  }

  let cumInt = 0;
  for (let per = startPeriod; per <= endPeriod; per++) {
    cumInt += IPMT(rate, per, nper, pv, 0, type);
  }

  return cumInt;
}

/**
 * CUMPRINC - Cumulative principal paid
 */
export function CUMPRINC(
  rate: number,
  nper: number,
  pv: number,
  startPeriod: number,
  endPeriod: number,
  type: PaymentType
): number {
  if (rate <= 0 || nper <= 0 || pv <= 0 || startPeriod < 1 || endPeriod < startPeriod || endPeriod > nper) {
    throw new FinancialCalcError('#NUM!');
  }

  let cumPrinc = 0;
  for (let per = startPeriod; per <= endPeriod; per++) {
    cumPrinc += PPMT(rate, per, nper, pv, 0, type);
  }

  return cumPrinc;
}

// ============================================================
// DEPRECIATION
// ============================================================

/**
 * SLN - Straight-line depreciation
 */
export function SLN(cost: number, salvage: number, life: number): number {
  if (life === 0) {
    throw new FinancialCalcError('#DIV/0!');
  }
  return (cost - salvage) / life;
}

/**
 * DB - Declining balance depreciation
 */
export function DB(
  cost: number,
  salvage: number,
  life: number,
  period: number,
  month: number = 12
): number {
  if (life <= 0 || period <= 0 || period > life + 1) {
    throw new FinancialCalcError('#NUM!');
  }

  const rate = Math.round((1 - Math.pow(salvage / cost, 1 / life)) * 1000) / 1000;
  let bookValue = cost;
  let depreciation = 0;

  for (let i = 1; i <= period; i++) {
    if (i === 1) {
      depreciation = (cost * rate * month) / 12;
    } else if (i === life + 1) {
      depreciation = bookValue - salvage;
    } else {
      depreciation = bookValue * rate;
    }
    bookValue -= depreciation;
  }

  return depreciation;
}

/**
 * DDB - Double declining balance depreciation
 */
export function DDB(
  cost: number,
  salvage: number,
  life: number,
  period: number,
  factor: number = 2
): number {
  if (life <= 0 || period <= 0 || period > life) {
    throw new FinancialCalcError('#NUM!');
  }

  const rate = factor / life;
  let bookValue = cost;
  let depreciation = 0;

  for (let i = 1; i <= period; i++) {
    depreciation = Math.min(bookValue * rate, bookValue - salvage);
    depreciation = Math.max(depreciation, 0);
    bookValue -= depreciation;
  }

  return depreciation;
}

/**
 * SYD - Sum of years digits depreciation
 */
export function SYD(
  cost: number,
  salvage: number,
  life: number,
  period: number
): number {
  if (life <= 0 || period <= 0 || period > life) {
    throw new FinancialCalcError('#NUM!');
  }

  const sumOfYears = (life * (life + 1)) / 2;
  const depreciableBase = cost - salvage;
  const remainingLife = life - period + 1;

  return (depreciableBase * remainingLife) / sumOfYears;
}

// ============================================================
// INTEREST RATE CONVERSIONS
// ============================================================

/**
 * EFFECT - Effective annual interest rate
 */
export function EFFECT(nominalRate: number, npery: number): number {
  const periods = Math.floor(npery);
  if (nominalRate <= 0 || periods < 1) {
    throw new FinancialCalcError('#NUM!');
  }
  return Math.pow(1 + nominalRate / periods, periods) - 1;
}

/**
 * NOMINAL - Nominal annual interest rate
 */
export function NOMINAL(effectRate: number, npery: number): number {
  const periods = Math.floor(npery);
  if (effectRate <= 0 || periods < 1) {
    throw new FinancialCalcError('#NUM!');
  }
  return periods * (Math.pow(effectRate + 1, 1 / periods) - 1);
}

// ============================================================
// IRREGULAR CASH FLOWS
// ============================================================

/**
 * XNPV - NPV for irregular cash flows
 */
export function XNPV(rate: number, values: number[], dates: Date[]): number {
  if (values.length !== dates.length || values.length === 0) {
    throw new FinancialCalcError('#NUM!');
  }

  const firstDate = dates[0].getTime();
  let xnpv = 0;

  for (let i = 0; i < values.length; i++) {
    const years = (dates[i].getTime() - firstDate) / (365 * 24 * 60 * 60 * 1000);
    xnpv += values[i] / Math.pow(1 + rate, years);
  }

  return xnpv;
}

/**
 * XIRR - IRR for irregular cash flows
 */
export function XIRR(values: number[], dates: Date[], guess: number = 0.1): number {
  if (values.length !== dates.length || values.length < 2) {
    throw new FinancialCalcError('#NUM!');
  }

  let rate = guess;
  const maxIterations = 100;
  const tolerance = 1e-10;
  const firstDate = dates[0].getTime();

  for (let i = 0; i < maxIterations; i++) {
    let xnpv = 0;
    let dxnpv = 0;

    for (let j = 0; j < values.length; j++) {
      const years = (dates[j].getTime() - firstDate) / (365 * 24 * 60 * 60 * 1000);
      const factor = Math.pow(1 + rate, years);
      xnpv += values[j] / factor;
      if (years !== 0) {
        dxnpv -= (years * values[j]) / (factor * (1 + rate));
      }
    }

    if (Math.abs(dxnpv) < tolerance) {
      throw new FinancialCalcError('#NUM!');
    }

    const newRate = rate - xnpv / dxnpv;
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }
    rate = newRate;
  }

  throw new FinancialCalcError('#NUM!');
}

/**
 * MIRR - Modified internal rate of return
 */
export function MIRR(values: number[], financeRate: number, reinvestRate: number): number {
  if (values.length < 2) {
    throw new FinancialCalcError('#NUM!');
  }

  const n = values.length;
  let pvNeg = 0;
  let fvPos = 0;

  for (let i = 0; i < n; i++) {
    if (values[i] < 0) {
      pvNeg += values[i] / Math.pow(1 + financeRate, i);
    } else {
      fvPos += values[i] * Math.pow(1 + reinvestRate, n - 1 - i);
    }
  }

  if (pvNeg >= 0 || fvPos <= 0) {
    throw new FinancialCalcError('#NUM!');
  }

  return Math.pow(-fvPos / pvNeg, 1 / (n - 1)) - 1;
}

// ============================================================
// BONDS
// ============================================================

/**
 * PRICE - Bond price
 */
export function PRICE(
  settlement: Date,
  maturity: Date,
  rate: number,
  yld: number,
  redemption: number,
  frequency: 1 | 2 | 4,
  basis: DayCountBasis = 0
): number {
  if (rate < 0 || yld < 0) {
    throw new FinancialCalcError('#NUM!');
  }

  const days = (maturity.getTime() - settlement.getTime()) / (24 * 60 * 60 * 1000);
  const periods = Math.ceil(days / (365 / frequency));
  const coupon = (rate * redemption) / frequency;
  let price = 0;

  for (let i = 1; i <= periods; i++) {
    price += coupon / Math.pow(1 + yld / frequency, i);
  }
  price += redemption / Math.pow(1 + yld / frequency, periods);

  return price;
}

/**
 * ACCRINT - Accrued interest
 */
export function ACCRINT(
  issue: Date,
  firstInterest: Date,
  settlement: Date,
  rate: number,
  par: number,
  frequency: 1 | 2 | 4,
  basis: DayCountBasis = 0
): number {
  const days = (settlement.getTime() - issue.getTime()) / (24 * 60 * 60 * 1000);

  if (rate < 0 || days < 0) {
    throw new FinancialCalcError('#NUM!');
  }

  return rate * par * (days / 365);
}

// ============================================================
// T-BILLS
// ============================================================

/**
 * TBILLPRICE - T-bill price
 */
export function TBILLPRICE(settlement: Date, maturity: Date, discount: number): number {
  const days = (maturity.getTime() - settlement.getTime()) / (24 * 60 * 60 * 1000);

  if (days <= 0 || days > 365 || discount < 0) {
    throw new FinancialCalcError('#NUM!');
  }

  return 100 * (1 - (discount * days) / 360);
}

/**
 * TBILLYIELD - T-bill yield
 */
export function TBILLYIELD(settlement: Date, maturity: Date, price: number): number {
  const days = (maturity.getTime() - settlement.getTime()) / (24 * 60 * 60 * 1000);

  if (days <= 0 || days > 365 || price <= 0) {
    throw new FinancialCalcError('#NUM!');
  }

  return ((100 - price) / price) * (360 / days);
}

/**
 * TBILLEQ - T-bill bond equivalent yield
 */
export function TBILLEQ(settlement: Date, maturity: Date, discount: number): number {
  const days = (maturity.getTime() - settlement.getTime()) / (24 * 60 * 60 * 1000);

  if (days <= 0 || days > 365 || discount < 0) {
    throw new FinancialCalcError('#NUM!');
  }

  return (365 * discount) / (360 - discount * days);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Generate full amortization schedule
 */
export function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  years: number,
  paymentsPerYear: number = 12
): AmortizationScheduleItem[] {
  const rate = annualRate / paymentsPerYear;
  const nper = years * paymentsPerYear;
  const payment = -PMT(rate, nper, principal);

  const schedule: AmortizationScheduleItem[] = [];
  let balance = principal;

  for (let period = 1; period <= nper; period++) {
    const interest = balance * rate;
    const principalPayment = payment - interest;
    balance -= principalPayment;

    schedule.push({
      period,
      payment,
      principal: principalPayment,
      interest,
      balance: Math.max(0, balance),
    });
  }

  return schedule;
}

/**
 * Generate depreciation schedule
 */
export function generateDepreciationSchedule(
  cost: number,
  salvage: number,
  life: number,
  method: 'SLN' | 'DB' | 'DDB' | 'SYD' = 'SLN'
): DepreciationScheduleItem[] {
  const schedule: DepreciationScheduleItem[] = [];
  let accumulatedDep = 0;

  for (let period = 1; period <= life; period++) {
    let depreciation: number;

    switch (method) {
      case 'SLN':
        depreciation = SLN(cost, salvage, life);
        break;
      case 'DB':
        depreciation = DB(cost, salvage, life, period);
        break;
      case 'DDB':
        depreciation = DDB(cost, salvage, life, period);
        break;
      case 'SYD':
        depreciation = SYD(cost, salvage, life, period);
        break;
    }

    accumulatedDep += depreciation;

    schedule.push({
      period,
      depreciation,
      accumulatedDepreciation: accumulatedDep,
      bookValue: cost - accumulatedDep,
    });
  }

  return schedule;
}

/**
 * Analyze investment cash flows
 */
export function analyzeInvestment(
  cashFlows: number[],
  discountRate: number,
  financeRate?: number,
  reinvestRate?: number
): InvestmentAnalysisResult {
  const npv = NPV(discountRate, ...cashFlows.slice(1)) + cashFlows[0];

  let irr: number | null = null;
  try {
    irr = IRR(cashFlows);
  } catch {
    irr = null;
  }

  let mirr: number | null = null;
  if (financeRate !== undefined && reinvestRate !== undefined) {
    try {
      mirr = MIRR(cashFlows, financeRate, reinvestRate);
    } catch {
      mirr = null;
    }
  }

  // Calculate payback period
  let paybackPeriod: number | null = null;
  let cumulative = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    cumulative += cashFlows[i];
    if (cumulative >= 0 && paybackPeriod === null) {
      if (i === 0) {
        paybackPeriod = 0;
      } else {
        const prevCumulative = cumulative - cashFlows[i];
        paybackPeriod = i - 1 + Math.abs(prevCumulative) / cashFlows[i];
      }
    }
  }

  // Profitability index
  const pvInflows = cashFlows.slice(1).reduce((sum, cf, i) => {
    return cf > 0 ? sum + cf / Math.pow(1 + discountRate, i + 1) : sum;
  }, 0);
  const initialInvestment = Math.abs(cashFlows[0]);
  const profitabilityIndex = initialInvestment > 0 ? pvInflows / initialInvestment : 0;

  return {
    npv,
    irr,
    mirr,
    paybackPeriod,
    profitabilityIndex,
  };
}
