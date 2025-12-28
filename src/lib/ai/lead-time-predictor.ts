// lib/ai/lead-time-predictor.ts

interface LeadTimeHistory {
  supplierId: string;
  partId?: string;
  orderDate: Date;
  expectedDate: Date;
  actualDate: Date;
  quantity: number;
}

interface LeadTimePrediction {
  supplierId: string;
  partId?: string;
  predictedDays: number;
  confidence: number;
  minDays: number;
  maxDays: number;
  factors: {
    historicalAvg: number;
    recentTrend: number;
    seasonalFactor: number;
    quantityFactor: number;
  };
}

export function predictLeadTime(
  history: LeadTimeHistory[],
  supplierId: string,
  partId?: string,
  orderQuantity?: number
): LeadTimePrediction {
  // Filter relevant history
  const relevantHistory = history.filter(
    (h) => h.supplierId === supplierId && (!partId || h.partId === partId)
  );

  if (relevantHistory.length === 0) {
    // No history, return default
    return {
      supplierId,
      partId,
      predictedDays: 14,
      confidence: 0.5,
      minDays: 10,
      maxDays: 21,
      factors: {
        historicalAvg: 14,
        recentTrend: 0,
        seasonalFactor: 1,
        quantityFactor: 1,
      },
    };
  }

  // Calculate actual lead times
  const leadTimes = relevantHistory.map((h) => {
    const actual = Math.ceil(
      (h.actualDate.getTime() - h.orderDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return { ...h, actualLeadTime: actual };
  });

  // Historical average
  const historicalAvg =
    leadTimes.reduce((s, h) => s + h.actualLeadTime, 0) / leadTimes.length;

  // Recent trend (last 5 orders vs previous)
  const recent = leadTimes.slice(-5);
  const older = leadTimes.slice(0, -5);
  const recentAvg =
    recent.reduce((s, h) => s + h.actualLeadTime, 0) / recent.length;
  const olderAvg =
    older.length > 0
      ? older.reduce((s, h) => s + h.actualLeadTime, 0) / older.length
      : recentAvg;
  const recentTrend = recentAvg - olderAvg;

  // Seasonal factor (simplified)
  const currentMonth = new Date().getMonth();
  const seasonalFactor = [
    1.1, 1.0, 0.95, 0.95, 1.0, 1.0, 1.1, 1.15, 1.0, 1.0, 1.1, 1.2,
  ][currentMonth];

  // Quantity factor (larger orders may take longer)
  const avgQuantity =
    relevantHistory.reduce((s, h) => s + h.quantity, 0) /
    relevantHistory.length;
  const quantityFactor = orderQuantity
    ? Math.min(1.3, Math.max(0.9, orderQuantity / avgQuantity))
    : 1;

  // Calculate prediction
  const basePrediction = historicalAvg + recentTrend * 0.5;
  const adjustedPrediction = basePrediction * seasonalFactor * quantityFactor;
  const predictedDays = Math.round(adjustedPrediction);

  // Calculate confidence and bounds
  const stdDev = Math.sqrt(
    leadTimes.reduce((s, h) => s + (h.actualLeadTime - historicalAvg) ** 2, 0) /
      leadTimes.length
  );
  const confidence = Math.max(
    0.5,
    Math.min(0.95, 1 - stdDev / historicalAvg)
  );

  return {
    supplierId,
    partId,
    predictedDays,
    confidence,
    minDays: Math.round(predictedDays - stdDev * 1.5),
    maxDays: Math.round(predictedDays + stdDev * 1.5),
    factors: {
      historicalAvg: Math.round(historicalAvg * 10) / 10,
      recentTrend: Math.round(recentTrend * 10) / 10,
      seasonalFactor,
      quantityFactor: Math.round(quantityFactor * 100) / 100,
    },
  };
}

// Generate mock prediction for demo
export function generateMockLeadTimePrediction(
  supplierId: string,
  statedLeadTime: number
): LeadTimePrediction {
  const variation = (Math.random() - 0.5) * 0.4; // -20% to +20%
  const predictedDays = Math.round(statedLeadTime * (1 + variation));
  const confidence = 0.7 + Math.random() * 0.25;

  return {
    supplierId,
    predictedDays,
    confidence,
    minDays: Math.round(predictedDays * 0.8),
    maxDays: Math.round(predictedDays * 1.3),
    factors: {
      historicalAvg: predictedDays - Math.round(Math.random() * 3),
      recentTrend: Math.round((Math.random() - 0.5) * 4),
      seasonalFactor: 0.95 + Math.random() * 0.15,
      quantityFactor: 0.95 + Math.random() * 0.1,
    },
  };
}

export interface SupplierLeadTimeComparison {
  supplierId: string;
  supplierName: string;
  statedDays: number;
  predictedDays: number;
  actualAvg: number;
  trend: "faster" | "on_time" | "slower";
  trendDays: number;
}

export function compareSupplierLeadTimes(
  suppliers: Array<{
    id: string;
    name: string;
    leadTimeDays: number;
  }>
): SupplierLeadTimeComparison[] {
  return suppliers.map((s) => {
    const prediction = generateMockLeadTimePrediction(s.id, s.leadTimeDays);
    const diff = prediction.predictedDays - s.leadTimeDays;

    return {
      supplierId: s.id,
      supplierName: s.name,
      statedDays: s.leadTimeDays,
      predictedDays: prediction.predictedDays,
      actualAvg: prediction.factors.historicalAvg,
      trend: diff > 2 ? "slower" : diff < -2 ? "faster" : "on_time",
      trendDays: diff,
    };
  });
}
