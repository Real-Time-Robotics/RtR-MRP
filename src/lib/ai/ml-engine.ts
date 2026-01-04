// =============================================================================
// ML ENGINE - Machine Learning Algorithms
// Phase 14: AI/ML Features
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ForecastResult {
  date: string;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface DemandForecast {
  itemId: string;
  itemCode: string;
  itemName: string;
  currentStock: number;
  avgDailyDemand: number;
  historicalData: TimeSeriesDataPoint[];
  forecast: ForecastResult[];
  metrics: ForecastMetrics;
  recommendations: ForecastRecommendation[];
  seasonalityDetected: boolean;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
}

export interface ForecastMetrics {
  mape: number; // Mean Absolute Percentage Error
  mae: number;  // Mean Absolute Error
  rmse: number; // Root Mean Square Error
  accuracy: number;
}

export interface ForecastRecommendation {
  type: 'REORDER' | 'INCREASE_STOCK' | 'REDUCE_STOCK' | 'MONITOR' | 'SEASONAL_PREP';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  suggestedAction?: string;
  estimatedImpact?: string;
}

export interface EquipmentHealth {
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  healthScore: number; // 0-100
  status: 'HEALTHY' | 'DEGRADED' | 'AT_RISK' | 'CRITICAL';
  failureProbability: number; // 0-100
  predictedFailureDate?: string;
  daysUntilMaintenance: number;
  riskFactors: RiskFactor[];
  recommendations: MaintenanceRecommendation[];
  sensorData: SensorReading[];
  maintenanceHistory: MaintenanceEvent[];
  operatingHours?: number;
  expectedLifeHours?: number;
  lastMaintenanceDate?: string;
  nextScheduledMaintenance?: string;
}

export interface RiskFactor {
  id: string;
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  contribution: number; // % contribution to risk
  description: string;
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING';
}

export interface SensorReading {
  sensorId: string;
  name: string;
  value: number;
  unit: string;
  normalRange: { min: number; max: number };
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  timestamp: string;
}

export interface MaintenanceEvent {
  id: string;
  type: 'PM' | 'CM' | 'INSPECTION';
  date: string;
  description: string;
  cost?: number;
  downtimeHours?: number;
}

export interface MaintenanceRecommendation {
  type: 'IMMEDIATE' | 'SCHEDULED' | 'MONITOR' | 'REPLACE';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  estimatedCost?: number;
  estimatedDowntime?: string;
  dueDate?: string;
}

export interface AnomalyDetection {
  id: string;
  type: 'PRODUCTION' | 'QUALITY' | 'EQUIPMENT' | 'INVENTORY' | 'DEMAND';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  entityId: string;
  entityName: string;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  detectedAt: string;
  status: 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  possibleCauses: string[];
  suggestedActions: string[];
}

export interface AIInsight {
  id: string;
  category: 'FORECASTING' | 'MAINTENANCE' | 'QUALITY' | 'EFFICIENCY' | 'COST';
  type: 'PREDICTION' | 'RECOMMENDATION' | 'ALERT' | 'OPPORTUNITY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  impact: string;
  confidence: number;
  dataPoints: number;
  generatedAt: string;
  expiresAt?: string;
  actionUrl?: string;
  actionLabel?: string;
}

// Alias for AnomalyDetection
export type Anomaly = AnomalyDetection;

// =============================================================================
// ML ENGINE CLASS
// =============================================================================

export class MLEngine {
  
  // =========================================================================
  // DEMAND FORECASTING
  // =========================================================================

  /**
   * Simple Moving Average
   */
  static movingAverage(data: number[], windowSize: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < windowSize - 1) {
        result.push(data[i]);
      } else {
        const window = data.slice(i - windowSize + 1, i + 1);
        const avg = window.reduce((a, b) => a + b, 0) / windowSize;
        result.push(avg);
      }
    }
    return result;
  }

  /**
   * Exponential Moving Average
   */
  static exponentialMovingAverage(data: number[], alpha: number = 0.3): number[] {
    const result: number[] = [data[0]];
    for (let i = 1; i < data.length; i++) {
      const ema = alpha * data[i] + (1 - alpha) * result[i - 1];
      result.push(ema);
    }
    return result;
  }

  /**
   * Double Exponential Smoothing (Holt's Method)
   */
  static doubleExponentialSmoothing(
    data: number[],
    alpha: number = 0.3,
    beta: number = 0.1,
    periods: number = 7
  ): ForecastResult[] {
    if (data.length < 2) return [];

    // Initialize
    let level = data[0];
    let trend = data[1] - data[0];
    
    // Fit model to historical data
    for (let i = 1; i < data.length; i++) {
      const lastLevel = level;
      level = alpha * data[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - lastLevel) + (1 - beta) * trend;
    }
    
    // Generate forecasts
    const forecasts: ForecastResult[] = [];
    const now = new Date();
    const stdDev = this.standardDeviation(data);
    
    for (let i = 1; i <= periods; i++) {
      const predicted = level + i * trend;
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      
      // Confidence interval widens with forecast horizon
      const uncertainty = stdDev * Math.sqrt(i) * 1.96;
      
      forecasts.push({
        date: date.toISOString().split('T')[0],
        predicted: Math.max(0, Math.round(predicted)),
        lowerBound: Math.max(0, Math.round(predicted - uncertainty)),
        upperBound: Math.round(predicted + uncertainty),
        confidence: Math.max(50, 95 - i * 3), // Confidence decreases over time
      });
    }
    
    return forecasts;
  }

  /**
   * Detect seasonality in data
   */
  static detectSeasonality(data: number[], period: number = 7): boolean {
    if (data.length < period * 2) return false;
    
    // Simple autocorrelation check
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < data.length - period; i++) {
      numerator += (data[i] - mean) * (data[i + period] - mean);
    }
    
    for (let i = 0; i < data.length; i++) {
      denominator += (data[i] - mean) ** 2;
    }
    
    const autocorrelation = numerator / denominator;
    return autocorrelation > 0.3; // Threshold for seasonality
  }

  /**
   * Detect trend direction
   */
  static detectTrend(data: number[]): 'UP' | 'DOWN' | 'STABLE' {
    if (data.length < 3) return 'STABLE';
    
    // Linear regression slope
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
    }
    
    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return 'STABLE';
    
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const avgValue = sumY / n;
    if (avgValue === 0) return 'STABLE';
    
    const slopePercent = (slope / avgValue) * 100;
    
    if (slopePercent > 2) return 'UP';
    if (slopePercent < -2) return 'DOWN';
    return 'STABLE';
  }

  /**
   * Calculate forecast accuracy metrics
   */
  static calculateForecastMetrics(actual: number[], predicted: number[]): ForecastMetrics {
    const n = Math.min(actual.length, predicted.length);
    if (n === 0) return { mape: 0, mae: 0, rmse: 0, accuracy: 0 };

    let sumAPE = 0, sumAE = 0, sumSE = 0;

    for (let i = 0; i < n; i++) {
      const error = actual[i] - predicted[i];
      sumAE += Math.abs(error);
      sumSE += error ** 2;
      if (actual[i] !== 0) {
        sumAPE += Math.abs(error / actual[i]) * 100;
      }
    }

    const mape = sumAPE / n;
    const mae = sumAE / n;
    const rmse = Math.sqrt(sumSE / n);
    const accuracy = Math.max(0, 100 - mape);

    return {
      mape: Math.round(mape * 10) / 10,
      mae: Math.round(mae * 10) / 10,
      rmse: Math.round(rmse * 10) / 10,
      accuracy: Math.round(accuracy * 10) / 10,
    };
  }

  /**
   * Generate demand forecast recommendations
   */
  static generateForecastRecommendations(
    forecast: ForecastResult[],
    currentStock: number,
    avgDailyDemand: number,
    leadTimeDays: number = 7
  ): ForecastRecommendation[] {
    const recommendations: ForecastRecommendation[] = [];
    
    // Calculate total forecasted demand
    const totalForecastDemand = forecast.reduce((s, f) => s + f.predicted, 0);
    const daysOfStock = avgDailyDemand > 0 ? currentStock / avgDailyDemand : 999;
    const reorderPoint = avgDailyDemand * leadTimeDays * 1.5;
    
    // Check if reorder needed
    if (currentStock < reorderPoint) {
      recommendations.push({
        type: 'REORDER',
        priority: currentStock < avgDailyDemand * 3 ? 'HIGH' : 'MEDIUM',
        title: 'Cần đặt hàng bổ sung',
        description: `Tồn kho hiện tại (${currentStock}) thấp hơn điểm đặt hàng lại (${Math.round(reorderPoint)})`,
        suggestedAction: `Đặt hàng tối thiểu ${Math.round(totalForecastDemand * 1.2)} đơn vị`,
        estimatedImpact: `Tránh hết hàng trong ${Math.round(daysOfStock)} ngày tới`,
      });
    }
    
    // Check for demand spike
    const avgForecast = totalForecastDemand / forecast.length;
    if (avgForecast > avgDailyDemand * 1.3) {
      recommendations.push({
        type: 'INCREASE_STOCK',
        priority: 'MEDIUM',
        title: 'Dự báo nhu cầu tăng',
        description: `Nhu cầu dự kiến cao hơn trung bình ${Math.round((avgForecast / avgDailyDemand - 1) * 100)}%`,
        suggestedAction: 'Tăng mức tồn kho an toàn',
      });
    }
    
    // Check for demand drop
    if (avgForecast < avgDailyDemand * 0.7) {
      recommendations.push({
        type: 'REDUCE_STOCK',
        priority: 'LOW',
        title: 'Dự báo nhu cầu giảm',
        description: `Nhu cầu dự kiến thấp hơn trung bình ${Math.round((1 - avgForecast / avgDailyDemand) * 100)}%`,
        suggestedAction: 'Xem xét giảm đơn đặt hàng tiếp theo',
      });
    }
    
    return recommendations;
  }

  // =========================================================================
  // PREDICTIVE MAINTENANCE
  // =========================================================================

  /**
   * Calculate equipment health score
   */
  static calculateHealthScore(
    sensorReadings: SensorReading[],
    maintenanceHistory: MaintenanceEvent[],
    operatingHours: number,
    expectedLifeHours: number
  ): number {
    let score = 100;
    
    // Deduct for sensor warnings
    for (const reading of sensorReadings) {
      if (reading.status === 'CRITICAL') score -= 25;
      else if (reading.status === 'WARNING') score -= 10;
    }
    
    // Deduct for age
    const ageRatio = operatingHours / expectedLifeHours;
    if (ageRatio > 0.9) score -= 30;
    else if (ageRatio > 0.7) score -= 15;
    else if (ageRatio > 0.5) score -= 5;
    
    // Deduct for recent corrective maintenance
    const recentCM = maintenanceHistory.filter(
      m => m.type === 'CM' && this.isWithinDays(m.date, 30)
    ).length;
    score -= recentCM * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate failure probability
   */
  static calculateFailureProbability(
    healthScore: number,
    daysSinceLastPM: number,
    pmIntervalDays: number,
    riskFactors: RiskFactor[]
  ): number {
    // Base probability from health score
    let probability = (100 - healthScore) / 2;
    
    // Increase for overdue PM
    const pmOverdueRatio = daysSinceLastPM / pmIntervalDays;
    if (pmOverdueRatio > 1.5) probability += 30;
    else if (pmOverdueRatio > 1.2) probability += 15;
    else if (pmOverdueRatio > 1.0) probability += 5;
    
    // Add risk factor contributions
    for (const factor of riskFactors) {
      if (factor.severity === 'CRITICAL') probability += factor.contribution * 0.5;
      else if (factor.severity === 'HIGH') probability += factor.contribution * 0.3;
      else if (factor.severity === 'MEDIUM') probability += factor.contribution * 0.1;
    }
    
    return Math.max(0, Math.min(100, Math.round(probability)));
  }

  /**
   * Predict failure date
   */
  static predictFailureDate(
    healthScore: number,
    healthTrend: number, // daily change in health score
    criticalThreshold: number = 30
  ): string | undefined {
    if (healthScore <= criticalThreshold) {
      return new Date().toISOString().split('T')[0]; // Already critical
    }
    
    if (healthTrend >= 0) {
      return undefined; // Health is stable or improving
    }
    
    const daysToFailure = (healthScore - criticalThreshold) / Math.abs(healthTrend);
    const failureDate = new Date();
    failureDate.setDate(failureDate.getDate() + Math.ceil(daysToFailure));
    
    return failureDate.toISOString().split('T')[0];
  }

  /**
   * Generate maintenance recommendations
   */
  static generateMaintenanceRecommendations(
    healthScore: number,
    failureProbability: number,
    riskFactors: RiskFactor[],
    daysSinceLastPM: number,
    pmIntervalDays: number
  ): MaintenanceRecommendation[] {
    const recommendations: MaintenanceRecommendation[] = [];
    
    // Critical health
    if (healthScore < 30) {
      recommendations.push({
        type: 'IMMEDIATE',
        priority: 'CRITICAL',
        title: 'Cần bảo trì khẩn cấp',
        description: `Điểm sức khỏe thiết bị ${healthScore}% - nguy cơ hỏng cao`,
        estimatedDowntime: '4-8 giờ',
      });
    }
    
    // High failure probability
    if (failureProbability > 60) {
      recommendations.push({
        type: 'SCHEDULED',
        priority: 'HIGH',
        title: 'Lên lịch bảo trì phòng ngừa',
        description: `Xác suất hỏng ${failureProbability}% - cần bảo trì trong 7 ngày`,
        estimatedDowntime: '2-4 giờ',
        dueDate: this.addDays(new Date(), 7).toISOString().split('T')[0],
      });
    }
    
    // Overdue PM
    if (daysSinceLastPM > pmIntervalDays) {
      recommendations.push({
        type: 'SCHEDULED',
        priority: 'MEDIUM',
        title: 'PM quá hạn',
        description: `Đã ${daysSinceLastPM - pmIntervalDays} ngày quá hạn bảo trì định kỳ`,
        estimatedDowntime: '1-2 giờ',
      });
    }
    
    // High severity risk factors
    for (const factor of riskFactors.filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL')) {
      recommendations.push({
        type: 'MONITOR',
        priority: factor.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        title: `Giám sát: ${factor.name}`,
        description: factor.description,
      });
    }
    
    return recommendations;
  }

  // =========================================================================
  // ANOMALY DETECTION
  // =========================================================================

  /**
   * Detect anomalies using Z-score
   */
  static detectAnomaliesZScore(
    data: number[],
    threshold: number = 2.5
  ): { index: number; value: number; zScore: number }[] {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const stdDev = this.standardDeviation(data);
    
    const anomalies: { index: number; value: number; zScore: number }[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const zScore = stdDev > 0 ? (data[i] - mean) / stdDev : 0;
      if (Math.abs(zScore) > threshold) {
        anomalies.push({ index: i, value: data[i], zScore });
      }
    }
    
    return anomalies;
  }

  /**
   * Detect anomalies using IQR (Interquartile Range)
   */
  static detectAnomaliesIQR(
    data: number[],
    multiplier: number = 1.5
  ): { index: number; value: number }[] {
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;
    
    const anomalies: { index: number; value: number }[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (data[i] < lowerBound || data[i] > upperBound) {
        anomalies.push({ index: i, value: data[i] });
      }
    }
    
    return anomalies;
  }

  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================

  /**
   * Calculate standard deviation
   */
  static standardDeviation(data: number[]): number {
    if (data.length === 0) return 0;
    if (data.length === 1) return 0;
    
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map(x => (x - mean) ** 2);
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
    return Math.sqrt(variance);
  }

  /**
   * Check if date is within N days
   */
  static isWithinDays(dateStr: string, days: number): boolean {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= days;
  }

  /**
   * Add days to date
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Get health status from score
   */
  static getHealthStatus(score: number): EquipmentHealth['status'] {
    if (score >= 80) return 'HEALTHY';
    if (score >= 60) return 'DEGRADED';
    if (score >= 30) return 'AT_RISK';
    return 'CRITICAL';
  }

  /**
   * Get health status color
   */
  static getHealthStatusColor(status: EquipmentHealth['status']): string {
    const colors: Record<EquipmentHealth['status'], string> = {
      HEALTHY: 'bg-green-100 text-green-700',
      DEGRADED: 'bg-yellow-100 text-yellow-700',
      AT_RISK: 'bg-orange-100 text-orange-700',
      CRITICAL: 'bg-red-100 text-red-700',
    };
    return colors[status];
  }

  /**
   * Get priority color
   */
  static getPriorityColor(priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): string {
    const colors = {
      LOW: 'bg-gray-100 text-gray-700',
      MEDIUM: 'bg-blue-100 text-blue-700',
      HIGH: 'bg-orange-100 text-orange-700',
      CRITICAL: 'bg-red-100 text-red-700',
    };
    return colors[priority];
  }
}

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

