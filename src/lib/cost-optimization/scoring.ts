export type MvbRecommendation =
  | "STRONG_MAKE"
  | "CONSIDER_MAKE"
  | "NEUTRAL"
  | "CONSIDER_BUY"
  | "STRONG_BUY";

export interface ScoringInput {
  savingsPercent: number;
  investmentRequired: number;
  breakEvenMonths: number;
  volumeCertainty: number;
  technicalSkillAvailable: number;
  equipmentAvailable: number;
  qualityCapability: number;
  capacityAvailable: number;
  supplyChainRiskReduction: number;
  complianceBenefit: number;
  leadTimeReduction: number;
  ipProtection: number;
}

export interface ScoringResult {
  financialScore: number;
  capabilityScore: number;
  strategicScore: number;
  overallScore: number;
  recommendation: MvbRecommendation;
  rationale: string;
  conditions: string[];
}

const FINANCIAL_WEIGHT = 0.40;
const CAPABILITY_WEIGHT = 0.30;
const STRATEGIC_WEIGHT = 0.30;

export function calculateScore(input: ScoringInput): ScoringResult {
  const savingsScore = Math.min(input.savingsPercent / 10, 10);
  const investmentScore =
    input.investmentRequired < 10000 ? 10 :
    input.investmentRequired < 50000 ? 7 :
    input.investmentRequired < 100000 ? 5 : 3;
  const breakEvenScore =
    input.breakEvenMonths <= 6 ? 10 :
    input.breakEvenMonths <= 12 ? 7 :
    input.breakEvenMonths <= 24 ? 5 : 2;

  const financialScore =
    savingsScore * 0.4 +
    investmentScore * 0.2 +
    breakEvenScore * 0.25 +
    input.volumeCertainty * 0.15;

  const capabilityScore =
    input.technicalSkillAvailable * 0.30 +
    input.equipmentAvailable * 0.30 +
    input.qualityCapability * 0.25 +
    input.capacityAvailable * 0.15;

  const strategicScore =
    input.supplyChainRiskReduction * 0.30 +
    input.complianceBenefit * 0.30 +
    input.leadTimeReduction * 0.20 +
    input.ipProtection * 0.20;

  const overallScore =
    financialScore * FINANCIAL_WEIGHT +
    capabilityScore * CAPABILITY_WEIGHT +
    strategicScore * STRATEGIC_WEIGHT;

  const { recommendation, rationale, conditions } = generateRecommendation(
    overallScore, financialScore, capabilityScore, strategicScore, input
  );

  return {
    financialScore: r1(financialScore),
    capabilityScore: r1(capabilityScore),
    strategicScore: r1(strategicScore),
    overallScore: r1(overallScore),
    recommendation,
    rationale,
    conditions,
  };
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

function generateRecommendation(
  overall: number,
  financial: number,
  capability: number,
  _strategic: number,
  input: ScoringInput
): { recommendation: MvbRecommendation; rationale: string; conditions: string[] } {
  const conditions: string[] = [];
  let rationale = "";
  let recommendation: MvbRecommendation;

  if (overall >= 7.5) {
    recommendation = "STRONG_MAKE";
    rationale =
      "ROI tot, nang luc san xuat san sang va phu hop chien luoc tu chu.";
  } else if (overall >= 6.0) {
    recommendation = "CONSIDER_MAKE";
    rationale =
      "ROI kha quan nhung can giai quyet mot so gap ve nang luc.";
    if (capability < 6) {
      conditions.push("Giai quyet capability gaps truoc khi trien khai");
    }
    if (input.breakEvenMonths > 12) {
      conditions.push("Can nhac dau tu theo giai doan de giam rui ro");
    }
  } else if (overall >= 4.5) {
    recommendation = "NEUTRAL";
    rationale =
      "Ket qua chua ro rang, can them du lieu de quyet dinh.";
    conditions.push("Thu thap chi phi chinh xac hon");
    conditions.push("Xac nhan du bao san luong");
  } else if (overall >= 3.0) {
    recommendation = "CONSIDER_BUY";
    rationale =
      "ROI thap hoac gap nang luc lon, mua ngoai hap dan hon.";
  } else {
    recommendation = "STRONG_BUY";
    rationale =
      "Khong co loi the tai chinh hoac rao can nang luc qua lon.";
  }

  if (financial < 5 && recommendation !== "STRONG_BUY") {
    conditions.push("ROI bien - can xac minh chi phi");
  }
  if (capability < 5 && recommendation !== "STRONG_BUY") {
    conditions.push("Can dau tu dang ke vao nang luc");
  }

  return { recommendation, rationale, conditions };
}
