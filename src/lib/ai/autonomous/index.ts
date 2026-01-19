// =============================================================================
// AI AUTONOMOUS MODULE - Exports
// =============================================================================

// Auto-PO Exports
export { POSuggestionEngine, getPOSuggestionEngine } from './po-suggestion-engine';
export { AIPOAnalyzer, getAIPOAnalyzer } from './ai-po-analyzer';
export { ApprovalQueueService, approvalQueueService } from './approval-queue-service';
export { POExecutorService, poExecutorService } from './po-executor';

// Auto-Schedule Exports
export { SchedulingEngine, schedulingEngine, getSchedulingEngine } from './scheduling-engine';
export { ScheduleOptimizer, scheduleOptimizer, getScheduleOptimizer } from './schedule-optimizer';
export { ConflictDetector, conflictDetector, getConflictDetector } from './conflict-detector';
export { AISchedulerAnalyzer, aiSchedulerAnalyzer, getAISchedulerAnalyzer } from './ai-scheduler-analyzer';
export { ScheduleExecutor, scheduleExecutor, getScheduleExecutor } from './schedule-executor';

// Types from po-suggestion-engine
export type {
  POSuggestion,
  ReorderReason,
  AlternativeSupplier,
  SuggestionRisk,
  SuggestionMetadata,
  POSuggestionConfig,
} from './po-suggestion-engine';

// Types from ai-po-analyzer
export type {
  EnhancedPOSuggestion,
  AIEnhancement,
  DecisionFactor,
  WhatIfScenario,
  LearningInsight,
  AnalyzerConfig,
} from './ai-po-analyzer';

// Types from approval-queue-service
export type {
  QueueItem,
  QueueItemStatus,
  QueuePriority,
  QueueFilter,
  QueueSortOptions,
  QueueStats,
  ApprovalResult,
  BulkApprovalResult,
  POModification,
} from './approval-queue-service';

// Types from scheduling-engine
export type {
  WorkOrderScheduleInfo,
  WorkCenterCapacityInfo,
  ScheduleSuggestion,
  ScheduleResult,
  ScheduleConflict,
  ScheduleMetrics,
  SchedulingOptions,
  SchedulingAlgorithm,
} from './scheduling-engine';

// Types from schedule-optimizer
export type {
  GeneticConfig,
  OptimizationWeights,
  OptimizationResult,
  OptimizationMetrics,
} from './schedule-optimizer';

// Types from conflict-detector
export type {
  ConflictType,
  ConflictSeverity,
  DetailedConflict,
  Resolution,
  ResolutionType,
  ConflictDetectionResult,
} from './conflict-detector';

// Types from ai-scheduler-analyzer
export type {
  ScheduleExplanation,
  BottleneckPrediction,
  ImprovementSuggestion,
  DisruptionHandlingResult,
  ScheduleComparison,
  ScheduleReport,
} from './ai-scheduler-analyzer';

// Types from schedule-executor
export type {
  ScheduleChange,
  ExecutionResult,
  ChangeResult,
  NotificationResult,
  AuditEntry,
  ApplyOptions,
  DateUpdate,
} from './schedule-executor';
