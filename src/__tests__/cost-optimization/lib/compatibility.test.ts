import { describe, it, expect } from "vitest";
import {
  calculateCompatibility,
  assessRisk,
} from "@/lib/cost-optimization/compatibility";

describe("calculateCompatibility", () => {
  it("returns 100% for identical specs", () => {
    const specs = {
      voltage: "5V",
      interface: "SPI",
      accuracy: "0.1deg",
    };

    const result = calculateCompatibility(specs, specs);

    expect(result.overallScore).toBe(100);
    expect(result.criticalIssues).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.recommendation).toBe("recommended");
  });

  it("penalizes missing specs as incompatible", () => {
    const original = {
      voltage: "5V",
      interface: "SPI",
      accuracy: "0.1deg",
    };
    const substitute = {
      voltage: "5V",
      // missing interface and accuracy
    };

    const result = calculateCompatibility(original, substitute);

    expect(result.overallScore).toBeLessThan(100);
    expect(result.criticalIssues.length).toBeGreaterThan(0);
    expect(result.recommendation).toBe("not_recommended");
  });

  it("scores better spec higher for numeric comparisons (higher is better)", () => {
    const original = { accuracy: "10Hz" };
    const substitute = { accuracy: "20Hz" }; // better

    const result = calculateCompatibility(original, substitute);

    expect(result.overallScore).toBe(100);
    const comp = result.specsComparison[0];
    expect(comp.matchType).toBe("better");
  });

  it("scores better spec for numeric comparisons (lower is better)", () => {
    const original = { power_consumption: "500mW" };
    const substitute = { power_consumption: "300mW" }; // better (lower)

    const result = calculateCompatibility(original, substitute);

    expect(result.overallScore).toBe(100);
    const comp = result.specsComparison[0];
    expect(comp.matchType).toBe("better");
  });

  it("flags incompatible specs", () => {
    const original = { accuracy: "100Hz" };
    const substitute = { accuracy: "N/A" };

    const result = calculateCompatibility(original, substitute);

    expect(result.criticalIssues.length).toBeGreaterThan(0);
    expect(result.recommendation).toBe("not_recommended");
  });

  it("detects worse specs with warnings", () => {
    const original = { accuracy: "100Hz" };
    const substitute = { accuracy: "75Hz" }; // 25% lower

    const result = calculateCompatibility(original, substitute);

    expect(result.warnings.length).toBeGreaterThan(0);
    const comp = result.specsComparison[0];
    expect(comp.matchType).toBe("worse");
  });

  it("handles partial string matches", () => {
    const original = { interface: "SPI/I2C" };
    const substitute = { interface: "SPI" };

    const result = calculateCompatibility(original, substitute);

    const comp = result.specsComparison[0];
    expect(comp.matchType).toBe("acceptable");
    expect(comp.score).toBe(80);
  });
});

describe("assessRisk", () => {
  it("returns LOW risk for good compatibility and NDAA compliant", () => {
    const compatibility = {
      overallScore: 95,
      specsComparison: [],
      criticalIssues: [],
      warnings: [],
      recommendation: "recommended" as const,
    };

    const risk = assessRisk(compatibility, true, 9, 14);

    expect(risk.level).toBe("LOW");
    expect(risk.factors).toHaveLength(0);
  });

  it("adds risk factor for non-NDAA compliance", () => {
    const compatibility = {
      overallScore: 95,
      specsComparison: [],
      criticalIssues: [],
      warnings: [],
      recommendation: "recommended" as const,
    };

    const risk = assessRisk(compatibility, false, 9, 14);

    expect(risk.factors).toContain("Not NDAA compliant");
    expect(risk.level).toBe("MEDIUM");
  });

  it("returns CRITICAL for many risk factors", () => {
    const compatibility = {
      overallScore: 50,
      specsComparison: [],
      criticalIssues: ["Bad spec 1"],
      warnings: [],
      recommendation: "not_recommended" as const,
    };

    const risk = assessRisk(compatibility, false, 3, 90);

    expect(risk.level).toBe("CRITICAL");
    expect(risk.factors.length).toBeGreaterThanOrEqual(4);
  });

  it("considers supplier reliability", () => {
    const compatibility = {
      overallScore: 95,
      specsComparison: [],
      criticalIssues: [],
      warnings: [],
      recommendation: "recommended" as const,
    };

    const lowReliability = assessRisk(compatibility, true, 3, 14);
    const highReliability = assessRisk(compatibility, true, 9, 14);

    expect(lowReliability.factors).toContain("Low supplier reliability");
    expect(highReliability.factors).toHaveLength(0);
  });

  it("considers lead time", () => {
    const compatibility = {
      overallScore: 95,
      specsComparison: [],
      criticalIssues: [],
      warnings: [],
      recommendation: "recommended" as const,
    };

    const longLead = assessRisk(compatibility, true, 9, 90);
    expect(longLead.factors).toContain("Long lead time (>60 days)");
    expect(longLead.level).toBe("MEDIUM");
  });
});
