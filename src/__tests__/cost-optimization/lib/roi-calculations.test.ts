import { describe, it, expect } from "vitest";
import {
  calculateROI,
  generateBreakEvenChartData,
} from "@/lib/cost-optimization/roi-calculations";

describe("calculateROI", () => {
  it("calculates basic ROI correctly", () => {
    const result = calculateROI({
      buyPrice: 280,
      makeCost: 85,
      investment: 45000,
      annualVolume: 500,
    });

    expect(result.savingsPerUnit).toBe(195);
    expect(result.savingsPercent).toBeCloseTo(69.64, 1);
    expect(result.annualSavings).toBe(97500);
  });

  it("calculates break-even correctly", () => {
    const result = calculateROI({
      buyPrice: 280,
      makeCost: 85,
      investment: 45000,
      annualVolume: 500,
    });

    // breakEvenUnits = ceil(45000 / 195) = 231
    expect(result.breakEvenUnits).toBe(231);
    // monthlyVolume = 500/12 ≈ 41.67, breakEvenMonths = ceil(231 / 41.67) = 6
    expect(result.breakEvenMonths).toBe(6);
  });

  it("handles zero investment", () => {
    const result = calculateROI({
      buyPrice: 38,
      makeCost: 31,
      investment: 0,
      annualVolume: 500,
    });

    expect(result.savingsPerUnit).toBe(7);
    expect(result.breakEvenUnits).toBe(0);
    expect(result.breakEvenMonths).toBe(0);
    expect(result.paybackMonths).toBe(0);
  });

  it("handles negative savings (make more expensive)", () => {
    const result = calculateROI({
      buyPrice: 80,
      makeCost: 120,
      investment: 80000,
      annualVolume: 500,
    });

    expect(result.savingsPerUnit).toBe(-40);
    expect(result.annualSavings).toBe(-20000);
    expect(result.breakEvenUnits).toBe(0); // negative savings = 0 break even
    expect(result.paybackMonths).toBe(999); // never pays back
  });

  it("calculates NPV with custom discount rate", () => {
    const result = calculateROI({
      buyPrice: 25,
      makeCost: 10,
      investment: 15000,
      annualVolume: 2000,
      discountRate: 0.12,
    });

    expect(result.annualSavings).toBe(30000);
    // NPV1 = -15000 + 30000/(1.12) ≈ 11786
    expect(result.npv1Year).toBeGreaterThan(11000);
    expect(result.npv3Year).toBeGreaterThan(result.npv1Year);
    expect(result.npv5Year).toBeGreaterThan(result.npv3Year);
  });

  it("uses default 10% discount rate when not specified", () => {
    const withDefault = calculateROI({
      buyPrice: 100,
      makeCost: 50,
      investment: 10000,
      annualVolume: 200,
    });

    const withExplicit = calculateROI({
      buyPrice: 100,
      makeCost: 50,
      investment: 10000,
      annualVolume: 200,
      discountRate: 0.10,
    });

    expect(withDefault.npv3Year).toBe(withExplicit.npv3Year);
  });
});

describe("generateBreakEvenChartData", () => {
  it("generates correct number of data points", () => {
    const data = generateBreakEvenChartData(
      { buyPrice: 280, makeCost: 85, investment: 45000, annualVolume: 500 },
      24
    );

    // month 0 to month 24 = 25 points
    expect(data).toHaveLength(25);
  });

  it("starts with negative investment", () => {
    const data = generateBreakEvenChartData({
      buyPrice: 100,
      makeCost: 50,
      investment: 10000,
      annualVolume: 200,
    });

    expect(data[0].month).toBe(0);
    expect(data[0].cumulativeSavings).toBe(-10000);
    expect(data[0].units).toBe(0);
  });

  it("crosses zero at break-even point", () => {
    const data = generateBreakEvenChartData({
      buyPrice: 100,
      makeCost: 50,
      investment: 5000,
      annualVolume: 1200,
    });

    // Monthly savings = 50 * (1200/12) = 5000
    // Break-even at month 1: -5000 + 5000 = 0
    const breakEvenMonth = data.find((d) => d.cumulativeSavings >= 0);
    expect(breakEvenMonth).toBeDefined();
    expect(breakEvenMonth!.month).toBe(1);
  });

  it("accumulates units correctly", () => {
    const data = generateBreakEvenChartData({
      buyPrice: 100,
      makeCost: 50,
      investment: 10000,
      annualVolume: 120,
    });

    // monthlyVolume = 10
    expect(data[0].units).toBe(0);
    expect(data[1].units).toBe(10);
    expect(data[12].units).toBe(120);
  });
});
