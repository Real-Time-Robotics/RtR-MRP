// lib/ai/forecasting.ts

interface ForecastResult {
  period: string;
  forecast: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  trend: "increasing" | "stable" | "decreasing";
}

interface HistoricalData {
  period: string;
  quantity: number;
}

export function generateDemandForecast(
  historicalData: HistoricalData[],
  periodsAhead: number = 4
): ForecastResult[] {
  if (historicalData.length === 0) {
    return [];
  }

  // Sort by period
  const sorted = [...historicalData].sort((a, b) =>
    a.period.localeCompare(b.period)
  );

  const values = sorted.map((d) => d.quantity);

  // Calculate trend using linear regression
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Calculate standard deviation for confidence intervals
  const residuals = values.map((v, i) => v - (slope * i + intercept));
  const stdDev = Math.sqrt(
    residuals.reduce((sum, r) => sum + r ** 2, 0) / n
  );

  // Apply seasonality (simple: use last year's same period ratio if available)
  const seasonalFactors = calculateSeasonalFactors(sorted);

  // Generate forecasts
  const forecasts: ForecastResult[] = [];

  for (let i = 0; i < periodsAhead; i++) {
    const periodIndex = n + i;
    const baseForecast = slope * periodIndex + intercept;

    // Apply seasonal adjustment
    const seasonIndex = periodIndex % 4; // Quarterly
    const seasonalFactor = seasonalFactors[seasonIndex] || 1;
    const adjustedForecast = Math.round(baseForecast * seasonalFactor);

    // Confidence decreases with distance
    const confidence = Math.max(0.5, 0.95 - i * 0.08);

    // Wider bounds for further predictions
    const marginMultiplier = 1 + i * 0.15;
    const margin = stdDev * 1.96 * marginMultiplier;

    forecasts.push({
      period: generatePeriodLabel(sorted[sorted.length - 1].period, i + 1),
      forecast: Math.max(0, adjustedForecast),
      lowerBound: Math.max(0, Math.round(adjustedForecast - margin)),
      upperBound: Math.round(adjustedForecast + margin),
      confidence,
      trend:
        slope > 0.5 ? "increasing" : slope < -0.5 ? "decreasing" : "stable",
    });
  }

  return forecasts;
}

function calculateSeasonalFactors(data: HistoricalData[]): number[] {
  // Simplified quarterly seasonality
  const quarterlyTotals = [0, 0, 0, 0];
  const quarterlyCounts = [0, 0, 0, 0];

  data.forEach((d) => {
    const quarter = getQuarter(d.period);
    quarterlyTotals[quarter] += d.quantity;
    quarterlyCounts[quarter]++;
  });

  const overallAvg = data.reduce((s, d) => s + d.quantity, 0) / data.length;

  return quarterlyTotals.map((total, i) => {
    const avg =
      quarterlyCounts[i] > 0 ? total / quarterlyCounts[i] : overallAvg;
    return overallAvg > 0 ? avg / overallAvg : 1;
  });
}

function getQuarter(period: string): number {
  // Parse "2024-Q1" or "2024-01" format
  if (period.includes("Q")) {
    return parseInt(period.split("Q")[1]) - 1;
  }
  const month = parseInt(period.split("-")[1]);
  return Math.floor((month - 1) / 3);
}

function generatePeriodLabel(lastPeriod: string, offset: number): string {
  // Generate next period labels
  if (lastPeriod.includes("Q")) {
    const [year, q] = lastPeriod.split("-Q");
    let newQ = parseInt(q) + offset;
    let newYear = parseInt(year);
    while (newQ > 4) {
      newQ -= 4;
      newYear++;
    }
    return `${newYear}-Q${newQ}`;
  }
  // Monthly
  const [year, month] = lastPeriod.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Generate mock historical data for demo
export function generateMockHistoricalData(
  productId: string,
  periods: number = 8
): HistoricalData[] {
  const data: HistoricalData[] = [];
  const baseValue = 20 + Math.random() * 30;
  const trend = 0.5 + Math.random() * 1.5;
  const seasonality = [0.8, 1.0, 1.2, 1.1]; // Q1-Q4

  const startYear = 2023;
  const startQuarter = 1;

  for (let i = 0; i < periods; i++) {
    const year = startYear + Math.floor((startQuarter + i - 1) / 4);
    const quarter = ((startQuarter + i - 1) % 4) + 1;

    const value = Math.round(
      baseValue +
        trend * i +
        seasonality[quarter - 1] * 5 +
        (Math.random() - 0.5) * 10
    );

    data.push({
      period: `${year}-Q${quarter}`,
      quantity: Math.max(1, value),
    });
  }

  return data;
}
