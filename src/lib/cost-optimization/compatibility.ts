export interface SpecComparison {
  specName: string;
  originalValue: string;
  substituteValue: string;
  matchType: "exact" | "better" | "acceptable" | "worse" | "incompatible";
  weight: number;
  score: number;
  notes?: string;
}

export interface CompatibilityResult {
  overallScore: number;
  specsComparison: SpecComparison[];
  criticalIssues: string[];
  warnings: string[];
  recommendation: "recommended" | "acceptable" | "not_recommended";
}

const SPEC_WEIGHTS: Record<string, number> = {
  interface: 1.0,
  voltage: 1.0,
  protocol: 1.0,
  form_factor: 0.9,
  accuracy: 0.8,
  performance: 0.8,
  temperature_range: 0.7,
  power_consumption: 0.6,
  weight: 0.4,
  size: 0.4,
  features: 0.3,
};

export function calculateCompatibility(
  originalSpecs: Record<string, string>,
  substituteSpecs: Record<string, string>,
  customWeights?: Record<string, number>
): CompatibilityResult {
  const weights = { ...SPEC_WEIGHTS, ...customWeights };
  const comparisons: SpecComparison[] = [];
  const criticalIssues: string[] = [];
  const warnings: string[] = [];

  let totalWeight = 0;
  let totalScore = 0;

  for (const [specName, originalValue] of Object.entries(originalSpecs)) {
    const substituteValue = substituteSpecs[specName] || "N/A";
    const weight = weights[specName.toLowerCase()] || 0.5;

    const { matchType, score, notes } = compareSpec(
      specName,
      originalValue,
      substituteValue
    );

    comparisons.push({
      specName,
      originalValue,
      substituteValue,
      matchType,
      weight,
      score,
      notes,
    });

    totalWeight += weight;
    totalScore += score * weight;

    if (matchType === "incompatible") {
      criticalIssues.push(`${specName}: ${notes || "Incompatible"}`);
    } else if (matchType === "worse") {
      warnings.push(`${specName}: ${notes || "Lower spec"}`);
    }
  }

  const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;

  let recommendation: CompatibilityResult["recommendation"];
  if (criticalIssues.length > 0) {
    recommendation = "not_recommended";
  } else if (overallScore >= 90 && warnings.length <= 1) {
    recommendation = "recommended";
  } else if (overallScore >= 70) {
    recommendation = "acceptable";
  } else {
    recommendation = "not_recommended";
  }

  return {
    overallScore: Math.round(overallScore),
    specsComparison: comparisons,
    criticalIssues,
    warnings,
    recommendation,
  };
}

function compareSpec(
  specName: string,
  original: string,
  substitute: string
): { matchType: SpecComparison["matchType"]; score: number; notes?: string } {
  if (original.toLowerCase() === substitute.toLowerCase()) {
    return { matchType: "exact", score: 100 };
  }

  if (substitute === "N/A" || !substitute) {
    return { matchType: "incompatible", score: 0, notes: "Spec not available" };
  }

  const origNum = parseFloat(original.replace(/[^\d.-]/g, ""));
  const subNum = parseFloat(substitute.replace(/[^\d.-]/g, ""));

  if (!isNaN(origNum) && !isNaN(subNum) && origNum !== 0) {
    const ratio = subNum / origNum;
    const lowerName = specName.toLowerCase();

    // Higher is better
    if (
      lowerName.includes("accuracy") ||
      lowerName.includes("speed") ||
      lowerName.includes("rate") ||
      lowerName.includes("channels")
    ) {
      if (ratio >= 1)
        return { matchType: "better", score: 100, notes: "Better spec" };
      if (ratio >= 0.9)
        return {
          matchType: "acceptable",
          score: 90,
          notes: `${((1 - ratio) * 100).toFixed(0)}% lower`,
        };
      if (ratio >= 0.7)
        return {
          matchType: "worse",
          score: 70,
          notes: `${((1 - ratio) * 100).toFixed(0)}% lower`,
        };
      return { matchType: "incompatible", score: 30, notes: "Significantly lower" };
    }

    // Lower is better
    if (
      lowerName.includes("power") ||
      lowerName.includes("size") ||
      lowerName.includes("weight") ||
      lowerName.includes("consumption")
    ) {
      if (ratio <= 1)
        return { matchType: "better", score: 100, notes: "Better spec" };
      if (ratio <= 1.1)
        return {
          matchType: "acceptable",
          score: 90,
          notes: `${((ratio - 1) * 100).toFixed(0)}% higher`,
        };
      if (ratio <= 1.3)
        return {
          matchType: "worse",
          score: 70,
          notes: `${((ratio - 1) * 100).toFixed(0)}% higher`,
        };
      return { matchType: "incompatible", score: 30, notes: "Significantly higher" };
    }

    // Generic numeric
    if (Math.abs(ratio - 1) <= 0.05) return { matchType: "acceptable", score: 95 };
    if (Math.abs(ratio - 1) <= 0.15) return { matchType: "acceptable", score: 80 };
    return { matchType: "worse", score: 60, notes: "Different value" };
  }

  // String partial match
  if (
    original.toLowerCase().includes(substitute.toLowerCase()) ||
    substitute.toLowerCase().includes(original.toLowerCase())
  ) {
    return { matchType: "acceptable", score: 80, notes: "Partial match" };
  }

  return { matchType: "worse", score: 50, notes: "Different" };
}

export function assessRisk(
  compatibility: CompatibilityResult,
  ndaaCompliant: boolean,
  supplierReliability: number,
  leadTime: number
): { level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; factors: string[] } {
  const factors: string[] = [];
  let riskScore = 0;

  if (compatibility.overallScore < 70) {
    riskScore += 3;
    factors.push("Low compatibility score");
  } else if (compatibility.overallScore < 85) {
    riskScore += 1;
    factors.push("Moderate compatibility");
  }

  if (compatibility.criticalIssues.length > 0) {
    riskScore += 3;
    factors.push(`${compatibility.criticalIssues.length} critical spec issues`);
  }

  if (!ndaaCompliant) {
    riskScore += 2;
    factors.push("Not NDAA compliant");
  }

  if (supplierReliability < 5) {
    riskScore += 2;
    factors.push("Low supplier reliability");
  } else if (supplierReliability < 7) {
    riskScore += 1;
    factors.push("Moderate supplier reliability");
  }

  if (leadTime > 60) {
    riskScore += 2;
    factors.push("Long lead time (>60 days)");
  } else if (leadTime > 30) {
    riskScore += 1;
    factors.push("Moderate lead time");
  }

  let level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  if (riskScore >= 6) level = "CRITICAL";
  else if (riskScore >= 4) level = "HIGH";
  else if (riskScore >= 2) level = "MEDIUM";
  else level = "LOW";

  return { level, factors };
}
