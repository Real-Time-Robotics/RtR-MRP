import { describe, it, expect } from 'vitest';
import {
  PMT, FV, PV, NPV, IRR, RATE, NPER,
  IPMT, PPMT, CUMIPMT, CUMPRINC,
  SLN, DB, DDB, SYD,
  EFFECT, NOMINAL,
  MIRR,
  generateAmortizationSchedule,
  generateDepreciationSchedule,
  analyzeInvestment,
} from '../financial-functions';
import { FinancialCalcError } from '../types';

describe('Time Value of Money', () => {
  describe('PMT', () => {
    it('should calculate monthly payment for a standard loan', () => {
      // $200,000 loan, 6% annual rate, 30 years
      const payment = PMT(0.06 / 12, 360, 200000);
      expect(payment).toBeCloseTo(-1199.10, 1);
    });

    it('should handle zero rate', () => {
      const payment = PMT(0, 12, 1200);
      expect(payment).toBe(-100);
    });

    it('should handle beginning-of-period payments', () => {
      const payment = PMT(0.06 / 12, 360, 200000, 0, 1);
      expect(payment).toBeDefined();
      expect(typeof payment).toBe('number');
    });

    it('should throw on zero periods', () => {
      expect(() => PMT(0.05, 0, 1000)).toThrow(FinancialCalcError);
    });

    it('should handle future value', () => {
      const payment = PMT(0.05 / 12, 120, 0, 10000);
      expect(payment).toBeDefined();
      expect(payment).toBeLessThan(0);
    });
  });

  describe('FV', () => {
    it('should calculate future value of savings', () => {
      // $100/month, 5% annual, 10 years
      const fv = FV(0.05 / 12, 120, -100);
      expect(fv).toBeGreaterThan(15000);
    });

    it('should handle zero rate', () => {
      const fv = FV(0, 12, -100, 0);
      expect(fv).toBe(1200);
    });

    it('should handle present value', () => {
      const fv = FV(0.05 / 12, 120, 0, -10000);
      expect(fv).toBeGreaterThan(10000);
    });
  });

  describe('PV', () => {
    it('should calculate present value', () => {
      const pv = PV(0.08 / 12, 240, -1000);
      expect(pv).toBeGreaterThan(0);
    });

    it('should handle zero rate', () => {
      const pv = PV(0, 12, -100);
      expect(pv).toBe(1200);
    });
  });

  describe('NPV', () => {
    it('should calculate net present value', () => {
      const npv = NPV(0.1, -10000, 3000, 4200, 6800);
      expect(npv).toBeGreaterThan(0);
    });

    it('should throw on empty cash flows', () => {
      expect(() => NPV(0.1)).toThrow(FinancialCalcError);
    });

    it('should handle negative NPV', () => {
      const npv = NPV(0.1, -10000, 1000, 1000, 1000);
      expect(npv).toBeLessThan(0);
    });
  });

  describe('IRR', () => {
    it('should calculate internal rate of return', () => {
      const irr = IRR([-10000, 3000, 4200, 6800]);
      expect(irr).toBeGreaterThan(0);
      expect(irr).toBeLessThan(1);
    });

    it('should throw on less than 2 cash flows', () => {
      expect(() => IRR([-10000])).toThrow(FinancialCalcError);
    });
  });

  describe('RATE', () => {
    it('should calculate interest rate', () => {
      // Find rate for: 120 payments of $100 on $10000 loan
      const rate = RATE(120, -100, 10000);
      expect(rate).toBeGreaterThan(0);
    });
  });

  describe('NPER', () => {
    it('should calculate number of periods', () => {
      const nper = NPER(0.05 / 12, -200, 10000);
      expect(nper).toBeGreaterThan(0);
    });

    it('should handle zero rate', () => {
      const nper = NPER(0, -100, 1200);
      expect(nper).toBe(12);
    });

    it('should throw when payment is 0 with zero rate', () => {
      expect(() => NPER(0, 0, 1000)).toThrow(FinancialCalcError);
    });
  });
});

describe('Loan Analysis', () => {
  describe('IPMT', () => {
    it('should calculate interest for first period', () => {
      const ipmt = IPMT(0.06 / 12, 1, 360, 200000);
      expect(ipmt).toBeCloseTo(-1000, 0);
    });

    it('should decrease interest over time', () => {
      const early = IPMT(0.06 / 12, 1, 360, 200000);
      const late = IPMT(0.06 / 12, 300, 360, 200000);
      expect(Math.abs(early)).toBeGreaterThan(Math.abs(late));
    });

    it('should throw on invalid period', () => {
      expect(() => IPMT(0.05, 0, 12, 1000)).toThrow(FinancialCalcError);
      expect(() => IPMT(0.05, 13, 12, 1000)).toThrow(FinancialCalcError);
    });
  });

  describe('PPMT', () => {
    it('should calculate principal for a period', () => {
      const ppmt = PPMT(0.06 / 12, 1, 360, 200000);
      expect(ppmt).toBeDefined();
    });

    it('should increase principal over time', () => {
      const early = PPMT(0.06 / 12, 1, 360, 200000);
      const late = PPMT(0.06 / 12, 300, 360, 200000);
      expect(Math.abs(late)).toBeGreaterThan(Math.abs(early));
    });
  });

  describe('CUMIPMT', () => {
    it('should calculate cumulative interest', () => {
      const cumInt = CUMIPMT(0.06 / 12, 360, 200000, 1, 12, 0);
      expect(cumInt).toBeLessThan(0);
    });

    it('should throw on invalid params', () => {
      expect(() => CUMIPMT(0, 12, 1000, 1, 12, 0)).toThrow(FinancialCalcError);
      expect(() => CUMIPMT(0.05, 12, 1000, 0, 12, 0)).toThrow(FinancialCalcError);
    });
  });

  describe('CUMPRINC', () => {
    it('should calculate cumulative principal', () => {
      const cumPrinc = CUMPRINC(0.06 / 12, 360, 200000, 1, 12, 0);
      expect(cumPrinc).toBeLessThan(0);
    });
  });
});

