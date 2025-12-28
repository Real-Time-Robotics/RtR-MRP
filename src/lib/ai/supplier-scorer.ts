// lib/ai/supplier-scorer.ts

interface SupplierMetrics {
  supplierId: string;
  supplierName: string;
  country: string;
  // Delivery metrics
  totalOrders: number;
  onTimeOrders: number;
  avgLeadTime: number;
  statedLeadTime: number;
  // Quality metrics
  totalReceived: number;
  qualityIssues: number;
  // Other
  responseTimeDays: number;
  yearsRelationship: number;
}

interface RiskScore {
  supplierId: string;
  overallScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  deliveryScore: number;
  qualityScore: number;
  financialScore: number;
  geographicScore: number;
  communicationScore: number;
  trend: "IMPROVING" | "STABLE" | "DECLINING";
  strengths: string[];
  risks: string[];
  recommendations: string[];
}

const WEIGHTS = {
  delivery: 0.3,
  quality: 0.25,
  financial: 0.2,
  geographic: 0.15,
  communication: 0.1,
};

export function calculateSupplierRiskScore(
  metrics: SupplierMetrics
): RiskScore {
  // 1. Delivery Score (0-100)
  const onTimeRate =
    metrics.totalOrders > 0
      ? metrics.onTimeOrders / metrics.totalOrders
      : 0.8;
  const leadTimeAccuracy = Math.min(
    1,
    metrics.statedLeadTime / Math.max(1, metrics.avgLeadTime)
  );
  const deliveryScore = Math.round(
    (onTimeRate * 0.7 + leadTimeAccuracy * 0.3) * 100
  );

  // 2. Quality Score (0-100)
  const defectRate =
    metrics.totalReceived > 0
      ? metrics.qualityIssues / metrics.totalReceived
      : 0;
  const qualityScore = Math.round((1 - Math.min(defectRate * 10, 1)) * 100);

  // 3. Financial Score (0-100) - Simplified, would use external API in production
  const financialScore = 75; // Default, would come from financial data

  // 4. Geographic Score (0-100)
  const geographicScore = getGeographicScore(metrics.country);

  // 5. Communication Score (0-100)
  const communicationScore = Math.max(
    0,
    100 - (metrics.responseTimeDays - 1) * 15
  );

  // Calculate weighted overall score
  const overallScore = Math.round(
    deliveryScore * WEIGHTS.delivery +
      qualityScore * WEIGHTS.quality +
      financialScore * WEIGHTS.financial +
      geographicScore * WEIGHTS.geographic +
      communicationScore * WEIGHTS.communication
  );

  // Determine risk level
  const riskLevel =
    overallScore >= 80
      ? "LOW"
      : overallScore >= 60
        ? "MEDIUM"
        : overallScore >= 40
          ? "HIGH"
          : "CRITICAL";

  // Analyze strengths and risks
  const strengths: string[] = [];
  const risks: string[] = [];
  const recommendations: string[] = [];

  if (deliveryScore >= 85) strengths.push("Excellent on-time delivery");
  else if (deliveryScore < 60) {
    risks.push(
      `Low on-time delivery rate (${Math.round(onTimeRate * 100)}%)`
    );
    recommendations.push("Negotiate delivery improvement plan");
  }

  if (qualityScore >= 90) strengths.push("Outstanding quality record");
  else if (qualityScore < 70) {
    risks.push("Quality issues detected");
    recommendations.push("Implement incoming quality checks");
  }

  if (geographicScore >= 90)
    strengths.push("Favorable location (domestic/allied)");
  else if (geographicScore < 60) {
    risks.push("Geographic/political risk");
    recommendations.push("Identify backup supplier in safer region");
  }

  if (communicationScore < 60) {
    risks.push("Slow response times");
    recommendations.push("Establish dedicated contact");
  }

  if (metrics.yearsRelationship > 3)
    strengths.push("Long-term trusted partner");

  return {
    supplierId: metrics.supplierId,
    overallScore,
    riskLevel,
    deliveryScore,
    qualityScore,
    financialScore,
    geographicScore,
    communicationScore,
    trend: "STABLE", // Would compare with previous score in production
    strengths,
    risks,
    recommendations,
  };
}

function getGeographicScore(country: string): number {
  // NDAA and supply chain risk by region
  const scores: Record<string, number> = {
    "United States": 95,
    Japan: 90,
    Taiwan: 85,
    "South Korea": 85,
    Germany: 90,
    Switzerland: 92,
    Vietnam: 80,
    "Czech Republic": 85,
    Australia: 90,
    Canada: 92,
    UK: 88,
    France: 88,
    Italy: 85,
    Singapore: 88,
    Israel: 82,
  };
  return scores[country] || 70;
}

// Generate mock metrics for demo
export function generateMockSupplierMetrics(
  supplierId: string,
  supplierName: string,
  country: string
): SupplierMetrics {
  const totalOrders = 20 + Math.floor(Math.random() * 80);
  const onTimeRate = 0.6 + Math.random() * 0.4;

  return {
    supplierId,
    supplierName,
    country,
    totalOrders,
    onTimeOrders: Math.floor(totalOrders * onTimeRate),
    avgLeadTime: 10 + Math.floor(Math.random() * 20),
    statedLeadTime: 14 + Math.floor(Math.random() * 14),
    totalReceived: 500 + Math.floor(Math.random() * 1500),
    qualityIssues: Math.floor(Math.random() * 20),
    responseTimeDays: 1 + Math.floor(Math.random() * 5),
    yearsRelationship: Math.floor(Math.random() * 8),
  };
}
