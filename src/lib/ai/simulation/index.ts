// =============================================================================
// WHAT-IF SIMULATION MODULE
// Export all simulation components
// =============================================================================

// Scenario Builder
export {
  ScenarioBuilder,
  getScenarioBuilder,
  SCENARIO_TEMPLATES,
  type Scenario,
  type ScenarioType,
  type ScenarioStatus,
  type ScenarioConfig,
  type ScenarioTemplate,
  type ScenarioParameter,
  type ScenarioValidationResult,
  type DemandScenarioConfig,
  type SupplyScenarioConfig,
  type CapacityScenarioConfig,
  type CustomScenarioConfig,
} from './scenario-builder';

// Simulation Engine
export {
  SimulationEngine,
  getSimulationEngine,
  type SimulationResult,
  type SimulationState,
  type SimulationImpact,
  type SimulationAlert,
  type TimelinePoint,
  type Bottleneck,
} from './simulation-engine';

// Monte Carlo
export {
  MonteCarloEngine,
  getMonteCarloEngine,
  resetMonteCarloEngine,
  DEFAULT_MONTE_CARLO_CONFIG,
  type MonteCarloConfig,
  type MonteCarloResult,
  type MonteCarloStatistics,
  type StatisticsSummary,
  type DistributionType,
  type DistributionConfig,
  type DistributionResults,
  type HistogramBin,
  type RiskMetrics,
  type SensitivityResult,
  type PercentileResults,
  type ConvergencePoint,
} from './monte-carlo';

// Impact Analyzer
export {
  ImpactAnalyzer,
  getImpactAnalyzer,
  type ImpactSummary,
  type ComparisonResult,
  type ScenarioComparisonItem,
  type Tradeoff,
  type FinancialImpact,
  type OperationalImpact,
  type RiskImpact,
  type DetailedImpactAnalysis,
  type AffectedArea,
  type TimelineImpactPoint,
  type PrioritizedRecommendation,
} from './impact-analyzer';

// AI Scenario Analyzer
export {
  AIScenarioAnalyzer,
  getAIScenarioAnalyzer,
  type AIScenarioInsight,
  type AIRecommendation,
  type AIRiskAnalysis,
  type AIRiskItem,
  type AIActionPlan,
  type AIMilestone,
  type AIComparisonInsight,
  type AIScenarioRanking,
} from './ai-scenario-analyzer';