describe('Depreciation', () => {
  describe('SLN', () => {
    it('should calculate straight-line depreciation', () => {
      expect(SLN(10000, 2000, 5)).toBe(1600);
    });

    it('should throw on zero life', () => {
      expect(() => SLN(10000, 2000, 0)).toThrow(FinancialCalcError);
    });
  });

  describe('DDB', () => {
    it('should calculate double declining balance', () => {
      const dep = DDB(10000, 1000, 5, 1);
      expect(dep).toBeGreaterThan(0);
    });

    it('should decrease over time', () => {
      const year1 = DDB(10000, 1000, 5, 1);
      const year2 = DDB(10000, 1000, 5, 2);
      expect(year1).toBeGreaterThan(year2);
    });

    it('should throw on invalid period', () => {
      expect(() => DDB(10000, 1000, 5, 0)).toThrow(FinancialCalcError);
      expect(() => DDB(10000, 1000, 5, 6)).toThrow(FinancialCalcError);
    });
  });

  describe('SYD', () => {
    it('should calculate sum-of-years depreciation', () => {
      const dep = SYD(10000, 2000, 5, 1);
      expect(dep).toBeGreaterThan(0);
    });
  });

  describe('DB', () => {
    it('should calculate declining balance depreciation', () => {
      const dep = DB(10000, 1000, 5, 1);
      expect(dep).toBeGreaterThan(0);
    });

    it('should throw on invalid params', () => {
      expect(() => DB(10000, 1000, 0, 1)).toThrow(FinancialCalcError);
    });
  });
});

describe('Interest Rate Conversion', () => {
  describe('EFFECT', () => {
    it('should convert nominal to effective rate', () => {
      const effective = EFFECT(0.10, 4);
      expect(effective).toBeGreaterThan(0.10);
    });
  });

  describe('NOMINAL', () => {
    it('should convert effective to nominal rate', () => {
      const nominal = NOMINAL(0.1038, 4);
      expect(nominal).toBeCloseTo(0.10, 1);
    });
  });
});

describe('MIRR', () => {
  it('should calculate modified IRR', () => {
    const mirr = MIRR([-10000, 3000, 4200, 6800], 0.1, 0.12);
    expect(mirr).toBeGreaterThan(0);
  });
});

describe('Helper Functions', () => {
  describe('generateAmortizationSchedule', () => {
    it('should generate schedule for a loan', () => {
      const schedule = generateAmortizationSchedule(10000, 0.06, 5);
      expect(schedule.length).toBeGreaterThan(0);
      expect(schedule[0].period).toBe(1);
      expect(schedule[0].payment).toBeDefined();
      expect(schedule[0].principal).toBeDefined();
      expect(schedule[0].interest).toBeDefined();
      expect(schedule[0].balance).toBeDefined();
    });

    it('should have decreasing balance', () => {
      const schedule = generateAmortizationSchedule(10000, 0.06, 5);
      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i].balance).toBeLessThanOrEqual(schedule[i - 1].balance);
      }
    });
  });

  describe('generateDepreciationSchedule', () => {
    it('should generate SLN schedule', () => {
      const schedule = generateDepreciationSchedule(10000, 2000, 5, 'SLN');
      expect(schedule).toHaveLength(5);
      expect(schedule[0].depreciation).toBe(1600);
    });

    it('should generate DDB schedule', () => {
      const schedule = generateDepreciationSchedule(10000, 2000, 5, 'DDB');
      expect(schedule).toHaveLength(5);
      expect(schedule[0].depreciation).toBeGreaterThan(schedule[1].depreciation);
    });
  });

  describe('analyzeInvestment', () => {
    it('should analyze cash flows', () => {
      const result = analyzeInvestment([-10000, 3000, 4200, 6800], 0.1);
      expect(result.npv).toBeDefined();
      expect(result.irr).toBeDefined();
      expect(result.profitabilityIndex).toBeDefined();
    });

    it('should handle negative NPV investment', () => {
      const result = analyzeInvestment([-10000, 1000, 1000], 0.1);
      expect(result.npv).toBeLessThan(0);
    });
  });
});