/**
 * Generate mock historical time series data
 */
export function generateMockHistoricalData(days: number = 30): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = [];
  const now = new Date();
  const baseValue = 50 + Math.random() * 50;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Add some realistic variation: trend + seasonality + noise
    const trend = i * 0.1;
    const dayOfWeek = date.getDay();
    const seasonality = dayOfWeek === 0 || dayOfWeek === 6 ? -10 : 5;
    const noise = (Math.random() - 0.5) * 20;

    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(0, Math.round(baseValue + trend + seasonality + noise)),
    });
  }

  return data;
}

/**
 * Generate mock sensor readings for equipment
 */
export function generateMockSensorData(equipmentId: string): SensorReading[] {
  const sensors = [
    { id: 'temp', name: 'Nhiệt độ', unit: '°C', range: { min: 20, max: 60 } },
    { id: 'vibration', name: 'Độ rung', unit: 'mm/s', range: { min: 0, max: 4 } },
    { id: 'pressure', name: 'Áp suất', unit: 'bar', range: { min: 2, max: 8 } },
    { id: 'current', name: 'Dòng điện', unit: 'A', range: { min: 5, max: 25 } },
  ];

  return sensors.map(sensor => {
    const normalMin = sensor.range.min + (sensor.range.max - sensor.range.min) * 0.2;
    const normalMax = sensor.range.min + (sensor.range.max - sensor.range.min) * 0.8;
    const value = normalMin + Math.random() * (normalMax - normalMin);

    // Randomly make some sensors have warnings or critical values
    const statusRoll = Math.random();
    let actualValue = value;
    let status: SensorReading['status'] = 'NORMAL';

    if (statusRoll > 0.95) {
      actualValue = sensor.range.max * (0.9 + Math.random() * 0.2);
      status = 'CRITICAL';
    } else if (statusRoll > 0.85) {
      actualValue = normalMax + (sensor.range.max - normalMax) * 0.5;
      status = 'WARNING';
    }

    return {
      sensorId: `${equipmentId}-${sensor.id}`,
      name: sensor.name,
      value: Math.round(actualValue * 10) / 10,
      unit: sensor.unit,
      normalRange: { min: normalMin, max: normalMax },
      status,
      timestamp: new Date().toISOString(),
    };
  });
}

