// Advanced MRP Engine Exports
// Phase 13 - Advanced MRP Features

// Pegging Engine
export {
  generatePegging,
  savePeggingRecords,
  getDemandPegging,
  getSupplyPegging,
  type PeggingResult,
  type DemandPeg,
  type SupplyPeg,
  type SupplySource,
  type DemandSource,
} from "./pegging-engine";

// ATP/CTP Engine
export {
  calculateATP,
  checkBatchATP,
  updateATPRecords,
  type ATPResult,
  type ATPBucket,
  type CTPDetails,
  type ComponentAvailability,
} from "./atp-engine";

// Simulation Engine
export {
  createSimulation,
  runSimulation,
  getSimulation,
  deleteSimulation,
  compareSimulations,
  type SimulationParams,
  type SimulationResults,
  type DemandChange,
  type SupplyChange,
  type LeadTimeChange,
  type CapacityChange,
  type PlannedOrderResult,
  type ShortageResult,
  type CapacityIssue,
} from "./simulation-engine";

// Exception Engine
export {
  detectExceptions,
  getExceptionSummary,
  getExceptions,
  resolveException,
  acknowledgeException,
  ignoreException,
  clearOldExceptions,
  type ExceptionType,
  type Severity,
  type DetectedExceptionData,
  type ExceptionSummary,
} from "./exception-engine";

// Forecast Demand Integration
export {
  ForecastDemandIntegration,
  getForecastDemandIntegration,
  getForecastDemandForMRP,
  getBulkForecastDemandForMRP,
  type ForecastDemand,
  type ForecastBasedMRPInput,
  type MRPForecastSummary,
} from "./forecast-demand-integration";
