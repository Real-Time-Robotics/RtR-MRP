// =============================================================================
// SUPPLIER RISK INTELLIGENCE MODULE
// AI-powered supplier risk management and performance analysis
// =============================================================================

// Data Extraction
export {
  SupplierDataExtractor,
  getSupplierDataExtractor,
  type DeliveryPerformanceData,
  type DeliveryTrendPoint,
  type QualityHistoryData,
  type DefectCategoryData,
  type QualityTrendPoint,
  type NCRSummary,
  type LotQualitySummary,
  type PricingTrendData,
  type PriceHistoryPoint,
  type PartPricingData,
  type PriceChangeEvent,
  type OrderHistoryData,
  type OrderSummary,
  type PartOrderData,
  type OrderTrendPoint,
  type LeadTimeHistoryData,
  type LeadTimePoint,
  type PartLeadTimeData,
  type LeadTimeOutlier,
  type ResponseMetricsData,
  type ResolutionHistoryPoint,
  type ComprehensiveSupplierData,
} from './supplier-data-extractor';

// Performance Scoring
export {
  SupplierPerformanceScorer,
  getSupplierPerformanceScorer,
  type SupplierGrade,
  type SupplierScorecard,
  type DimensionScore,
  type DimensionMetric,
  type ScoreTrend,
  type BenchmarkComparison,
  type SupplierRanking,
  type CategoryBenchmark,
} from './supplier-performance-scorer';

// Dependency Analysis
export {
  DependencyAnalyzer,
  getDependencyAnalyzer,
  type DependencyAnalysis,
  type DependencySummary,
  type SingleSourcePart,
  type AlternativeSupplier,
  type ConcentrationRisk,
  type SpendConcentration,
  type VolumeConcentration,
  type PartConcentration,
  type TopSupplierDependency,
  type GeographicRisk,
  type CountryConcentration,
  type RegionConcentration,
  type CriticalDependency,
  type DependencyRecommendation,
} from './dependency-analyzer';

// Risk Calculation
export {
  RiskCalculator,
  getRiskCalculator,
  type SupplierRiskAssessment,
  type RiskLevel,
  type RiskFactorBreakdown,
  type RiskFactor,
  type RiskTrend,
  type RiskHistoryPoint,
  type MitigationStatus,
  type RiskRecommendation,
  type SupplyChainRiskProfile,
  type CriticalSupplierRisk,
  type SupplyChainRisk,
  type MitigationPlanItem,
  type SupplyChainMetrics,
  type RiskScenario,
} from './risk-calculator';

// Early Warning System
export {
  EarlyWarningSystem,
  getEarlyWarningSystem,
  type AlertSeverity,
  type AlertCategory,
  type AlertStatus,
  type SupplierAlert,
  type AlertMetric,
  type EarlyWarningSignal,
  type AlertSummary,
  type MonitoringConfig,
  type WatchlistSupplier,
} from './early-warning-system';

// AI Analysis
export {
  AISupplierAnalyzer,
  getAISupplierAnalyzer,
  type AISupplierInsight,
  type StrategicRecommendation,
  type PerformancePrediction,
  type SupplierDevelopmentPlan,
  type DevelopmentMilestone,
  type SupplyChainAIAnalysis,
  type AIIdentifiedConcern,
  type AIStrategicInitiative,
  type OptimizationOpportunity,
  type SupplierComparisonAnalysis,
  type DimensionComparison,
} from './ai-supplier-analyzer';