/**
 * Generate mock maintenance history for equipment
 */
export function generateMockMaintenanceHistory(equipmentId: string): MaintenanceEvent[] {
  const events: MaintenanceEvent[] = [];
  const now = new Date();

  // Generate PM events
  for (let i = 1; i <= 6; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 30);
    events.push({
      id: `${equipmentId}-PM-${i}`,
      type: 'PM',
      date: date.toISOString().split('T')[0],
      description: `Bảo trì định kỳ tháng ${i}`,
      cost: 500000 + Math.random() * 500000,
      downtimeHours: 2 + Math.random() * 2,
    });
  }

  // Generate some CM events
  if (Math.random() > 0.5) {
    const cmDate = new Date(now);
    cmDate.setDate(cmDate.getDate() - Math.floor(Math.random() * 60));
    events.push({
      id: `${equipmentId}-CM-1`,
      type: 'CM',
      date: cmDate.toISOString().split('T')[0],
      description: 'Sửa chữa khẩn cấp - thay thế bộ phận hỏng',
      cost: 2000000 + Math.random() * 3000000,
      downtimeHours: 8 + Math.random() * 16,
    });
  }

  // Generate inspection events
  for (let i = 1; i <= 3; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 7);
    events.push({
      id: `${equipmentId}-INSP-${i}`,
      type: 'INSPECTION',
      date: date.toISOString().split('T')[0],
      description: `Kiểm tra tuần ${i}`,
      downtimeHours: 0.5,
    });
  }

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// =============================================================================
// EXPORTS
// =============================================================================

export default MLEngine;
