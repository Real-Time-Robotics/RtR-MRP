/**
 * MRP Engine - Backward Compatibility Re-export
 *
 * This file has been split into focused modules under src/lib/mrp-engine/.
 * All exports are re-exported here so existing imports continue to work.
 *
 * Modules:
 *   - mrp-engine/types.ts              → Types/interfaces
 *   - mrp-engine/mrp-run.ts            → MRP run orchestration
 *   - mrp-engine/suggestion-management.ts → Suggestion approve/reject
 *   - mrp-engine/work-order.ts         → Work order create/update
 *   - mrp-engine/material-allocation.ts → Material allocation
 *   - mrp-engine/material-issuance.ts  → Material issuance
 *   - mrp-engine/production-receipt.ts  → Production receipt management
 *   - mrp-engine/shipping.ts           → Shipping & delivery
 */

export {
  // Types
  type MrpParams,
  type PartRequirement,
  type MrpSuggestionData,

  // MRP Run
  runMrpCalculation,

  // Suggestions
  approveSuggestion,
  rejectSuggestion,

  // Work Orders
  createWorkOrder,
  updateWorkOrderStatus,

  // Material Allocation
  regenerateAllocations,
  allocateMaterials,

  // Material Issuance
  issueMaterials,
  issueAdHocMaterials,

  // Production Receipt
  receiveProductionOutput,
  confirmProductionReceipt,
  rejectProductionReceipt,

  // Shipping & Delivery
  createShipment,
  pickForShipment,
  confirmShipment,
  confirmDelivery,
} from "./mrp-engine/index";
