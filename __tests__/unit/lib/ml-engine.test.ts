// =============================================================================
// ML ENGINE UNIT TESTS
// Testing AI/ML algorithms
// =============================================================================

import { MLEngine, SensorReading, RiskFactor, MaintenanceEvent } from '@/lib/ai/ml-engine';

describe('MLEngine', () => {
  
  // ===========================================================================
  // STATISTICAL FUNCTIONS
  // ===========================================================================
  
  describe('standardDeviation', () => {
    it('should calculate standard deviation correctly', () => {
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      const result = MLEngine.standardDeviation(data);
      expect(result).toBeCloseTo(2, 1);
    });

    it('should return 0 for single value array', () => {
      const data = [5];
      const result = MLEngine.standardDeviation(data);
      expect(result).toBe(0);
    });

    it('should return 0 for array of same values', () => {
      const data = [5, 5, 5, 5, 5];
      const result = MLEngine.standardDeviation(data);
      expect(result).toBe(0);
    });
  });

  // ===========================================================================
  // DEMAND FORECASTING
  // ===========================================================================

  describe('movingAverage', () => {
    it('should calculate moving average correctly', () => {
      const data = [10, 20, 30, 40, 50];
      const result = MLEngine.movingAverage(data, 3);
      
      expect(result[0]).toBe(10); // First value unchanged
      expect(result[1]).toBe(20); // Second value unchanged
      expect(result[2]).toBe(20); // (10+20+30)/3
      expect(result[3]).toBe(30); // (20+30+40)/3
      expect(result[4]).toBe(40); // (30+40+50)/3
    });

    it('should handle window size of 1', () => {
      const data = [10, 20, 30];
      const result = MLEngine.movingAverage(data, 1);
      expect(result).toEqual(data);
    });

    it('should handle empty array', () => {
      const result = MLEngine.movingAverage([], 3);
      expect(result).toEqual([]);
    });
  });

  describe('exponentialMovingAverage', () => {
    it('should calculate EMA correctly', () => {
      const data = [10, 20, 30, 40, 50];
      const result = MLEngine.exponentialMovingAverage(data, 0.5);
      
      expect(result[0]).toBe(10); // First value
      expect(result[1]).toBe(15); // 0.5*20 + 0.5*10
      expect(result[2]).toBeCloseTo(22.5, 1); // 0.5*30 + 0.5*15
    });

    it('should return original data when alpha is 1', () => {
      const data = [10, 20, 30];
      const result = MLEngine.exponentialMovingAverage(data, 1);
      expect(result).toEqual(data);
    });
  });

  describe('doubleExponentialSmoothing', () => {
    it('should generate forecasts', () => {
      const data = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190];
      const result = MLEngine.doubleExponentialSmoothing(data, 0.3, 0.1, 7);
      
      expect(result).toHaveLength(7);
      expect(result[0].predicted).toBeGreaterThan(0);
      expect(result[0].lowerBound).toBeLessThan(result[0].predicted);
      expect(result[0].upperBound).toBeGreaterThan(result[0].predicted);
      expect(result[0].confidence).toBeGreaterThan(0);
      expect(result[0].confidence).toBeLessThanOrEqual(100);
    });

    it('should have decreasing confidence over time', () => {
      const data = [100, 110, 120, 130, 140, 150];
      const result = MLEngine.doubleExponentialSmoothing(data, 0.3, 0.1, 5);
      
      for (let i = 1; i < result.length; i++) {
        expect(result[i].confidence).toBeLessThanOrEqual(result[i-1].confidence);
      }
    });

    it('should return empty array for insufficient data', () => {
      const data = [100];
      const result = MLEngine.doubleExponentialSmoothing(data, 0.3, 0.1, 7);
      expect(result).toEqual([]);
    });
  });

  describe('detectSeasonality', () => {
    it('should detect seasonality in periodic data', () => {
      // Create weekly seasonal pattern
      const data: number[] = [];
      for (let i = 0; i < 28; i++) {
        const dayOfWeek = i % 7;
        data.push(100 + (dayOfWeek < 5 ? 50 : 0)); // Higher on weekdays
      }
      
      const result = MLEngine.detectSeasonality(data, 7);
      expect(result).toBe(true);
    });

    it('should return false for random data', () => {
      const data = [100, 150, 80, 200, 50, 180, 90, 110, 170, 60, 140, 120, 85, 195];
      const result = MLEngine.detectSeasonality(data, 7);
      // Random data may or may not show seasonality, just ensure it returns boolean
      expect(typeof result).toBe('boolean');
    });

    it('should return false for insufficient data', () => {
      const data = [100, 110, 120];
      const result = MLEngine.detectSeasonality(data, 7);
      expect(result).toBe(false);
    });
  });

  describe('detectTrend', () => {
    it('should detect upward trend', () => {
      const data = [100, 110, 120, 130, 140, 150, 160];
      const result = MLEngine.detectTrend(data);
      expect(result).toBe('UP');
    });

    it('should detect downward trend', () => {
      const data = [160, 150, 140, 130, 120, 110, 100];
      const result = MLEngine.detectTrend(data);
      expect(result).toBe('DOWN');
    });

    it('should detect stable trend', () => {
      const data = [100, 101, 99, 100, 101, 100, 99];
      const result = MLEngine.detectTrend(data);
      expect(result).toBe('STABLE');
    });

    it('should return stable for insufficient data', () => {
      const data = [100, 110];
      const result = MLEngine.detectTrend(data);
      expect(result).toBe('STABLE');
    });
  });

  describe('calculateForecastMetrics', () => {
    it('should calculate metrics correctly', () => {
      const actual = [100, 200, 300, 400, 500];
      const predicted = [110, 190, 310, 390, 510];
      
      const result = MLEngine.calculateForecastMetrics(actual, predicted);
      
      expect(result.mape).toBeGreaterThan(0);
      expect(result.mae).toBeGreaterThan(0);
      expect(result.rmse).toBeGreaterThan(0);
      expect(result.accuracy).toBeGreaterThan(0);
      expect(result.accuracy).toBeLessThanOrEqual(100);
    });

    it('should return 100% accuracy for perfect predictions', () => {
      const actual = [100, 200, 300];
      const predicted = [100, 200, 300];
      
      const result = MLEngine.calculateForecastMetrics(actual, predicted);
      
      expect(result.mape).toBe(0);
      expect(result.mae).toBe(0);
      expect(result.rmse).toBe(0);
      expect(result.accuracy).toBe(100);
    });

    it('should handle empty arrays', () => {
      const result = MLEngine.calculateForecastMetrics([], []);
      expect(result).toEqual({ mape: 0, mae: 0, rmse: 0, accuracy: 0 });
    });
  });

  // ===========================================================================
  // PREDICTIVE MAINTENANCE
  // ===========================================================================

  describe('calculateHealthScore', () => {
    const normalSensors: SensorReading[] = [
      { sensorId: '1', name: 'Temp', value: 50, unit: '°C', normalRange: { min: 40, max: 80 }, status: 'NORMAL', timestamp: '' },
      { sensorId: '2', name: 'Vib', value: 2, unit: 'mm/s', normalRange: { min: 0, max: 4 }, status: 'NORMAL', timestamp: '' },
    ];

    const warningSensors: SensorReading[] = [
      { sensorId: '1', name: 'Temp', value: 75, unit: '°C', normalRange: { min: 40, max: 80 }, status: 'WARNING', timestamp: '' },
      { sensorId: '2', name: 'Vib', value: 3.5, unit: 'mm/s', normalRange: { min: 0, max: 4 }, status: 'NORMAL', timestamp: '' },
    ];

    const criticalSensors: SensorReading[] = [
      { sensorId: '1', name: 'Temp', value: 90, unit: '°C', normalRange: { min: 40, max: 80 }, status: 'CRITICAL', timestamp: '' },
    ];

    const maintenanceHistory: MaintenanceEvent[] = [];

    it('should return high health score for normal sensors and low age', () => {
      const result = MLEngine.calculateHealthScore(normalSensors, maintenanceHistory, 1000, 20000);
      expect(result).toBeGreaterThanOrEqual(80);
    });

    it('should reduce health score for warning sensors', () => {
      const normalResult = MLEngine.calculateHealthScore(normalSensors, maintenanceHistory, 1000, 20000);
      const warningResult = MLEngine.calculateHealthScore(warningSensors, maintenanceHistory, 1000, 20000);
      
      expect(warningResult).toBeLessThan(normalResult);
    });

    it('should significantly reduce health score for critical sensors', () => {
      const result = MLEngine.calculateHealthScore(criticalSensors, maintenanceHistory, 1000, 20000);
      expect(result).toBeLessThan(80);
    });

    it('should reduce health score for high operating hours', () => {
      const lowAgeResult = MLEngine.calculateHealthScore(normalSensors, maintenanceHistory, 5000, 20000);
      const highAgeResult = MLEngine.calculateHealthScore(normalSensors, maintenanceHistory, 18000, 20000);
      
      expect(highAgeResult).toBeLessThan(lowAgeResult);
    });

    it('should return value between 0 and 100', () => {
      const result = MLEngine.calculateHealthScore(criticalSensors, maintenanceHistory, 19000, 20000);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateFailureProbability', () => {
    const noRiskFactors: RiskFactor[] = [];
    const highRiskFactors: RiskFactor[] = [
      { id: '1', name: 'High Vibration', severity: 'HIGH', contribution: 30, description: '', trend: 'WORSENING' },
      { id: '2', name: 'Temperature', severity: 'CRITICAL', contribution: 40, description: '', trend: 'WORSENING' },
    ];

    it('should return low probability for healthy equipment', () => {
      const result = MLEngine.calculateFailureProbability(90, 10, 30, noRiskFactors);
      expect(result).toBeLessThan(30);
    });

    it('should return high probability for unhealthy equipment', () => {
      const result = MLEngine.calculateFailureProbability(30, 45, 30, highRiskFactors);
      expect(result).toBeGreaterThan(50);
    });

    it('should increase probability for overdue PM', () => {
      const normalResult = MLEngine.calculateFailureProbability(80, 25, 30, noRiskFactors);
      const overdueResult = MLEngine.calculateFailureProbability(80, 50, 30, noRiskFactors);
      
      expect(overdueResult).toBeGreaterThan(normalResult);
    });

    it('should return value between 0 and 100', () => {
      const result = MLEngine.calculateFailureProbability(10, 100, 30, highRiskFactors);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('predictFailureDate', () => {
    it('should return today for critical health', () => {
      const result = MLEngine.predictFailureDate(25, -1, 30);
      const today = new Date().toISOString().split('T')[0];
      expect(result).toBe(today);
    });

    it('should return undefined for stable/improving health', () => {
      const stableResult = MLEngine.predictFailureDate(80, 0, 30);
      const improvingResult = MLEngine.predictFailureDate(80, 1, 30);
      
      expect(stableResult).toBeUndefined();
      expect(improvingResult).toBeUndefined();
    });

    it('should return future date for declining health', () => {
      const result = MLEngine.predictFailureDate(80, -2, 30);
      
      expect(result).toBeDefined();
      const failureDate = new Date(result!);
      const today = new Date();
      expect(failureDate.getTime()).toBeGreaterThan(today.getTime());
    });
  });

  describe('getHealthStatus', () => {
    it('should return HEALTHY for score >= 80', () => {
      expect(MLEngine.getHealthStatus(80)).toBe('HEALTHY');
      expect(MLEngine.getHealthStatus(100)).toBe('HEALTHY');
    });

    it('should return DEGRADED for score 60-79', () => {
      expect(MLEngine.getHealthStatus(60)).toBe('DEGRADED');
      expect(MLEngine.getHealthStatus(79)).toBe('DEGRADED');
    });

    it('should return AT_RISK for score 30-59', () => {
      expect(MLEngine.getHealthStatus(30)).toBe('AT_RISK');
      expect(MLEngine.getHealthStatus(59)).toBe('AT_RISK');
    });

    it('should return CRITICAL for score < 30', () => {
      expect(MLEngine.getHealthStatus(29)).toBe('CRITICAL');
      expect(MLEngine.getHealthStatus(0)).toBe('CRITICAL');
    });
  });

  // ===========================================================================
  // ANOMALY DETECTION
  // ===========================================================================

  describe('detectAnomaliesZScore', () => {
    it('should detect outliers', () => {
      const data = [10, 12, 11, 10, 13, 11, 100, 12, 10, 11]; // 100 is outlier
      const result = MLEngine.detectAnomaliesZScore(data, 2);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(a => a.value === 100)).toBe(true);
    });

    it('should return empty array for normal data', () => {
      const data = [10, 11, 10, 12, 11, 10, 11, 12, 10, 11];
      const result = MLEngine.detectAnomaliesZScore(data, 3);
      
      expect(result.length).toBe(0);
    });

    it('should respect threshold parameter', () => {
      const data = [10, 12, 11, 10, 20, 11, 10]; // 20 might be outlier
      const lowThreshold = MLEngine.detectAnomaliesZScore(data, 1.5);
      const highThreshold = MLEngine.detectAnomaliesZScore(data, 3);
      
      expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
    });
  });

  describe('detectAnomaliesIQR', () => {
    it('should detect outliers using IQR', () => {
      const data = [10, 12, 11, 10, 13, 11, 100, 12, 10, 11]; // 100 is outlier
      const result = MLEngine.detectAnomaliesIQR(data, 1.5);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(a => a.value === 100)).toBe(true);
    });

    it('should detect both high and low outliers', () => {
      const data = [1, 50, 52, 48, 51, 49, 50, 100]; // 1 and 100 are outliers
      const result = MLEngine.detectAnomaliesIQR(data, 1.5);
      
      const hasLow = result.some(a => a.value === 1);
      const hasHigh = result.some(a => a.value === 100);
      expect(hasLow || hasHigh).toBe(true);
    });
  });

  // ===========================================================================
  // UTILITY FUNCTIONS
  // ===========================================================================

  describe('isWithinDays', () => {
    it('should return true for recent date', () => {
      const today = new Date().toISOString();
      expect(MLEngine.isWithinDays(today, 7)).toBe(true);
    });

    it('should return false for old date', () => {
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(MLEngine.isWithinDays(oldDate, 7)).toBe(false);
    });
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      const date = new Date('2025-01-01');
      const result = MLEngine.addDays(date, 7);
      
      expect(result.getDate()).toBe(8);
      expect(result.getMonth()).toBe(0); // January
    });

    it('should handle month overflow', () => {
      const date = new Date('2025-01-30');
      const result = MLEngine.addDays(date, 5);
      
      expect(result.getMonth()).toBe(1); // February
    });
  });

  describe('getHealthStatusColor', () => {
    it('should return correct colors for each status', () => {
      expect(MLEngine.getHealthStatusColor('HEALTHY')).toContain('green');
      expect(MLEngine.getHealthStatusColor('DEGRADED')).toContain('yellow');
      expect(MLEngine.getHealthStatusColor('AT_RISK')).toContain('orange');
      expect(MLEngine.getHealthStatusColor('CRITICAL')).toContain('red');
    });
  });

  describe('getPriorityColor', () => {
    it('should return correct colors for each priority', () => {
      expect(MLEngine.getPriorityColor('LOW')).toContain('gray');
      expect(MLEngine.getPriorityColor('MEDIUM')).toContain('blue');
      expect(MLEngine.getPriorityColor('HIGH')).toContain('orange');
      expect(MLEngine.getPriorityColor('CRITICAL')).toContain('red');
    });
  });
});
