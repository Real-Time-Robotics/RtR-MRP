// =============================================================================
// QUALITY AI MODULE INDEX
// Exports all quality analysis services
// =============================================================================

// Data Extractor
export {
  QualityDataExtractor,
  getQualityDataExtractor,
  type InspectionHistoryPoint,
  type InspectionCharacteristicResult,
  type NCRHistoryPoint,
  type SupplierQualityData,
  type LotQualityData,
  type LotTransaction,
  type QualityTrendData,
  type PartQualitySummary,
} from './quality-data-extractor';

// Metrics Calculator
export {
  QualityMetricsCalculator,
  getQualityMetricsCalculator,
  type PPMResult,
  type CpkResult,
  type FirstPassYieldResult,
  type NCRRateResult,
  type SupplierQualityScore,
} from './quality-metrics-calculator';

// Pattern Recognition
export {
  QualityPatternRecognition,
  getQualityPatternRecognition,
  type QualityDriftResult,
  type RecurringIssueResult,
  type RecurringIssue,
  type SupplierCorrelationResult,
  type ProductionCorrelationResult,
  type ProductionCorrelationFactor,
} from './pattern-recognition';

// Anomaly Detector
export {
  QualityAnomalyDetector,
  getQualityAnomalyDetector,
  type SPCAnalysisResult,
  type SPCDataPoint,
  type SPCViolation,
  type AnomalyDetectionResult,
  type Anomaly,
  type AnomalyType,
  type QualitySpikeDetectionResult,
  type QualitySpike,
} from './anomaly-detector';

// Prediction Engine
export {
  QualityPredictionEngine,
  getQualityPredictionEngine,
  type QualityRiskScore,
  type RiskFactor,
  type NCRPrediction,
  type QualityForecast,
  type ForecastPeriod,
  type BatchRiskAssessment,
} from './quality-prediction-engine';

// AI Quality Analyzer
export {
  AIQualityAnalyzer,
  getAIQualityAnalyzer,
  type RootCauseAnalysisResult,
  type QualityInsightReport,
  type Finding,
  type SupplierQualityInsight,
  type DefectPredictionInsight,
} from './ai-quality-analyzer';
