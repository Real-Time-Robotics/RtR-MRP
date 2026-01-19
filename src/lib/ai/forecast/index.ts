// =============================================================================
// FORECAST MODULE - MAIN EXPORTS
// AI-powered demand forecasting with Vietnamese calendar support
// =============================================================================

// Vietnamese Calendar & Holidays
export {
  VN_HOLIDAYS,
  SEASONAL_PATTERNS,
  getLunarNewYear,
  getHungKingsDay,
  isHolidayPeriod,
  getTetPhase,
  getSeasonalPattern,
  getHolidayFactor,
  getHolidayFactorsForRange,
  getWeeklyHolidayFactor,
  getMonthlyHolidayFactor,
  getUpcomingHolidays,
  getWeekNumber,
  formatPeriod,
  parsePeriod,
  VNCalendarService,
} from './vn-calendar';
export type { Holiday, SeasonalPattern, HolidayFactor } from './vn-calendar';

// Data Extractor
export {
  DataExtractorService,
  getDataExtractorService,
} from './data-extractor';
export type {
  SalesHistoryPoint,
  ProductSalesHistory,
  CustomerBehavior,
  SupplierLeadTime,
  TimeSeriesData,
  PreparedForecastData,
} from './data-extractor';

// Forecast Engine
export {
  ForecastEngine,
  getForecastEngine,
  DEFAULT_CONFIG,
} from './forecast-engine';
export type {
  ForecastPoint,
  ForecastFactors,
  ForecastResult,
  ForecastMetrics,
  ForecastRecommendations,
  ForecastModel,
  ForecastConfig,
} from './forecast-engine';

// AI Enhancer
export {
  AIEnhancerService,
  getAIEnhancerService,
} from './ai-enhancer';
export type {
  EnhancedForecast,
  AIInsights,
  Anomaly,
  RiskAssessment,
  RiskFactor,
  ActionItem,
  ExplainedForecast,
} from './ai-enhancer';

// Accuracy Tracker
export {
  AccuracyTrackerService,
  getAccuracyTrackerService,
} from './accuracy-tracker';
export type {
  AccuracyMetrics,
  PeriodAccuracy,
  ModelPerformance,
  ForecastComparison,
} from './accuracy-tracker';

// Safety Stock Optimizer
export {
  SafetyStockOptimizerService,
  getSafetyStockOptimizer,
  getHolidayBuffer,
  calculateOptimalSafetyStock,
  calculateOptimalReorderPoint,
  optimizeBulkSafetyStock,
} from './safety-stock-optimizer';
export type {
  SafetyStockConfig,
  SafetyStockResult,
  ReorderPointResult,
  BulkOptimizationResult,
} from './safety-stock-optimizer';

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

import { getForecastEngine, ForecastConfig, ForecastResult } from './forecast-engine';
import { getAIEnhancerService, EnhancedForecast } from './ai-enhancer';
import { getAccuracyTrackerService } from './accuracy-tracker';
import { getDataExtractorService } from './data-extractor';

/**
 * Generate and enhance a forecast for a product
 */
export async function generateEnhancedForecast(
  productId: string,
  config?: Partial<ForecastConfig>
): Promise<EnhancedForecast | null> {
  const forecastEngine = getForecastEngine();
  const aiEnhancer = getAIEnhancerService();

  const forecast = await forecastEngine.generateForecast(productId, config);
  if (!forecast) return null;

  return aiEnhancer.enhanceForecast(forecast);
}

/**
 * Generate forecasts for all products
 */
export async function generateAllForecasts(
  config?: Partial<ForecastConfig>
): Promise<{
  success: number;
  failed: number;
  results: ForecastResult[];
}> {
  const forecastEngine = getForecastEngine();
  return forecastEngine.generateAllForecasts(config);
}

/**
 * Get forecast accuracy summary
 */
export async function getAccuracySummary() {
  const accuracyTracker = getAccuracyTrackerService();
  return accuracyTracker.getAccuracySummary();
}

/**
 * Auto-record actuals from sales data
 */
export async function syncActuals(
  periodType: 'weekly' | 'monthly' = 'monthly',
  periodsBack: number = 3
) {
  const accuracyTracker = getAccuracyTrackerService();
  return accuracyTracker.autoRecordActuals(periodType, periodsBack);
}

/**
 * Get product sales history
 */
export async function getProductSalesHistory(
  productId: string,
  months: number = 24,
  periodType: 'weekly' | 'monthly' = 'monthly'
) {
  const dataExtractor = getDataExtractorService();
  return dataExtractor.extractProductSalesHistory(productId, months, periodType);
}

/**
 * Get customer behavior analysis
 */
export async function analyzeCustomerBehavior(
  customerId: string,
  months: number = 24
) {
  const dataExtractor = getDataExtractorService();
  return dataExtractor.extractCustomerBehavior(customerId, months);
}

// =============================================================================
// DEFAULT EXPORTS
// =============================================================================

const ForecastModule = {
  // Services
  getForecastEngine,
  getAIEnhancerService,
  getAccuracyTrackerService,
  getDataExtractorService,

  // Convenience functions
  generateEnhancedForecast,
  generateAllForecasts,
  getAccuracySummary,
  syncActuals,
  getProductSalesHistory,
  analyzeCustomerBehavior,
};

export default ForecastModule;
