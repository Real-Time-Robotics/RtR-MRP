import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MLEngine,
  generateMockHistoricalData,
  generateMockSensorData,
  generateMockMaintenanceHistory,
} from '../ml-engine';
import type {
  SensorReading,
  MaintenanceEvent,
  RiskFactor,
  ForecastResult,
} from '../ml-engine';

// =============================================================================
// HELPERS
// =============================================================================

function makeSensorReading(overrides: Partial<SensorReading> = {}): SensorReading {
  return {
    sensorId: 'sensor-1',
    name: 'Temperature',
    value: 40,
    unit: '°C',
    normalRange: { min: 20, max: 60 },
    status: 'NORMAL',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function makeMaintenanceEvent(overrides: Partial<MaintenanceEvent> = {}): MaintenanceEvent {
  return {
    id: 'evt-1',
    type: 'PM',
    date: new Date().toISOString().split('T')[0],
    description: 'Routine maintenance',
    ...overrides,
  };
}

function makeRiskFactor(overrides: Partial<RiskFactor> = {}): RiskFactor {
  return {
    id: 'rf-1',
    name: 'Vibration',
    severity: 'LOW',
    contribution: 10,
    description: 'Elevated vibration levels',
    trend: 'STABLE',
    ...overrides,
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// =============================================================================
// TESTS
// =============================================================================

describe('MLEngine', () => {
  // ===========================================================================
  // standardDeviation
  // ===========================================================================
  describe('standardDeviation', () => {
    it('returns 0 for empty array', () => {
      expect(MLEngine.standardDeviation([])).toBe(0);
    });

    it('returns 0 for single element', () => {
      expect(MLEngine.standardDeviation([42])).toBe(0);
    });

    it('computes population standard deviation correctly', () => {
      // data = [2, 4, 4, 4, 5, 5, 7, 9]
      // mean = 5, variance = 4, stddev = 2
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      expect(MLEngine.standardDeviation(data)).toBeCloseTo(2, 5);
    });

    it('returns 0 for identical values', () => {
      expect(MLEngine.standardDeviation([7, 7, 7, 7])).toBe(0);
    });
  });

  // ===========================================================================
  // movingAverage
  // ===========================================================================
  describe('movingAverage', () => {
    it('returns original values when window size equals 1', () => {
      const data = [10, 20, 30, 40];
      expect(MLEngine.movingAverage(data, 1)).toEqual([10, 20, 30, 40]);
    });

    it('computes correct moving average with window size 3', () => {
      const data = [10, 20, 30, 40, 50];
      const result = MLEngine.movingAverage(data, 3);
      // i=0: 10 (pass-through), i=1: 20 (pass-through), i=2: avg(10,20,30)=20, i=3: avg(20,30,40)=30, i=4: avg(30,40,50)=40
      expect(result).toEqual([10, 20, 20, 30, 40]);
    });

    it('handles window larger than data by passing through all values', () => {
      const data = [5, 10];
      const result = MLEngine.movingAverage(data, 5);
      // Both indices < windowSize-1 (4), so values pass through
      expect(result).toEqual([5, 10]);
    });

    it('handles empty array', () => {
      expect(MLEngine.movingAverage([], 3)).toEqual([]);
    });
  });

  // ===========================================================================
  // exponentialMovingAverage
  // ===========================================================================
  describe('exponentialMovingAverage', () => {
    it('first value equals the first data point', () => {
      const result = MLEngine.exponentialMovingAverage([100, 200, 300], 0.5);
      expect(result[0]).toBe(100);
    });

    it('computes EMA correctly with alpha = 0.5', () => {
      const data = [10, 20, 30];
      const result = MLEngine.exponentialMovingAverage(data, 0.5);
      // EMA[0] = 10
      // EMA[1] = 0.5*20 + 0.5*10 = 15
      // EMA[2] = 0.5*30 + 0.5*15 = 22.5
      expect(result[0]).toBeCloseTo(10, 5);
      expect(result[1]).toBeCloseTo(15, 5);
      expect(result[2]).toBeCloseTo(22.5, 5);
    });

    it('with alpha = 1, each value equals the data point', () => {
      const data = [5, 15, 25];
      const result = MLEngine.exponentialMovingAverage(data, 1);
      expect(result).toEqual([5, 15, 25]);
    });

    it('with alpha = 0, all values equal the first data point', () => {
      const data = [10, 20, 30];
      const result = MLEngine.exponentialMovingAverage(data, 0);
      expect(result).toEqual([10, 10, 10]);
    });
  });

  // ===========================================================================
  // doubleExponentialSmoothing
  // ===========================================================================
  describe('doubleExponentialSmoothing', () => {
    it('returns empty array for fewer than 2 data points', () => {
      expect(MLEngine.doubleExponentialSmoothing([10])).toEqual([]);
      expect(MLEngine.doubleExponentialSmoothing([])).toEqual([]);
    });

    it('generates the requested number of forecast periods', () => {
      const data = [10, 20, 30, 40, 50];
      const result = MLEngine.doubleExponentialSmoothing(data, 0.3, 0.1, 5);
      expect(result).toHaveLength(5);
    });

    it('produces forecasts with non-negative predicted values', () => {
      const data = [100, 110, 120, 130, 140];
      const result = MLEngine.doubleExponentialSmoothing(data, 0.3, 0.1, 7);
      for (const f of result) {
        expect(f.predicted).toBeGreaterThanOrEqual(0);
        expect(f.lowerBound).toBeGreaterThanOrEqual(0);
      }
    });

    it('confidence decreases as forecast horizon increases', () => {
      const data = [50, 60, 70, 80, 90];
      const result = MLEngine.doubleExponentialSmoothing(data, 0.3, 0.1, 10);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].confidence).toBeLessThanOrEqual(result[i - 1].confidence);
      }
    });

    it('upperBound >= predicted >= lowerBound for each period', () => {
      const data = [100, 120, 110, 130, 125];
      const result = MLEngine.doubleExponentialSmoothing(data, 0.3, 0.1, 5);
      for (const f of result) {
        expect(f.upperBound).toBeGreaterThanOrEqual(f.predicted);
        expect(f.predicted).toBeGreaterThanOrEqual(f.lowerBound);
      }
    });

    it('forecast dates are consecutive days from now', () => {
      const data = [10, 20, 30, 40, 50];
      const result = MLEngine.doubleExponentialSmoothing(data, 0.3, 0.1, 3);
      const today = new Date();
      for (let i = 0; i < result.length; i++) {
        const expected = new Date(today);
        expected.setDate(expected.getDate() + i + 1);
        expect(result[i].date).toBe(expected.toISOString().split('T')[0]);
      }
    });
  });

  // ===========================================================================
  // detectSeasonality
  // ===========================================================================
  describe('detectSeasonality', () => {
    it('returns false when data is too short', () => {
      expect(MLEngine.detectSeasonality([1, 2, 3], 7)).toBe(false);
    });

    it('detects seasonality in periodic data', () => {
      // Repeat a clear pattern: [10, 20, 30, 10, 20, 30, 10, 20, 30, ...]
      const pattern = [10, 20, 30];
      const data: number[] = [];
      for (let i = 0; i < 10; i++) {
        data.push(...pattern);
      }
      expect(MLEngine.detectSeasonality(data, 3)).toBe(true);
    });

    it('returns false for constant data (no periodicity)', () => {
      // Constant data has zero variance, so autocorrelation is effectively 0
      const data = Array.from({ length: 30 }, () => 50);
      expect(MLEngine.detectSeasonality(data, 7)).toBe(false);
    });
  });

  // ===========================================================================
  // detectTrend
  // ===========================================================================
  describe('detectTrend', () => {
    it('returns STABLE for fewer than 3 data points', () => {
      expect(MLEngine.detectTrend([])).toBe('STABLE');
      expect(MLEngine.detectTrend([10])).toBe('STABLE');
      expect(MLEngine.detectTrend([10, 20])).toBe('STABLE');
    });

    it('detects upward trend', () => {
      expect(MLEngine.detectTrend([10, 20, 30, 40, 50])).toBe('UP');
    });

    it('detects downward trend', () => {
      expect(MLEngine.detectTrend([50, 40, 30, 20, 10])).toBe('DOWN');
    });

    it('detects stable data', () => {
      expect(MLEngine.detectTrend([100, 100, 100, 100])).toBe('STABLE');
    });

    it('returns STABLE for all identical values (zero average edge case)', () => {
      expect(MLEngine.detectTrend([0, 0, 0, 0])).toBe('STABLE');
    });
  });

  // ===========================================================================
  // calculateForecastMetrics
  // ===========================================================================
  describe('calculateForecastMetrics', () => {
    it('returns zeroed metrics for empty arrays', () => {
      const metrics = MLEngine.calculateForecastMetrics([], []);
      expect(metrics).toEqual({ mape: 0, mae: 0, rmse: 0, accuracy: 0 });
    });

    it('returns perfect metrics when predictions match actuals', () => {
      const actual = [10, 20, 30];
      const metrics = MLEngine.calculateForecastMetrics(actual, actual);
      expect(metrics.mape).toBe(0);
      expect(metrics.mae).toBe(0);
      expect(metrics.rmse).toBe(0);
      expect(metrics.accuracy).toBe(100);
    });

    it('computes MAE correctly', () => {
      const actual = [100, 200, 300];
      const predicted = [110, 190, 310];
      const metrics = MLEngine.calculateForecastMetrics(actual, predicted);
      // errors: 10, 10, 10 -> MAE = 10
      expect(metrics.mae).toBeCloseTo(10, 0);
    });

    it('computes RMSE correctly', () => {
      const actual = [10, 20];
      const predicted = [12, 18];
      // errors: -2, 2 -> SE: 4, 4 -> MSE=4 -> RMSE=2
      const metrics = MLEngine.calculateForecastMetrics(actual, predicted);
      expect(metrics.rmse).toBeCloseTo(2, 0);
    });

    it('handles arrays of different lengths (uses min length)', () => {
      const actual = [10, 20, 30, 40];
      const predicted = [10, 20];
      const metrics = MLEngine.calculateForecastMetrics(actual, predicted);
      // Only first 2 elements compared, both matching
      expect(metrics.mae).toBe(0);
    });

    it('handles zero actual values in MAPE calculation without NaN', () => {
      const actual = [0, 10, 20];
      const predicted = [5, 15, 25];
      const metrics = MLEngine.calculateForecastMetrics(actual, predicted);
      // When actual[i]=0, that term is skipped in MAPE sum
      expect(Number.isFinite(metrics.mape)).toBe(true);
    });
  });

  // ===========================================================================
  // generateForecastRecommendations
  // ===========================================================================
  describe('generateForecastRecommendations', () => {
    const baseForecast: ForecastResult[] = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-02-${20 + i}`,
      predicted: 10,
      lowerBound: 5,
      upperBound: 15,
      confidence: 90,
    }));

    it('recommends REORDER when stock is below reorder point', () => {
      // avgDailyDemand=10, leadTimeDays=7, reorderPoint = 10*7*1.5 = 105
      const recs = MLEngine.generateForecastRecommendations(baseForecast, 50, 10, 7);
      expect(recs.some(r => r.type === 'REORDER')).toBe(true);
    });

    it('sets HIGH priority when stock is very low', () => {
      // currentStock < avgDailyDemand * 3 => 20 < 10*3=30 => HIGH
      const recs = MLEngine.generateForecastRecommendations(baseForecast, 20, 10, 7);
      const reorder = recs.find(r => r.type === 'REORDER');
      expect(reorder?.priority).toBe('HIGH');
    });

    it('recommends INCREASE_STOCK when forecast demand spikes', () => {
      const spikeForecast: ForecastResult[] = Array.from({ length: 7 }, (_, i) => ({
        date: `2026-02-${20 + i}`,
        predicted: 20, // 2x average
        lowerBound: 15,
        upperBound: 25,
        confidence: 90,
      }));
      const recs = MLEngine.generateForecastRecommendations(spikeForecast, 9999, 10, 7);
      expect(recs.some(r => r.type === 'INCREASE_STOCK')).toBe(true);
    });

    it('recommends REDUCE_STOCK when forecast demand drops', () => {
      const dropForecast: ForecastResult[] = Array.from({ length: 7 }, (_, i) => ({
        date: `2026-02-${20 + i}`,
        predicted: 5, // 0.5x average
        lowerBound: 2,
        upperBound: 8,
        confidence: 90,
      }));
      const recs = MLEngine.generateForecastRecommendations(dropForecast, 9999, 10, 7);
      expect(recs.some(r => r.type === 'REDUCE_STOCK')).toBe(true);
    });

    it('returns empty recommendations when stock is adequate and demand is stable', () => {
      const recs = MLEngine.generateForecastRecommendations(baseForecast, 9999, 10, 7);
      expect(recs).toEqual([]);
    });
  });

  // ===========================================================================
  // calculateHealthScore
  // ===========================================================================
  describe('calculateHealthScore', () => {
    it('returns 100 for perfect equipment with no issues', () => {
      const score = MLEngine.calculateHealthScore(
        [makeSensorReading()],
        [],
        100,
        10000,
      );
      expect(score).toBe(100);
    });

    it('deducts 25 per CRITICAL sensor', () => {
      const sensors = [
        makeSensorReading({ status: 'CRITICAL' }),
        makeSensorReading({ sensorId: 's2', status: 'CRITICAL' }),
      ];
      const score = MLEngine.calculateHealthScore(sensors, [], 100, 10000);
      expect(score).toBe(50); // 100 - 25 - 25
    });

    it('deducts 10 per WARNING sensor', () => {
      const sensors = [makeSensorReading({ status: 'WARNING' })];
      const score = MLEngine.calculateHealthScore(sensors, [], 100, 10000);
      expect(score).toBe(90);
    });

    it('deducts for high age ratio (>0.9)', () => {
      const score = MLEngine.calculateHealthScore([], [], 9500, 10000);
      expect(score).toBe(70); // 100 - 30
    });

    it('deducts for recent corrective maintenance', () => {
      const cm: MaintenanceEvent = makeMaintenanceEvent({
        type: 'CM',
        date: daysAgo(5), // within 30 days
      });
      const score = MLEngine.calculateHealthScore([], [cm], 100, 10000);
      expect(score).toBe(90); // 100 - 10
    });

    it('never goes below 0', () => {
      const sensors = [
        makeSensorReading({ status: 'CRITICAL' }),
        makeSensorReading({ sensorId: 's2', status: 'CRITICAL' }),
        makeSensorReading({ sensorId: 's3', status: 'CRITICAL' }),
        makeSensorReading({ sensorId: 's4', status: 'CRITICAL' }),
        makeSensorReading({ sensorId: 's5', status: 'CRITICAL' }),
      ];
      const score = MLEngine.calculateHealthScore(sensors, [], 9500, 10000);
      expect(score).toBe(0);
    });
  });

  // ===========================================================================
  // calculateFailureProbability
  // ===========================================================================
  describe('calculateFailureProbability', () => {
    it('base probability is (100 - healthScore) / 2', () => {
      const prob = MLEngine.calculateFailureProbability(80, 10, 30, []);
      expect(prob).toBe(10); // (100-80)/2 = 10, PM not overdue
    });

    it('adds 30 when PM is heavily overdue (ratio > 1.5)', () => {
      const prob = MLEngine.calculateFailureProbability(80, 50, 30, []);
      // base=10, overdue ratio=50/30=1.67 => +30, total=40
      expect(prob).toBe(40);
    });

    it('adds risk factor contributions based on severity', () => {
      const factors: RiskFactor[] = [
        makeRiskFactor({ severity: 'CRITICAL', contribution: 20 }),
        makeRiskFactor({ id: 'rf-2', severity: 'HIGH', contribution: 10 }),
        makeRiskFactor({ id: 'rf-3', severity: 'MEDIUM', contribution: 10 }),
      ];
      const prob = MLEngine.calculateFailureProbability(80, 10, 30, factors);
      // base=10, CRITICAL: 20*0.5=10, HIGH: 10*0.3=3, MEDIUM: 10*0.1=1 => 24
      expect(prob).toBe(24);
    });

    it('caps at 100', () => {
      const factors: RiskFactor[] = [
        makeRiskFactor({ severity: 'CRITICAL', contribution: 100 }),
      ];
      const prob = MLEngine.calculateFailureProbability(0, 100, 30, factors);
      expect(prob).toBeLessThanOrEqual(100);
    });

    it('never goes below 0', () => {
      const prob = MLEngine.calculateFailureProbability(100, 0, 30, []);
      expect(prob).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================================================
  // predictFailureDate
  // ===========================================================================
  describe('predictFailureDate', () => {
    it('returns today if already below critical threshold', () => {
      const result = MLEngine.predictFailureDate(20, -1, 30);
      expect(result).toBe(new Date().toISOString().split('T')[0]);
    });

    it('returns undefined when health trend is positive (improving)', () => {
      expect(MLEngine.predictFailureDate(80, 0.5, 30)).toBeUndefined();
    });

    it('returns undefined when health trend is zero (stable)', () => {
      expect(MLEngine.predictFailureDate(80, 0, 30)).toBeUndefined();
    });

    it('predicts a future date when health is declining', () => {
      // healthScore=80, trend=-2/day, threshold=30 => days = (80-30)/2 = 25
      const result = MLEngine.predictFailureDate(80, -2, 30);
      expect(result).toBeDefined();
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 25);
      expect(result).toBe(expectedDate.toISOString().split('T')[0]);
    });
  });

  // ===========================================================================
  // generateMaintenanceRecommendations
  // ===========================================================================
  describe('generateMaintenanceRecommendations', () => {
    it('recommends IMMEDIATE for critical health score (<30)', () => {
      const recs = MLEngine.generateMaintenanceRecommendations(20, 10, [], 10, 30);
      expect(recs.some(r => r.type === 'IMMEDIATE' && r.priority === 'CRITICAL')).toBe(true);
    });

    it('recommends SCHEDULED for high failure probability (>60)', () => {
      const recs = MLEngine.generateMaintenanceRecommendations(50, 65, [], 10, 30);
      expect(recs.some(r => r.type === 'SCHEDULED' && r.priority === 'HIGH')).toBe(true);
    });

    it('recommends SCHEDULED for overdue PM', () => {
      const recs = MLEngine.generateMaintenanceRecommendations(80, 10, [], 40, 30);
      expect(recs.some(r => r.type === 'SCHEDULED' && r.priority === 'MEDIUM')).toBe(true);
    });

    it('adds MONITOR entries for HIGH/CRITICAL risk factors', () => {
      const factors: RiskFactor[] = [
        makeRiskFactor({ severity: 'CRITICAL', name: 'Overheating' }),
        makeRiskFactor({ id: 'rf-2', severity: 'HIGH', name: 'Vibration' }),
        makeRiskFactor({ id: 'rf-3', severity: 'LOW', name: 'Noise' }),
      ];
      const recs = MLEngine.generateMaintenanceRecommendations(80, 10, factors, 10, 30);
      const monitors = recs.filter(r => r.type === 'MONITOR');
      expect(monitors).toHaveLength(2); // Only HIGH + CRITICAL
    });

    it('returns empty when equipment is healthy and no issues', () => {
      const recs = MLEngine.generateMaintenanceRecommendations(90, 10, [], 10, 30);
      expect(recs).toEqual([]);
    });
  });

  // ===========================================================================
  // detectAnomaliesZScore
  // ===========================================================================
  describe('detectAnomaliesZScore', () => {
    it('returns empty for uniform data', () => {
      const data = [10, 10, 10, 10, 10];
      expect(MLEngine.detectAnomaliesZScore(data)).toEqual([]);
    });

    it('detects obvious outlier', () => {
      const data = [10, 10, 10, 10, 10, 10, 10, 10, 10, 100];
      const anomalies = MLEngine.detectAnomaliesZScore(data, 2);
      expect(anomalies.length).toBeGreaterThanOrEqual(1);
      expect(anomalies[0].index).toBe(9);
      expect(anomalies[0].value).toBe(100);
    });

    it('respects custom threshold', () => {
      const data = [10, 10, 10, 10, 10, 10, 10, 10, 10, 25];
      const loose = MLEngine.detectAnomaliesZScore(data, 5);
      const strict = MLEngine.detectAnomaliesZScore(data, 1);
      expect(strict.length).toBeGreaterThanOrEqual(loose.length);
    });
  });

  // ===========================================================================
  // detectAnomaliesIQR
  // ===========================================================================
  describe('detectAnomaliesIQR', () => {
    it('returns empty when all data is within IQR bounds', () => {
      const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      expect(MLEngine.detectAnomaliesIQR(data)).toEqual([]);
    });

    it('detects outliers outside IQR bounds', () => {
      const data = [10, 10, 10, 10, 10, 10, 10, 10, 10, 100];
      const anomalies = MLEngine.detectAnomaliesIQR(data, 1.5);
      expect(anomalies.length).toBeGreaterThanOrEqual(1);
      expect(anomalies.some(a => a.value === 100)).toBe(true);
    });
  });

  // ===========================================================================
  // Utility: getHealthStatus
  // ===========================================================================
  describe('getHealthStatus', () => {
    it('returns HEALTHY for score >= 80', () => {
      expect(MLEngine.getHealthStatus(80)).toBe('HEALTHY');
      expect(MLEngine.getHealthStatus(100)).toBe('HEALTHY');
    });

    it('returns DEGRADED for score in [60, 80)', () => {
      expect(MLEngine.getHealthStatus(60)).toBe('DEGRADED');
      expect(MLEngine.getHealthStatus(79)).toBe('DEGRADED');
    });

    it('returns AT_RISK for score in [30, 60)', () => {
      expect(MLEngine.getHealthStatus(30)).toBe('AT_RISK');
      expect(MLEngine.getHealthStatus(59)).toBe('AT_RISK');
    });

    it('returns CRITICAL for score < 30', () => {
      expect(MLEngine.getHealthStatus(0)).toBe('CRITICAL');
      expect(MLEngine.getHealthStatus(29)).toBe('CRITICAL');
    });
  });

  // ===========================================================================
  // Utility: getHealthStatusColor & getPriorityColor
  // ===========================================================================
  describe('getHealthStatusColor', () => {
    it('returns correct color classes for each status', () => {
      expect(MLEngine.getHealthStatusColor('HEALTHY')).toContain('green');
      expect(MLEngine.getHealthStatusColor('DEGRADED')).toContain('yellow');
      expect(MLEngine.getHealthStatusColor('AT_RISK')).toContain('orange');
      expect(MLEngine.getHealthStatusColor('CRITICAL')).toContain('red');
    });
  });

  describe('getPriorityColor', () => {
    it('returns correct color classes for each priority', () => {
      expect(MLEngine.getPriorityColor('LOW')).toContain('gray');
      expect(MLEngine.getPriorityColor('MEDIUM')).toContain('blue');
      expect(MLEngine.getPriorityColor('HIGH')).toContain('orange');
      expect(MLEngine.getPriorityColor('CRITICAL')).toContain('red');
    });
  });

  // ===========================================================================
  // Utility: isWithinDays
  // ===========================================================================
  describe('isWithinDays', () => {
    it('returns true for a date within the range', () => {
      expect(MLEngine.isWithinDays(daysAgo(5), 10)).toBe(true);
    });

    it('returns false for a date outside the range', () => {
      expect(MLEngine.isWithinDays(daysAgo(31), 30)).toBe(false);
    });

    it('returns true for today with days=0', () => {
      const today = new Date().toISOString().split('T')[0];
      // Today is ~0 days ago, so isWithinDays(today, 1) should be true
      expect(MLEngine.isWithinDays(today, 1)).toBe(true);
    });
  });

  // ===========================================================================
  // Utility: addDays
  // ===========================================================================
  describe('addDays', () => {
    it('adds positive days correctly', () => {
      const base = new Date('2026-01-01');
      const result = MLEngine.addDays(base, 10);
      expect(result.toISOString().split('T')[0]).toBe('2026-01-11');
    });

    it('handles negative days', () => {
      const base = new Date('2026-01-15');
      const result = MLEngine.addDays(base, -5);
      expect(result.toISOString().split('T')[0]).toBe('2026-01-10');
    });

    it('does not mutate the original date', () => {
      const base = new Date('2026-03-01');
      const originalTime = base.getTime();
      MLEngine.addDays(base, 30);
      expect(base.getTime()).toBe(originalTime);
    });
  });
});

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

describe('Mock Data Generators', () => {
  describe('generateMockHistoricalData', () => {
    it('generates the requested number of days', () => {
      const data = generateMockHistoricalData(15);
      expect(data).toHaveLength(15);
    });

    it('defaults to 30 days', () => {
      const data = generateMockHistoricalData();
      expect(data).toHaveLength(30);
    });

    it('produces non-negative values', () => {
      const data = generateMockHistoricalData(60);
      for (const point of data) {
        expect(point.value).toBeGreaterThanOrEqual(0);
      }
    });

    it('each data point has a date string', () => {
      const data = generateMockHistoricalData(5);
      for (const point of data) {
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  describe('generateMockSensorData', () => {
    it('returns 4 sensor readings', () => {
      const sensors = generateMockSensorData('equip-1');
      expect(sensors).toHaveLength(4);
    });

    it('each reading has required fields', () => {
      const sensors = generateMockSensorData('equip-1');
      for (const s of sensors) {
        expect(s.sensorId).toBeDefined();
        expect(s.name).toBeDefined();
        expect(s.unit).toBeDefined();
        expect(typeof s.value).toBe('number');
        expect(['NORMAL', 'WARNING', 'CRITICAL']).toContain(s.status);
      }
    });
  });

  describe('generateMockMaintenanceHistory', () => {
    it('returns events sorted by date descending', () => {
      const events = generateMockMaintenanceHistory('equip-1');
      for (let i = 1; i < events.length; i++) {
        expect(new Date(events[i - 1].date).getTime())
          .toBeGreaterThanOrEqual(new Date(events[i].date).getTime());
      }
    });

    it('includes PM and inspection events', () => {
      const events = generateMockMaintenanceHistory('equip-1');
      expect(events.some(e => e.type === 'PM')).toBe(true);
      expect(events.some(e => e.type === 'INSPECTION')).toBe(true);
    });
  });
});
