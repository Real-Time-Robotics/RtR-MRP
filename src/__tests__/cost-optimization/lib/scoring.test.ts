import { describe, it, expect } from "vitest";
import { calculateScore, type ScoringInput } from "@/lib/cost-optimization/scoring";

const makeHighScoreInput = (): ScoringInput => ({
  savingsPercent: 70,
  investmentRequired: 5000,
  breakEvenMonths: 4,
  volumeCertainty: 9,
  technicalSkillAvailable: 9,
  equipmentAvailable: 9,
  qualityCapability: 9,
  capacityAvailable: 9,
  supplyChainRiskReduction: 9,
  complianceBenefit: 9,
  leadTimeReduction: 9,
  ipProtection: 9,
});

const makeLowScoreInput = (): ScoringInput => ({
  savingsPercent: 5,
  investmentRequired: 200000,
  breakEvenMonths: 36,
  volumeCertainty: 2,
  technicalSkillAvailable: 2,
  equipmentAvailable: 1,
  qualityCapability: 2,
  capacityAvailable: 2,
  supplyChainRiskReduction: 1,
  complianceBenefit: 1,
  leadTimeReduction: 1,
  ipProtection: 1,
});

describe("calculateScore", () => {
  it("returns STRONG_MAKE for high scores (>= 7.5)", () => {
    const result = calculateScore(makeHighScoreInput());

    expect(result.overallScore).toBeGreaterThanOrEqual(7.5);
    expect(result.recommendation).toBe("STRONG_MAKE");
  });

  it("returns STRONG_BUY for low scores (< 3)", () => {
    const result = calculateScore(makeLowScoreInput());

    expect(result.overallScore).toBeLessThan(3);
    expect(result.recommendation).toBe("STRONG_BUY");
  });

  it("returns CONSIDER_MAKE for medium-high scores (6.0-7.5)", () => {
    const input: ScoringInput = {
      ...makeHighScoreInput(),
      savingsPercent: 40,
      investmentRequired: 30000,
      breakEvenMonths: 10,
      volumeCertainty: 7,
      technicalSkillAvailable: 6,
      equipmentAvailable: 5,
      qualityCapability: 7,
      capacityAvailable: 6,
      supplyChainRiskReduction: 7,
      complianceBenefit: 7,
      leadTimeReduction: 6,
      ipProtection: 6,
    };
    const result = calculateScore(input);

    expect(result.overallScore).toBeGreaterThanOrEqual(6.0);
    expect(result.overallScore).toBeLessThan(7.5);
    expect(result.recommendation).toBe("CONSIDER_MAKE");
  });

  it("applies correct weights (40% financial, 30% capability, 30% strategic)", () => {
    const input: ScoringInput = {
      savingsPercent: 100,
      investmentRequired: 1000,
      breakEvenMonths: 1,
      volumeCertainty: 10,
      technicalSkillAvailable: 0,
      equipmentAvailable: 0,
      qualityCapability: 0,
      capacityAvailable: 0,
      supplyChainRiskReduction: 0,
      complianceBenefit: 0,
      leadTimeReduction: 0,
      ipProtection: 0,
    };

    const result = calculateScore(input);

    // Financial should be high, capability and strategic should be ~0
    expect(result.financialScore).toBeGreaterThan(8);
    expect(result.capabilityScore).toBe(0);
    expect(result.strategicScore).toBe(0);
    // Overall ≈ high_financial * 0.4 + 0 + 0
    expect(result.overallScore).toBeCloseTo(result.financialScore * 0.4, 0);
  });

  it("generates conditions for edge cases", () => {
    const input: ScoringInput = {
      savingsPercent: 30,
      investmentRequired: 20000,
      breakEvenMonths: 14,
      volumeCertainty: 6,
      technicalSkillAvailable: 4,
      equipmentAvailable: 4,
      qualityCapability: 5,
      capacityAvailable: 5,
      supplyChainRiskReduction: 6,
      complianceBenefit: 6,
      leadTimeReduction: 5,
      ipProtection: 5,
    };

    const result = calculateScore(input);

    // Should have conditions since capability is low and break-even is >12
    expect(result.conditions.length).toBeGreaterThan(0);
    expect(result.rationale).toBeTruthy();
  });

  it("returns all score components between 0 and 10", () => {
    const result = calculateScore(makeHighScoreInput());

    expect(result.financialScore).toBeGreaterThanOrEqual(0);
    expect(result.financialScore).toBeLessThanOrEqual(10);
    expect(result.capabilityScore).toBeGreaterThanOrEqual(0);
    expect(result.capabilityScore).toBeLessThanOrEqual(10);
    expect(result.strategicScore).toBeGreaterThanOrEqual(0);
    expect(result.strategicScore).toBeLessThanOrEqual(10);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(10);
  });
});
